param(
  [string]$InputCsv = "tests/fixtures/inputs/ME_Final_Assets.csv",
  [string]$AssessmentId = "ASS_MODEL_TEST",
  [string]$OutDir = ".tmp/model-pipeline",
  [string]$EnvFile = ".env.local"
)

$ErrorActionPreference = "Stop"

function Resolve-RepoPath {
  param([string]$PathValue)
  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return $PathValue
  }
  return (Join-Path (Get-Location) $PathValue)
}

function Load-EnvFile {
  param([string]$PathValue)
  $resolved = Resolve-RepoPath $PathValue
  if (!(Test-Path $resolved)) {
    throw "Environment file not found: $resolved"
  }

  foreach ($line in Get-Content $resolved) {
    $trimmed = $line.Trim()
    if (!$trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    $parts = $trimmed -split "=", 2
    if ($parts.Count -ne 2) {
      continue
    }

    $name = $parts[0].Trim()
    if ($name.StartsWith('$env:')) {
      $name = $name.Substring(5)
    }
    $value = $parts[1].Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

function Require-Env {
  param([string]$Name)
  $value = [Environment]::GetEnvironmentVariable($Name, "Process")
  if (!$value -or $value.StartsWith("replace-with-")) {
    throw "$Name is not set. Update $EnvFile before running the pipeline."
  }
}

function Run-Step {
  param(
    [string]$Name,
    [string]$Command,
    [string[]]$Arguments
  )

  Write-Host ""
  Write-Host "==> $Name"
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

function Validate-Json {
  param(
    [string]$Name,
    [string]$JsonPath,
    [string]$SchemaPath
  )

  Run-Step "Validate $Name" "node" @("scripts/validate-all.js", $JsonPath, $SchemaPath)
}

Load-EnvFile $EnvFile
Require-Env "LLM_PROVIDER"
Require-Env "LLM_MODEL"
Require-Env "LLM_API_KEY"

$out = Resolve-RepoPath $OutDir
New-Item -ItemType Directory -Force -Path $out | Out-Null

$stage01 = Join-Path $out "01-asset-register.json"
$stage02 = Join-Path $out "02-damage-scenarios.json"
$stage03 = Join-Path $out "03-threats.json"
$stage04Pre = Join-Path $out "04-attack-paths-pre-engine.json"
$stage04 = Join-Path $out "04-attack-paths.json"
$stage05 = Join-Path $out "05-impact-analysis.json"
$stage06 = Join-Path $out "06-risk-register.json"
$stage07 = Join-Path $out "07-risk-treatment.json"

Write-Host "Running model-backed TARA pipeline"
Write-Host "Input CSV: $InputCsv"
Write-Host "Assessment ID: $AssessmentId"
Write-Host "Output directory: $out"
Write-Host "Provider: $env:LLM_PROVIDER"
Write-Host "Model: $env:LLM_MODEL"

Run-Step "Stage 01 input normalization" "node" @(
  "tara-workspace/web-based-tara/stages/01-input-normalization/agent.js",
  "--mode", "csv",
  "--input", $InputCsv,
  "--assessment-id", $AssessmentId,
  "--out", $stage01
)
Validate-Json "Stage 01" $stage01 "src/schemas/stage-01-asset-register.schema.json"

Run-Step "Stage 02 damage analysis" "node" @(
  "tara-workspace/web-based-tara/stages/02-damage-analysis/agent.js",
  "--assets", $stage01,
  "--assessment-id", $AssessmentId,
  "--out", $stage02
)
Validate-Json "Stage 02" $stage02 "src/schemas/stage-02-damage-scenarios.schema.json"

Run-Step "Stage 03 threat identification" "node" @(
  "tara-workspace/web-based-tara/stages/03-threat-identification/agent.js",
  "--damage-scenarios", $stage02,
  "--assessment-id", $AssessmentId,
  "--out", $stage03
)
Validate-Json "Stage 03" $stage03 "src/schemas/stage-03-threats.schema.json"

Run-Step "Stage 04 attack path modelling" "node" @(
  "tara-workspace/web-based-tara/stages/04-attack-path-modelling/agent.js",
  "--threats", $stage03,
  "--assessment-id", $AssessmentId,
  "--out", $stage04Pre
)
Validate-Json "Stage 04 pre-engine" $stage04Pre "src/schemas/stage-04-attack-paths.schema.json"

Run-Step "CVSS AFR engine" "node" @(
  "tara-workspace/web-based-tara/_engines/cvss-afr-calc.js",
  "--input", $stage04Pre,
  "--out", $stage04
)
Validate-Json "Stage 04 post-engine" $stage04 "src/schemas/stage-04-attack-paths.schema.json"

Run-Step "Stage 05 impact analysis" "node" @(
  "tara-workspace/web-based-tara/stages/05-impact-analysis/agent.js",
  "--threats", $stage03,
  "--damage-scenarios", $stage02,
  "--out", $stage05
)
Validate-Json "Stage 05" $stage05 "src/schemas/stage-05-impact-analysis.schema.json"

Run-Step "Stage 06 risk scoring" "node" @(
  "tara-workspace/web-based-tara/stages/06-risk-scoring/agent.js",
  "--impact", $stage05,
  "--attacks", $stage04,
  "--out", $stage06
)
Validate-Json "Stage 06" $stage06 "src/schemas/stage-06-risk-register.schema.json"

Run-Step "Stage 07 risk treatment" "node" @(
  "tara-workspace/web-based-tara/stages/07-risk-treatment/agent.js",
  "--risk-register", $stage06,
  "--threats", $stage03,
  "--damage-scenarios", $stage02,
  "--attacks", $stage04,
  "--impacts", $stage05,
  "--assets", $stage01,
  "--assessment-id", $AssessmentId,
  "--out", $stage07
)
Validate-Json "Stage 07" $stage07 "src/schemas/stage-07-risk-treatment.schema.json"

$summary = [ordered]@{
  generated_at = (Get-Date).ToString("o")
  assessment_id = $AssessmentId
  input_csv = $InputCsv
  output_directory = $out
  provider = $env:LLM_PROVIDER
  model = $env:LLM_MODEL
  counts = [ordered]@{
    assets = @((Get-Content $stage01 | ConvertFrom-Json)).Count
    damage_scenarios = @((Get-Content $stage02 | ConvertFrom-Json)).Count
    threats = @((Get-Content $stage03 | ConvertFrom-Json)).Count
    attack_paths = @((Get-Content $stage04 | ConvertFrom-Json)).Count
    impacts = @((Get-Content $stage05 | ConvertFrom-Json)).Count
    risks = @((Get-Content $stage06 | ConvertFrom-Json)).Count
    treatments = @((Get-Content $stage07 | ConvertFrom-Json)).Count
  }
}

$summaryPath = Join-Path $out "00-run-summary.json"
$summary | ConvertTo-Json -Depth 10 | Set-Content $summaryPath

Write-Host ""
Write-Host "Pipeline completed successfully."
Write-Host "Summary: $summaryPath"
