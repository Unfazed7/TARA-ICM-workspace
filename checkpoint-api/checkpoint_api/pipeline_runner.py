import asyncio
import os
from datetime import datetime, timezone

from .database import SessionLocal
from .models import Assessment, PipelineRun


WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", ".")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(WORKSPACE_ROOT, "uploads"))

# LLM provider config — forwarded to Node.js stage agents
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")   # anthropic | openrouter | openai
LLM_API_KEY = os.getenv("LLM_API_KEY", ANTHROPIC_API_KEY)
LLM_MODEL = os.getenv("LLM_MODEL", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "")

STAGE_DIRS = {
    1: "01-input-normalization",
    2: "02-damage-analysis",
    3: "03-threat-identification",
    4: "04-attack-path-modelling",
    5: "05-impact-analysis",
    6: "06-risk-scoring",
    7: "07-risk-treatment",
}

STAGE_OUTPUT_FILES = {
    1: "asset-register.json",
    2: "damage-scenarios.json",
    3: "threats.json",
    4: "attack-paths.json",
    5: "impact-analysis.json",
    6: "risk-register.json",
    7: "risk-treatment.json",
}


def utc_now():
    return datetime.now(timezone.utc)


def get_output_path(stage_num: int) -> str:
    stage_dir = STAGE_DIRS[stage_num]
    output_file = STAGE_OUTPUT_FILES[stage_num]
    return os.path.join(
        WORKSPACE_ROOT,
        "tara-workspace",
        "web-based-tara",
        "stages",
        stage_dir,
        "output",
        output_file,
    )


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


def build_stage_args(assessment_id: str, stage_num: int) -> list[str]:
    output = get_output_path
    args_map = {
        1: [
            "--csv",
            get_upload_path(assessment_id),
            "--assessment-id",
            assessment_id,
            "--out",
            output(1),
        ],
        2: ["--assets", output(1), "--assessment-id", assessment_id, "--out", output(2)],
        3: [
            "--damage-scenarios",
            output(2),
            "--assessment-id",
            assessment_id,
            "--out",
            output(3),
        ],
        4: ["--threats", output(3), "--assessment-id", assessment_id, "--out", output(4)],
        5: ["--threats", output(3), "--damage-scenarios", output(2), "--out", output(5)],
        6: ["--impact", output(5), "--attacks", output(4), "--out", output(6)],
        7: [
            "--risk-register",
            output(6),
            "--threats",
            output(3),
            "--damage-scenarios",
            output(2),
            "--attacks",
            output(4),
            "--impacts",
            output(5),
            "--assets",
            output(1),
            "--assessment-id",
            assessment_id,
            "--out",
            output(7),
        ],
    }
    return args_map[stage_num]


def update_assessment_completion(db, assessment_id: str) -> None:
    complete_count = (
        db.query(PipelineRun)
        .filter_by(assessment_id=assessment_id, status="complete")
        .count()
    )
    assessment = db.query(Assessment).filter_by(assessment_id=assessment_id).first()
    if assessment:
        assessment.completion_percentage = int((complete_count / 7) * 100)


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
        env["CHECKPOINT_API_TOKEN"] = os.getenv("CHECKPOINT_API_TOKEN", "")

        proc = await asyncio.create_subprocess_exec(
            "node",
            get_agent_path(stage_num),
            *build_stage_args(assessment_id, stage_num),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
            cwd=WORKSPACE_ROOT,
        )
        stdout, stderr = await proc.communicate()

        run = session.query(PipelineRun).filter_by(
            assessment_id=assessment_id,
            stage_num=stage_num,
        ).first()
        if not run:
            return
        run.completed_at = utc_now()
        if proc.returncode == 0:
            run.status = "complete"
            run.error_message = None
        else:
            run.status = "failed"
            message = stderr.decode(errors="replace") or stdout.decode(errors="replace")
            run.error_message = message[:2000]
        update_assessment_completion(session, assessment_id)
        session.commit()
    finally:
        session.close()
