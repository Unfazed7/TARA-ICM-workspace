from dataclasses import dataclass


@dataclass(frozen=True)
class StageDefinition:
    number: int
    key: str
    name: str
    description: str
    dependencies: tuple[int, ...]
    outputs: tuple[str, ...]
    checkpoint: str | None
    available: bool


STAGES: tuple[StageDefinition, ...] = (
    StageDefinition(
        1,
        "01-input-normalization",
        "Input Normalization",
        "Read Client documents into a Document register and sourced Facts.",
        (),
        ("document-register.json", "facts.json"),
        "CP0 Reading review",
        False,
    ),
    StageDefinition(
        2,
        "02-item-definition",
        "Item Definition",
        "Build the Item Definition from CP0-confirmed Facts and Analyst decisions.",
        (1,),
        ("item-definition.json", "questions.json"),
        "CP1 Item Definition review",
        False,
    ),
    StageDefinition(
        3,
        "03-asset-identification",
        "Asset Identification",
        "Derive Assets and their CIAAAN properties from the finalized Item Definition.",
        (2,),
        ("asset-register.json",),
        "Asset review",
        False,
    ),
    StageDefinition(
        4,
        "04-damage-analysis",
        "Damage Analysis",
        "Derive damage scenarios for each Asset and applicable CIAAAN property.",
        (3,),
        ("damage-scenarios.json",),
        "Required review",
        True,
    ),
    StageDefinition(
        5,
        "05-threat-identification",
        "Threat Identification",
        "Identify Asset-specific threats from reviewed damage scenarios.",
        (4,),
        ("threats.json",),
        "Required review",
        True,
    ),
    StageDefinition(
        6,
        "06-attack-path-modelling",
        "Attack Path Modelling",
        "Model attack paths and calculate CVSS exploitability.",
        (5,),
        ("attack-paths.json",),
        "Required review",
        True,
    ),
    StageDefinition(
        7,
        "07-impact-analysis",
        "Impact Analysis",
        "Rate impacts for each threat and damage scenario.",
        (4, 5),
        ("impact-analysis.json",),
        "Required review",
        True,
    ),
    StageDefinition(
        8,
        "08-risk-scoring",
        "Risk Scoring",
        "Calculate risk deterministically from attack feasibility and impact.",
        (6, 7),
        ("risk-register.json",),
        None,
        True,
    ),
    StageDefinition(
        9,
        "09-risk-treatment",
        "Risk Treatment",
        "Select treatments, cybersecurity goals, claims, and controls.",
        (8,),
        ("risk-treatment.json",),
        "Optional review",
        True,
    ),
    StageDefinition(
        10,
        "10-residual-risk",
        "Residual Risk",
        "Calculate residual risk after selected treatments.",
        (8, 9),
        ("residual-risk.json",),
        None,
        False,
    ),
)

STAGES_BY_NUMBER = {stage.number: stage for stage in STAGES}
STAGE_COUNT = len(STAGES)


def get_stage(stage_num: int) -> StageDefinition | None:
    return STAGES_BY_NUMBER.get(stage_num)
