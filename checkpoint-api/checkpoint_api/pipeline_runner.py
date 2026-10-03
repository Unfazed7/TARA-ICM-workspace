import asyncio
import json
import os
import signal
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

from .database import SessionLocal
from .models import Assessment, PipelineRun
from .stage_catalog import STAGE_COUNT, STAGES_BY_NUMBER


# Default to the repo root computed from this file's own location --
# checkpoint_api/pipeline_runner.py -> checkpoint_api/ -> checkpoint-api/ -> repo root.
# Never rely on a bare "." default: that depends on whichever directory the
# process happened to be launched from, which caused a real bug where
# relative-cwd subprocess resolution collapsed to the drive root on Windows.
_CHECKPOINT_API_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_WORKSPACE_ROOT = str(_CHECKPOINT_API_DIR.parent)

# Load secrets from checkpoint-api/.env (git-ignored), then repo-root .env.
# Variables already set in the shell always win over the files.
load_dotenv(_CHECKPOINT_API_DIR / ".env")
load_dotenv(Path(_DEFAULT_WORKSPACE_ROOT) / ".env")

WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", _DEFAULT_WORKSPACE_ROOT)
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(WORKSPACE_ROOT, "uploads"))

# LLM provider config — forwarded to Node.js stage agents (llm-client.js).
# OpenRouter is the default provider; the key is read from LLM_API_KEY or
# OPENROUTER_API_KEY. ANTHROPIC_API_KEY is still forwarded for the legacy
# Stage 01 diagram mode, which reads it directly.
DEFAULT_OPENROUTER_MODEL = "qwen/qwen3.8-max-0902"

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
LLM_PROVIDER = os.getenv("LLM_PROVIDER") or "openrouter"
LLM_API_KEY = (
    os.getenv("LLM_API_KEY")
    or os.getenv("OPENROUTER_API_KEY")
    or (ANTHROPIC_API_KEY if LLM_PROVIDER == "anthropic" else "")
)
LLM_MODEL = os.getenv("LLM_MODEL") or (
    DEFAULT_OPENROUTER_MODEL if LLM_PROVIDER == "openrouter" else ""
)
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "")

# Stage 1 generic multi-file inputs: any mix of 1-5 files, no fixed slots.
# Classified by extension purely as a label for the extraction prompt /
# audit trail -- the model reads actual file content regardless of label.
INPUT_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
INPUT_DOCUMENT_EXTENSIONS = {".txt", ".csv", ".md"}

_ACTIVE_PROCESSES: dict[tuple[str, int], subprocess.Popen] = {}
_PROCESS_LOCK = threading.RLock()


def _get_active_process(assessment_id: str, stage_num: int) -> subprocess.Popen | None:
    with _PROCESS_LOCK:
        process = _ACTIVE_PROCESSES.get((assessment_id, stage_num))
        return process if process is not None and process.poll() is None else None


def pause_stage_process(assessment_id: str, stage_num: int) -> bool:
    process = _get_active_process(assessment_id, stage_num)
    if process is None or os.name != "posix" or not hasattr(signal, "SIGSTOP"):
        return False
    try:
        os.killpg(process.pid, signal.SIGSTOP)
        return True
    except OSError:
        return False


def resume_stage_process(assessment_id: str, stage_num: int) -> bool:
    process = _get_active_process(assessment_id, stage_num)
    if process is None or os.name != "posix" or not hasattr(signal, "SIGCONT"):
        return False
    try:
        os.killpg(process.pid, signal.SIGCONT)
        return True
    except OSError:
        return False


def cancel_stage_process(assessment_id: str, stage_num: int) -> bool:
    process = _get_active_process(assessment_id, stage_num)
    if process is None:
        return False
    try:
        if os.name == "posix":
            os.killpg(process.pid, signal.SIGTERM)
            if hasattr(signal, "SIGCONT"):
                try:
                    os.killpg(process.pid, signal.SIGCONT)
                except OSError:
                    pass
        else:
            process.terminate()
        return True
    except OSError:
        return False


def cancel_assessment_processes(assessment_id: str) -> None:
    with _PROCESS_LOCK:
        stages = [stage_num for candidate_id, stage_num in _ACTIVE_PROCESSES if candidate_id == assessment_id]
    for stage_num in stages:
        cancel_stage_process(assessment_id, stage_num)


def get_inputs_dir(assessment_id: str) -> str:
    return os.path.join(UPLOAD_DIR, assessment_id, "inputs")


def list_stage1_inputs(assessment_id: str) -> list[tuple[str, str]]:
    """Returns [(filepath, inferred_source_type), ...] for every uploaded
    Stage 1 input file, in a stable (sorted) order."""
    inputs_dir = get_inputs_dir(assessment_id)
    if not os.path.isdir(inputs_dir):
        return []
    results: list[tuple[str, str]] = []
    for name in sorted(os.listdir(inputs_dir)):
        ext = os.path.splitext(name)[1].lower()
        path = os.path.join(inputs_dir, name)
        if ext in INPUT_IMAGE_EXTENSIONS:
            results.append((path, "architecture_diagram"))
        elif ext in INPUT_DOCUMENT_EXTENSIONS:
            results.append((path, "existing_item_definition"))
    return results

STAGE_DIRS = {number: stage.key for number, stage in STAGES_BY_NUMBER.items()}
STAGE_OUTPUT_FILES = {
    number: stage.outputs[0] for number, stage in STAGES_BY_NUMBER.items()
}


def utc_now():
    return datetime.now(timezone.utc)


def get_output_path(stage_num: int, assessment_id: str) -> str:
    stage_dir = STAGE_DIRS[stage_num]
    output_file = STAGE_OUTPUT_FILES[stage_num]
    return os.path.join(
        WORKSPACE_ROOT,
        "artifacts",
        assessment_id,
        stage_dir,
        output_file,
    )


def get_checkpoint1_output_dir(assessment_id: str) -> str:
    """Directory for the boundary-reasoning pipeline's outputs
    (raw-extractions.json / merged-model.json / boundary-proposal.json) --
    distinct from get_output_path(), which points at a single file for the
    legacy per-stage JSON convention stages 2-7 still use."""
    return os.path.dirname(get_output_path(1, assessment_id))


def get_agent_path(stage_num: int) -> str:
    stage_dir = STAGE_DIRS[stage_num]
    return os.path.join(
        WORKSPACE_ROOT,
        "tara-workspace",
        "web-based-tara",
        "stages",
        stage_dir,
        "agent.js",
    )


def get_upload_path(assessment_id: str) -> str:
    return os.path.join(UPLOAD_DIR, assessment_id, "assets.csv")


def get_diagram_upload_path(assessment_id: str) -> str:
    return os.path.join(UPLOAD_DIR, assessment_id, "arch.png")


def get_topology_upload_path(assessment_id: str) -> str:
    return os.path.join(UPLOAD_DIR, assessment_id, "topology.png")


def get_boundary_statement_path(assessment_id: str) -> str:
    return os.path.join(UPLOAD_DIR, assessment_id, "boundary-statement.txt")


def read_boundary_statement(assessment_id: str) -> str | None:
    path = get_boundary_statement_path(assessment_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read().strip()


def stage1_inputs_ready(assessment_id: str) -> bool:
    """True if either the legacy CSV upload, or a boundary statement plus
    at least one uploaded input file (any mix, any count), is present."""
    has_csv = os.path.exists(get_upload_path(assessment_id))
    has_inputs = bool(list_stage1_inputs(assessment_id))
    has_boundary_statement = read_boundary_statement(assessment_id) is not None
    return has_csv or (has_boundary_statement and has_inputs)


def build_stage1_args(assessment_id: str) -> list[str]:
    boundary_statement = read_boundary_statement(assessment_id)
    inputs = list_stage1_inputs(assessment_id)

    if boundary_statement and inputs:
        inputs_json = json.dumps(
            [{"filePath": path, "sourceType": source_type} for path, source_type in inputs]
        )
        return [
            "--inputs", inputs_json,
            "--boundary", boundary_statement,
            "--assessment-id", assessment_id,
            "--out", get_checkpoint1_output_dir(assessment_id),
        ]

    # Legacy CSV asset-register mode. Note: --csv was never a real flag on
    # agent.js's CLI (only --input/--mode/--assessment-id/--out are) -- this
    # path was previously broken regardless of which mode a caller wanted.
    return [
        "--input", get_upload_path(assessment_id),
        "--mode", "csv",
        "--assessment-id", assessment_id,
        "--out", get_output_path(1, assessment_id),
    ]


def build_stage_args(assessment_id: str, stage_num: int) -> list[str]:
    output = lambda number: get_output_path(number, assessment_id)
    args_map = {
        1: build_stage1_args(assessment_id),
        4: ["--assets", output(3), "--assessment-id", assessment_id, "--out", output(4)],
        5: [
            "--damage-scenarios", output(4), "--assessment-id", assessment_id, "--out", output(5),
        ],
        6: ["--threats", output(5), "--assessment-id", assessment_id, "--out", output(6)],
        7: ["--threats", output(5), "--damage-scenarios", output(4), "--out", output(7)],
        8: ["--impact", output(7), "--attacks", output(6), "--out", output(8)],
        9: [
            "--risk-register", output(8),
            "--threats", output(5),
            "--damage-scenarios", output(4),
            "--attacks", output(6),
            "--impacts", output(7),
            "--assets", output(3),
            "--assessment-id",
            assessment_id,
            "--out",
            output(9),
        ],
    }
    return args_map[stage_num]


def _service_token() -> str:
    """JWT the stage agents use to post checkpoints back to this API.
    Signed with the API's own JWT_SECRET, so no manual token is needed.
    Imported lazily to avoid a circular import with the routers package."""
    from .routers.auth import create_access_token

    return create_access_token({"sub": "pipeline-runner", "role": "service"})


def update_assessment_completion(db, assessment_id: str) -> None:
    complete_count = (
        db.query(PipelineRun)
        .filter_by(assessment_id=assessment_id, status="complete")
        .count()
    )
    assessment = db.query(Assessment).filter_by(assessment_id=assessment_id).first()
    if assessment:
        assessment.completion_percentage = int((complete_count / STAGE_COUNT) * 100)


async def run_stage_subprocess(assessment_id: str, stage_num: int, db=None) -> None:
    del db
    session = SessionLocal()
    try:
        run = session.query(PipelineRun).filter_by(
            assessment_id=assessment_id,
            stage_num=stage_num,
        ).first()
        if not run:
            return

        if run.status == "cancelled":
            return
        run.status = "running"
        run.error_message = None
        run.started_at = utc_now()
        run.completed_at = None
        session.commit()

        env = os.environ.copy()
        env["ANTHROPIC_API_KEY"] = ANTHROPIC_API_KEY
        env["LLM_PROVIDER"] = LLM_PROVIDER
        env["LLM_API_KEY"] = LLM_API_KEY
        env["LLM_MODEL"] = LLM_MODEL
        env["LLM_BASE_URL"] = LLM_BASE_URL
        env["CHECKPOINT_API_URL"] = os.getenv("CHECKPOINT_API_URL", "http://localhost:8000")
        env["CHECKPOINT_API_TOKEN"] = os.getenv("CHECKPOINT_API_TOKEN") or _service_token()

        try:
            # Blocking subprocess.run in a worker thread instead of
            # asyncio.create_subprocess_exec: on Windows, uvicorn may run a
            # SelectorEventLoop, which raises NotImplementedError for asyncio
            # subprocesses. A thread works on every event loop and platform.
            proc = subprocess.Popen(
                ["node", get_agent_path(stage_num), *build_stage_args(assessment_id, stage_num)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                cwd=WORKSPACE_ROOT,
                start_new_session=True,
            )
            with _PROCESS_LOCK:
                _ACTIVE_PROCESSES[(assessment_id, stage_num)] = proc
            session.refresh(run)
            if run.status == "cancelled":
                cancel_stage_process(assessment_id, stage_num)
            stdout, stderr = await asyncio.to_thread(proc.communicate)
            returncode = proc.returncode
            output_message = stderr.decode(errors="replace") or stdout.decode(errors="replace")
        except Exception as exc:  # noqa: BLE001 -- any failure here must still mark the run failed
            returncode = 1
            output_message = f"{type(exc).__name__}: {exc}"
        finally:
            with _PROCESS_LOCK:
                _ACTIVE_PROCESSES.pop((assessment_id, stage_num), None)

        run = session.query(PipelineRun).filter_by(
            assessment_id=assessment_id,
            stage_num=stage_num,
        ).first()
        if not run:
            return
        if run.status == "cancelled":
            run.completed_at = run.completed_at or utc_now()
        elif returncode == 0:
            run.completed_at = utc_now()
            run.status = "complete"
            run.error_message = None
        else:
            run.completed_at = utc_now()
            run.status = "failed"
            run.error_message = output_message[:2000]
        update_assessment_completion(session, assessment_id)
        session.commit()
    finally:
        session.close()
