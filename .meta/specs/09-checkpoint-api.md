# Spec 09 — Checkpoint API (FastAPI Service)

**Service:** `checkpoint-api/` (separate Python service)  
**Framework:** FastAPI + PostgreSQL  
**Author:** Claude  
**Status:** Ready for implementation — no blockers  
**Consumers:** Orchestrator (Node.js polls), Frontend (React submits review decisions)

---

## Goal

Provide a lightweight REST API that manages human review checkpoints between AI-driven TARA stages. The orchestrator submits stage output and blocks until a reviewer approves or rejects. The frontend displays the output and captures the decision.

---

## Success Criteria

```bash
# Service starts cleanly
uvicorn checkpoint_api.main:app --reload

# Orchestrator can create a checkpoint
curl -X POST http://localhost:8000/api/v1/assessments/ASS_01/checkpoints \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"stage_num": 2, "stage_name": "damage-analysis", "output_summary": {}}'
# → 201 with checkpoint_id and status "pending_review"

# Orchestrator can poll status
curl http://localhost:8000/api/v1/assessments/ASS_01/checkpoints/2 \
  -H "Authorization: Bearer <token>"
# → 200 with current status

# Reviewer can approve
curl -X POST http://localhost:8000/api/v1/checkpoints/<checkpoint_id>/review \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "approved", "reviewer_id": "usr_01"}'
# → 200 with status "approved"

# Orchestrator polling after approval returns "approved"
# pytest tests/ → all pass
```

---

## File Ownership

**Codex WILL create:**
```
checkpoint-api/
├── main.py                  FastAPI app entry point
├── models.py                SQLAlchemy ORM models
├── schemas.py               Pydantic request/response schemas
├── routers/
│   ├── checkpoints.py       Checkpoint CRUD endpoints
│   └── auth.py              JWT auth dependency
├── database.py              DB connection + session
├── requirements.txt
└── tests/
    └── test_checkpoints.py
```

**Codex WILL NOT modify:**
- Any file in `tara-workspace/`
- Any `.meta/specs/` file

---

## Data Model

```python
# models.py
class Checkpoint(Base):
    __tablename__ = "checkpoints"

    checkpoint_id   = Column(String, primary_key=True, default=lambda: f"CHK_{uuid4().hex[:8].upper()}")
    assessment_id   = Column(String, nullable=False, index=True)
    stage_num       = Column(Integer, nullable=False)
    stage_name      = Column(String, nullable=False)
    status          = Column(Enum("pending_review", "approved", "rejected"), default="pending_review")
    output_summary  = Column(JSON, nullable=True)
    reviewer_id     = Column(String, nullable=True)
    notes           = Column(String, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    reviewed_at     = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("assessment_id", "stage_num", name="uq_assessment_stage"),
    )
```

---

## Endpoints

### POST `/api/v1/assessments/{assessment_id}/checkpoints`
Orchestrator calls this when a stage finishes and needs human review.

**Request body:**
```json
{
  "stage_num": 2,
  "stage_name": "damage-analysis",
  "output_summary": {
    "total_damage_scenarios": 12,
    "assets_covered": 5,
    "sample": [{ "damage_id": "DS_01", "property": "confidentiality" }]
  }
}
```

**Response 201:**
```json
{
  "checkpoint_id": "CHK_A1B2C3D4",
  "assessment_id": "ASS_01",
  "stage_num": 2,
  "stage_name": "damage-analysis",
  "status": "pending_review",
  "created_at": "2026-06-01T10:00:00Z"
}
```

**Error 409:** Checkpoint for this `assessment_id` + `stage_num` already exists.

---

### GET `/api/v1/assessments/{assessment_id}/checkpoints/{stage_num}`
Orchestrator polls this to check review status.

**Response 200:**
```json
{
  "checkpoint_id": "CHK_A1B2C3D4",
  "assessment_id": "ASS_01",
  "stage_num": 2,
  "stage_name": "damage-analysis",
  "status": "pending_review | approved | rejected",
  "reviewer_id": "usr_01 | null",
  "notes": "string | null",
  "created_at": "ISO 8601",
  "reviewed_at": "ISO 8601 | null"
}
```

**Error 404:** No checkpoint found for this assessment + stage.

---

### POST `/api/v1/checkpoints/{checkpoint_id}/review`
Frontend calls this when reviewer clicks Approve or Reject.

**Request body:**
```json
{
  "decision": "approved | rejected",
  "reviewer_id": "usr_01",
  "notes": "optional feedback string"
}
```

**Response 200:**
```json
{
  "checkpoint_id": "CHK_A1B2C3D4",
  "status": "approved | rejected",
  "reviewer_id": "usr_01",
  "reviewed_at": "ISO 8601"
}
```

**Error 404:** Checkpoint not found.  
**Error 409:** Checkpoint already reviewed (status is not `pending_review`).

---

### GET `/api/v1/assessments/{assessment_id}/checkpoints`
Frontend calls this to list all checkpoints for an assessment (dashboard view).

**Response 200:**
```json
[
  {
    "checkpoint_id": "CHK_A1B2C3D4",
    "stage_num": 2,
    "stage_name": "damage-analysis",
    "status": "approved",
    "created_at": "ISO 8601",
    "reviewed_at": "ISO 8601"
  }
]
```

---

## Authentication

JWT Bearer token on all endpoints.

```python
# routers/auth.py
from fastapi.security import HTTPBearer
security = HTTPBearer()

async def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)):
    # Validate JWT, return user_id
    ...
```

Token format: `Authorization: Bearer <jwt>`  
JWT secret: from environment variable `JWT_SECRET`  
Algorithm: HS256

---

## Orchestrator Polling Contract (Node.js side)

The Node.js orchestrator polls using this pattern:

```javascript
async function waitForApproval(assessmentId, stageNum, intervalMs = 30000) {
  while (true) {
    const res = await fetch(
      `${CHECKPOINT_API_URL}/api/v1/assessments/${assessmentId}/checkpoints/${stageNum}`,
      { headers: { Authorization: `Bearer ${CHECKPOINT_API_TOKEN}` } }
    );
    const { status, notes } = await res.json();

    if (status === 'approved') return { approved: true };
    if (status === 'rejected') return { approved: false, notes };
    // status === 'pending_review' → wait and retry

    await new Promise(r => setTimeout(r, intervalMs));
  }
}
```

Environment variables the orchestrator needs:
```
CHECKPOINT_API_URL=http://localhost:8000
CHECKPOINT_API_TOKEN=<service jwt>
```

---

## Environment Variables (FastAPI service)

```
DATABASE_URL=postgresql://user:password@localhost:5432/tara_aegis
JWT_SECRET=<secret>
ALLOWED_ORIGINS=http://localhost:5173   # React dev server
```

For local dev without PostgreSQL, set:
```
DATABASE_URL=sqlite:///./tara_aegis.db
```
SQLAlchemy works with both — no code change needed.

---

## Validation Rules

- `stage_num` must be integer 1–8
- `decision` must be exactly `"approved"` or `"rejected"`
- Cannot review a checkpoint that is already approved or rejected (409)
- `output_summary` is stored as-is — no schema validation server-side (orchestrator owns that)
- `reviewer_id` must be non-empty string

---

## Error Response Format (all errors)

```json
{
  "detail": "Human-readable error message"
}
```

---

## Verification Steps

```bash
# 1. Run test suite
pytest checkpoint-api/tests/ -v

# 2. Test full approval flow
pytest checkpoint-api/tests/test_checkpoints.py::test_full_approval_flow

# 3. Test rejection flow
pytest checkpoint-api/tests/test_checkpoints.py::test_rejection_flow

# 4. Test duplicate checkpoint returns 409
pytest checkpoint-api/tests/test_checkpoints.py::test_duplicate_checkpoint

# 5. Test polling returns correct status transitions
pytest checkpoint-api/tests/test_checkpoints.py::test_status_transitions

# 6. Verify OpenAPI docs load
curl http://localhost:8000/docs  # should return HTML
```
