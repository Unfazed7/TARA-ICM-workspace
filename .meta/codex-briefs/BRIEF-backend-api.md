# Codex Brief — Backend REST API Extension (Spec 10)

**Spec:** `.meta/specs/10-backend-api.md` — read it fully before starting.  
**Branch:** Create `codex/backend-api` from `claude`. PR targets `claude`.  
**Do NOT branch from `develop` or any other branch. Do NOT implement spec 11 (frontend) in this branch.**

```bash
git fetch origin claude
git checkout -b codex/backend-api origin/claude
# ... implement, commit, push ...
git push -u origin codex/backend-api
# open PR: codex/backend-api → claude
```

---

## What to Build

Extend `checkpoint-api/` with three new routers. The existing auth.py, checkpoints.py, database.py are NOT touched.

### 1. `checkpoint-api/checkpoint_api/models.py`

Add two new ORM models to the existing file: `Assessment` and `PipelineRun`. See spec for full field definitions. Import `uuid4` from `uuid`.

### 2. `checkpoint-api/checkpoint_api/schemas.py`

Add Pydantic request/response schemas for the new routers:
- `AssessmentCreate`, `AssessmentUpdate`, `AssessmentResponse` (with `stages` dict)
- `PipelineRunResponse`
- `UploadResponse`

### 3. `checkpoint-api/checkpoint_api/pipeline_runner.py`

Create this module. It runs Node.js stage agents as async subprocesses.

```python
import asyncio, os, json
from datetime import datetime, timezone

WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", ".")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

STAGE_DIRS = {
    1: "01-input-normalization",  2: "02-damage-analysis",
    3: "03-threat-identification", 4: "04-attack-path-modelling",
    5: "05-impact-analysis",      6: "06-risk-scoring",
    7: "07-risk-treatment",
}
STAGE_OUTPUT_FILES = {
    1: "asset-register.json",   2: "damage-scenarios.json",
    3: "threats.json",          4: "attack-paths.json",
    5: "impact-analysis.json",  6: "risk-register.json",
    7: "risk-treatment.json",
}

def get_output_path(stage_num: int) -> str:
    stage_dir = STAGE_DIRS[stage_num]
    output_file = STAGE_OUTPUT_FILES[stage_num]
    return f"{WORKSPACE_ROOT}/tara-workspace/web-based-tara/stages/{stage_dir}/output/{output_file}"

def get_agent_path(stage_num: int) -> str:
    stage_dir = STAGE_DIRS[stage_num]
    return f"{WORKSPACE_ROOT}/tara-workspace/web-based-tara/stages/{stage_dir}/agent.js"

def build_stage_args(assessment_id: str, stage_num: int) -> list[str]:
    """Build CLI args for each stage agent."""
    upload_dir = f"{WORKSPACE_ROOT}/uploads/{assessment_id}"
    output = lambda n: get_output_path(n)
    
    args_map = {
        1: ["--csv",     f"{upload_dir}/assets.csv",
            "--assessment-id", assessment_id,
            "--out",     output(1)],
        2: ["--assets",  output(1),
            "--assessment-id", assessment_id,
            "--out",     output(2)],
        3: ["--damage-scenarios", output(2),
            "--assessment-id", assessment_id,
            "--out",     output(3)],
        4: ["--threats", output(3),
            "--assessment-id", assessment_id,
            "--out",     output(4)],
        5: ["--threats", output(3),
            "--damage-scenarios", output(2),
            "--out",     output(5)],
        6: ["--impact",  output(5),
            "--attacks", output(4),
            "--out",     output(6)],
        7: ["--risk-register",      output(6),
            "--threats",            output(3),
            "--damage-scenarios",   output(2),
            "--attacks",            output(4),
            "--impacts",            output(5),
            "--assets",             output(1),
            "--assessment-id",      assessment_id,
            "--out",                output(7)],
    }
    return args_map[stage_num]

async def run_stage_subprocess(assessment_id: str, stage_num: int, db) -> None:
    """Invoke node agent, update PipelineRun status in DB."""
    import os
    from .models import PipelineRun
    from sqlalchemy.orm import Session
    from .database import SessionLocal
    
    db = SessionLocal()
    try:
        run = db.query(PipelineRun).filter_by(
            assessment_id=assessment_id, stage_num=stage_num
        ).first()
        run.status = "running"
        run.started_at = datetime.now(timezone.utc)
        db.commit()
        
        env = os.environ.copy()
        env["ANTHROPIC_API_KEY"] = ANTHROPIC_API_KEY
        env["CHECKPOINT_API_URL"] = os.getenv("CHECKPOINT_API_URL", "http://localhost:8000")
        env["CHECKPOINT_API_TOKEN"] = os.getenv("CHECKPOINT_API_TOKEN", "")
        
        agent = get_agent_path(stage_num)
        args = build_stage_args(assessment_id, stage_num)
        
        proc = await asyncio.create_subprocess_exec(
            "node", agent, *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        stdout, stderr = await proc.communicate()
        
        run = db.query(PipelineRun).filter_by(
            assessment_id=assessment_id, stage_num=stage_num
        ).first()
        run.completed_at = datetime.now(timezone.utc)
        if proc.returncode == 0:
            run.status = "complete"
        else:
            run.status = "failed"
            run.error_message = stderr.decode(errors="replace")[:2000]
        db.commit()
    finally:
        db.close()
```

### 4. `checkpoint-api/checkpoint_api/routers/assessments.py`

Five endpoints (see spec). Use `get_current_user` from `auth.py` as dependency. Check owner_id matches JWT user for non-admin users.

The `stages` field on AssessmentResponse is computed by querying `PipelineRun` for all 7 stages and returning their status (default `"not_started"` if no run exists yet).

### 5. `checkpoint-api/checkpoint_api/routers/pipeline.py`

Four endpoints. The `run` endpoint:
1. Checks dependency stages are complete (see `STAGE_DEPS` in spec)
2. Creates or resets a `PipelineRun` record with status `"pending"`
3. Fires `run_stage_subprocess` as a FastAPI `BackgroundTask`
4. Returns 202 immediately

The `output` endpoint reads the JSON file from disk and returns it. Return 404 if file doesn't exist.

### 6. `checkpoint-api/checkpoint_api/routers/uploads.py`

Two endpoints. Save uploaded CSV to `uploads/{assessment_id}/assets.csv`.

```python
import shutil, os
from fastapi import UploadFile, File, HTTPException

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

@router.post("/{assessment_id}/upload/csv", status_code=200)
async def upload_csv(assessment_id: str, assets_csv: UploadFile = File(...), ...):
    if not assets_csv.filename.endswith('.csv'):
        raise HTTPException(422, "File must be a .csv")
    dest = os.path.join(UPLOAD_DIR, assessment_id)
    os.makedirs(dest, exist_ok=True)
    path = os.path.join(dest, "assets.csv")
    with open(path, "wb") as f:
        shutil.copyfileobj(assets_csv.file, f)
    size = os.path.getsize(path)
    if size > 5 * 1024 * 1024:
        os.unlink(path)
        raise HTTPException(422, "File too large — max 5MB")
    return {"uploaded": True, "filename": "assets.csv", "size_bytes": size}
```

### 7. Add /login to auth.py

Add one endpoint to existing `auth.py`:
```python
@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}
```

Check the existing auth.py for exact imports/helpers (`create_access_token`, `verify_password`) and use the same ones.

### 8. Register all routers in main.py

```python
from .routers.assessments import router as assessments_router
from .routers.pipeline import router as pipeline_router
from .routers.uploads import router as uploads_router

app.include_router(assessments_router, prefix="/api/v1/assessments", tags=["assessments"])
app.include_router(pipeline_router, prefix="/api/v1/assessments", tags=["pipeline"])
app.include_router(uploads_router, prefix="/api/v1/assessments", tags=["uploads"])
```

Also move the existing `checkpoints_router` prefix to `/api/v1/checkpoints` (or keep it if tests depend on current prefix — check first).

---

## Do Not Touch

- `routers/auth.py` (except adding /login)
- `routers/checkpoints.py`
- `database.py`
- Any `tara-workspace/` file

---

## Verification

```bash
cd checkpoint-api
JWT_SECRET=dev-test-secret uvicorn checkpoint_api.main:app --reload --port 8000

# Health check
curl http://localhost:8000/docs  # Swagger UI must load

# Auth flow
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"Test1234!","name":"Dev"}' | jq .

TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"Test1234!"}' | jq -r .access_token)

# Assessment CRUD
ID=$(curl -s -X POST http://localhost:8000/api/v1/assessments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","vehicle_type":"sedan","domains":["infotainment"]}' | jq -r .assessment_id)

curl -s http://localhost:8000/api/v1/assessments \
  -H "Authorization: Bearer $TOKEN" | jq '.[0].stages'
# Must return {"01":"not_started","02":"not_started",...}

# Stage dependency check
curl -s -X POST http://localhost:8000/api/v1/assessments/$ID/stages/2/run \
  -H "Authorization: Bearer $TOKEN" | jq .
# Must return 409 (stage 1 not complete)

# All existing pytest tests still pass
python -m pytest -v
```
