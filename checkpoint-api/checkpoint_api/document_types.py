"""Upload screen document types (spec 23): what the analyst picks, the group it counts towards and the type Stage 01 reads it as."""

GROUPS = ("components", "behaviour")

# label -> (group, doc_type). "Other" is not listed: the analyst types its label and picks the group by where they add it.
LABELS = {
    "Architecture diagram": ("components", "diagram"),
    "Component diagram": ("components", "diagram"),
    "Infrastructure or sizing document": ("components", "infra"),
    "Cloud configuration export": ("components", "config_export"),
    "Existing item definition": ("components", "existing_item_definition"),
    "Asset list": ("components", "asset_list"),
    "Functional description": ("behaviour", "functional"),
    "SRS": ("behaviour", "srs"),
    "Spec book": ("behaviour", "srs"),
    "API specification": ("behaviour", "api_spec"),
    "User manual": ("behaviour", "manual"),
    "Client answers (Q&A)": ("behaviour", "qa"),
}

# Group a type implies when an older upload carries no group.
TYPE_GROUP = {doc_type: group for group, doc_type in LABELS.values()}

MISSING_BOUNDARY = "What is being assessed: the item name and one sentence on what it covers."
MISSING_GROUP = {
    "components": "At least one document describing the system's components or architecture.",
    "behaviour": "At least one document describing what the system does.",
}


def group_of(entry: dict) -> str | None:
    return entry.get("category") if entry.get("category") in GROUPS else TYPE_GROUP.get(entry.get("doc_type"))


def missing_input(boundary: str | None, documents: list) -> list:
    """What is still needed before Execute, in plain words. Reading failures are only known after the run."""
    missing = []
    if len(str(boundary or "").split()) < 6:
        missing.append(MISSING_BOUNDARY)
    present = {group_of(d) for d in documents}
    missing += [MISSING_GROUP[g] for g in GROUPS if g not in present]
    return missing
