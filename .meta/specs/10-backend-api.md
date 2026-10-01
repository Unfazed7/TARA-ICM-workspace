# Spec 10 — Backend REST API (checkpoint-api extension)

**Module:** `checkpoint-api/checkpoint_api/`  
**Author:** Claude  
**Status:** Ready for implementation  
**Type:** FastAPI extension — deterministic, no AI  

---

## Goal

Extend `checkpoint-api` into the main TARA Aegis backend by adding three new routers: Assessments (project management), Pipeline (stage execution), and Uploads (input files). The frontend calls this API exclusively — no IndexedDB, no local state.

---

## Success Criteria

```bash
# Start the backend
cd checkpoint-api && JWT_SECRET=dev-test-secret uvicorn checkpoint_api.main:app --reload --port 8000

# Create an assessment
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Tester"}' | jq .

TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}' | jq -r .access_token)

ASS_ID=$(curl -s -X POST http://localhost:8000/api/v1/assessments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo TARA","vehicle_type":"sedan","domains":["infotainment"]}' | jq -r .assessment_id)

echo "Assessment: $ASS_ID"

# List assessments
curl -s http://localhost:8000/api/v1/assessments \
  -H "Authorization: Bearer $TOKEN" | jq .

# Get stage output (after pipeline has run)
curl -s http://localhost:8000/api/v1/assessments/$ASS_ID/outputs/01 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## File Ownership

**Codex WILL create/modify:**
- `checkpoint-api/checkpoint_api/models.py` — add Assessment, PipelineRun models
- `checkpoint-api/checkpoint_api/schemas.py` — add Pydantic schemas for new routers
- `checkpoint-api/checkpoint_api/main.py` — register new routers
- `checkpoint-api/checkpoint_api/routers/assessments.py` (create)
- `checkpoint-api/checkpoint_api/routers/pipeline.py` (create)
- `checkpoint-api/checkpoint_api/routers/uploads.py` (create)
- `checkpoint-api/checkpoint_api/pipeline_runner.py` (create)

**Codex WILL NOT modify:**
- `checkpoint-api/checkpoint_api/routers/auth.py`
- `checkpoint-api/checkpoint_api/routers/checkpoints.py`
- `checkpoint-api/checkpoint_api/database.py`
- Any `tara-workspace/` file

---

## New Database Models

Add to `models.py`:

```python
def new_assessment_id():
    # Sequential ASS_## assigned by DB trigger, not UUID
    # Use UUID internally, expose ASS_## externally
    return f"ASS_{uuid4().hex[:6].upper()}"

class Assessment(Base):
    __tablename__ = "assessments"

    assessment_id = Column(String, primary_key=True, default=new_assessment_id)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    vehicle_type = Column(String, nullable=False)   # sedan|suv|truck|van|bus|motorcycle|commercial
    domains = Column(JSON, nullable=False)           # list of strings
    status = Column(
        Enum("active", "archived", name="assessment_status"),
        nullable=False, default="active"
    )
    owner_id = Column(String, nullable=False)        # user email from JWT
    completion_percentage = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    run_id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    assessment_id = Column(String, nullable=False, index=True)
    stage_num = Column(Integer, nullable=False)     # 1–7
    stage_name = Column(String, nullable=False)
    status = Column(
        Enum("pending", "running", "complete", "failed", name="run_status"),
        nullable=False, default="pending"
    )
    error_message = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("assessment_id", "stage_num", name="uq_run_assessment_stage"),
    )
```

---

## Router: assessments.py

Base path: `/api/v1/assessments`

```
POST   /                     → create assessment
GET    /                     → list user's assessments
GET    /{assessment_id}      → get single assessment with stage completion status
PATCH  /{assessment_id}      → update name/description/status
DELETE /{assessment_id}      → delete assessment (owner only)
```

**POST / — Create assessment**
```python
Request body:
{
  "name": "string (required)",
  "description": "string (optional)",
  "vehicle_type": "sedan|suv|truck|van|bus|motorcycle|commercial (required)",
  "domains": ["infotainment", "adas", ...] (required, min 1)
}

Response 201:
{
  "assessment_id": "ASS_XXXXXX",
  "name": "...",
  "vehicle_type": "...",
  "domains": [...],
  "status": "active",
  "completion_percentage": 0,
  "stages": {
    "01": "not_started", "02": "not_started", ... "07": "not_started"
  },
  "created_at": "ISO 8601"
}
```

`stages` field is computed by querying PipelineRun for each stage.

**GET / — List assessments**
```python
Response 200: array of assessment objects (same shape as POST response)
Filter by owner_id from JWT — users only see their own assessments.
Admin role: sees all assessments.
```

**GET /{assessment_id} — Single assessment**
Same shape as POST response but includes `stage_outputs_available`: list of stage nums with completed outputs.

---

## Router: pipeline.py

Base path: `/api/v1/assessments/{assessment_id}/stages`

```
POST   /{stage_num}/run      → trigger stage execution (async background task)
GET    /{stage_num}/status   → get run status
GET    /{stage_num}/output   → get stage JSON output
DELETE /{stage_num}/reset    → delete output + reset status to not_started
```

**POST /{stage_num}/run — Trigger stage**

```python
Response 202:
{
  "run_id": "uuid",
  "assessment_id": "ASS_XXXXXX",
  "stage_num": 1,
  "status": "running",
  "started_at": "ISO 8601"
}
```

Stage dependencies enforced (stage N requires stage N-1 complete):
```python
STAGE_DEPS = {
    1: [],     # Stage 01: no deps (needs uploaded CSV)
    2: [1],
    3: [2],
    4: [3],
    5: [3],
    6: [4, 5], # Needs both attack paths (post-engine) and impact analysis
    7: [6],
}
```

Throw 409 if dependency stage not complete.

**GET /{stage_num}/status**
```python
{
  "stage_num": 1,
  "status": "not_started|pending|running|complete|failed",
  "started_at": "...",
  "completed_at": "...",
  "error_message": null
}
```

**GET /{stage_num}/output**
Returns the raw JSON content of the stage output file.
```python
# Output path convention:
WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", ".")
output_dir = f"{WORKSPACE_ROOT}/tara-workspace/web-based-tara/stages/{STAGE_DIRS[stage_num]}/output"
output_file = f"{output_dir}/{STAGE_OUTPUT_FILES[stage_num]}"
```

Stage directory and output file mapping:
```python
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
```

---

## pipeline_runner.py — Subprocess Execution

```python
import asyncio
import os
from datetime import datetime, timezone

WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", ".")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

STAGE_AGENT_ARGS = {
    # stage_num: function that returns list of CLI args given assessment_id
    1: lambda aid: [
        "--csv", f"{WORKSPACE_ROOT}/uploads/{aid}/assets.csv",
        "--assessment-id", aid,
        "--out", f"{WORKSPACE_ROOT}/tara-workspace/web-based-tara/stages/01-input-normalization/output/asset-register.json",
    ],
    2: lambda aid: [
        "--assets", f"...stages/01-input-normalization/output/asset-register.json",
        "--assessment-id", aid,
        "--out", f"...stages/02-damage-analysis/output/damage-scenarios.json",
    ],
    # ... similar for stages 3-7
}

async def run_stage(assessment_id: str, stage_num: int, db) -> None:
    """Run a pipeline stage as an async subprocess. Updates PipelineRun in DB."""
    stage_dir = STAGE_DIRS[stage_num]
    agent_path = f"{WORKSPACE_ROOT}/tara-workspace/web-based-tara/stages/{stage_dir}/agent.js"
    args = STAGE_AGENT_ARGS[stage_num](assessment_id)

    env = os.environ.copy()
    env["ANTHROPIC_API_KEY"] = ANTHROPIC_API_KEY

    proc = await asyncio.create_subprocess_exec(
        "node", agent_path, *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
    )

    stdout, stderr = await proc.communicate()

    if proc.returncode == 0:
        # Update PipelineRun status = complete
        ...
    else:
        # Update PipelineRun status = failed, error_message = stderr.decode()
        ...
```

**Note on assessment isolation:** For MVP, stages write to the shared `stages/*/output/` paths. Per-assessment output isolation (writing to `uploads/{assessment_id}/stage-outputs/`) is a post-MVP concern.

---

## Router: uploads.py

Base path: `/api/v1/assessments/{assessment_id}/upload`

```
POST /csv    → upload asset CSV file (for Stage 01)
GET  /csv    → check if CSV uploaded
```

**POST /csv**
- Accept `multipart/form-data` with file field `assets_csv`
- Validate: file must be `.csv`, size < 5MB
- Save to `uploads/{assessment_id}/assets.csv`
- Return `{ "uploaded": true, "filename": "assets.csv", "size_bytes": N }`

```python
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
```

---

## Register New Routers in main.py

```python
from .routers.assessments import router as assessments_router
from .routers.pipeline import router as pipeline_router
from .routers.uploads import router as uploads_router

app.include_router(assessments_router, prefix="/api/v1/assessments", tags=["assessments"])
app.include_router(pipeline_router, prefix="/api/v1/assessments", tags=["pipeline"])
app.include_router(uploads_router, prefix="/api/v1/assessments", tags=["uploads"])
```

---

## Auth: add /login endpoint

The existing `auth.py` has register and get_current_user but is missing a login endpoint that returns a JWT token. Add:

```
POST /api/v1/auth/login   → { "access_token": "...", "token_type": "bearer" }
```

---

## Error Conditions

| Condition | HTTP | Response |
|-----------|------|----------|
| Assessment not found | 404 | `{ "detail": "Assessment not found" }` |
| Stage dependency not met | 409 | `{ "detail": "Stage N requires stage M to be complete first" }` |
| Stage already running | 409 | `{ "detail": "Stage N is already running" }` |
| No CSV uploaded for stage 1 | 422 | `{ "detail": "Upload assets.csv before running stage 01" }` |
| ANTHROPIC_API_KEY not set | 503 | `{ "detail": "ANTHROPIC_API_KEY not configured" }` |
| Stage output file not found | 404 | `{ "detail": "Stage N output not yet available" }` |

---

## Verification

```bash
# All existing tests still pass
cd checkpoint-api && python -m pytest -v

# New endpoints respond correctly
# (integration test: create assessment, upload CSV, trigger stage 01, poll status, get output)
```
