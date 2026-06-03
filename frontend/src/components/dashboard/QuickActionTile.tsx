import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Project } from '@/types/tara';
import { loadTaraDataFromDB, TaraDataSnapshot } from '@/lib/database';
import {
  TaraAsset, TaraThreat, TaraImpact, TaraAttackPath,
  TaraFeasibility, TaraTreatment,
} from '@/contexts/TaraContext';
import { getFeasibilityLevel, feasibilityLevelToNumber, impactToNumber, calculateRiskValue } from '@/types/risk-assessment';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Play,
  Download,
  FileSpreadsheet,
  File,
  CheckCircle2,
} from 'lucide-react';

type ExportFormat = 'pdf' | 'excel' | 'docx';

interface QuickActionTileProps {
  projects?: Project[];
}

const formatIcons: Record<ExportFormat, typeof FileText> = {
  pdf: FileText,
  excel: FileSpreadsheet,
  docx: File,
};

// ─── HELPERS ──────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getRiskLabel(v: number) {
  return ['', 'Very Low', 'Low', 'Medium', 'High', 'Critical'][v] || 'N/A';
}

// ─── DATA TYPES FOR REPORT ───────────────────────────────────────────

interface TaraReportData {
  assets: TaraAsset[];
  threats: TaraThreat[];
  impacts: TaraImpact[];
  attackPaths: TaraAttackPath[];
  feasibilities: TaraFeasibility[];
  treatments: TaraTreatment[];
}

function computeRisk(data: TaraReportData, threat: TaraThreat): number {
  const impact = data.impacts.find(i => i.linkedAssetId === threat.linkedAssetId);
  if (!impact) return 1;
  const maxImpact = Math.max(
    impactToNumber(impact.safety), impactToNumber(impact.financial),
    impactToNumber(impact.operational), impactToNumber(impact.privacy)
  );
  const ap = data.attackPaths.find(a => a.linkedThreatId === threat.id);
  if (!ap) return 1;
  const feas = data.feasibilities.find(f => f.linkedAttackPathId === ap.id);
  if (!feas) return 1;
  const feasNum = feasibilityLevelToNumber(getFeasibilityLevel(feas.factors));
  return calculateRiskValue(maxImpact, feasNum);
}

// ─── PDF / HTML REPORT ─────────────────────────────────────────────────

function generatePDFReport(project: Project, data: TaraReportData) {
  const { assets, threats, impacts, attackPaths, feasibilities, treatments } = data;
  const css = `
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1a1a2e; font-size: 13px; }
    h1 { color: #0f3460; border-bottom: 3px solid #0f3460; padding-bottom: 12px; font-size: 24px; }
    h2 { color: #0f3460; margin-top: 35px; padding-bottom: 6px; border-bottom: 1px solid #cbd5e1; font-size: 16px; }
    h3 { color: #16213e; margin-top: 20px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }
    th { background: #0f3460; color: white; padding: 8px 6px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 12px; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
    .severe { background: #fee2e2; color: #dc2626; } .major { background: #fef3c7; color: #d97706; }
    .moderate { background: #fef9c3; color: #ca8a04; } .negligible { background: #f1f5f9; color: #64748b; }
    .risk-1,.risk-2 { color: #16a34a; } .risk-3 { color: #ca8a04; } .risk-4 { color: #ea580c; } .risk-5 { color: #dc2626; }
    .meta { color: #64748b; font-size: 12px; } .footer { margin-top: 50px; border-top: 2px solid #0f3460; padding-top: 10px; font-size: 10px; color: #94a3b8; }
    .check { color: #16a34a; } .cross { color: #94a3b8; }
    .section-intro { color: #475569; margin-bottom: 10px; font-size: 12px; }
  `;

  const badge = (level: string) => `<span class="badge ${level}">${level}</span>`;
  const riskClass = (v: number) => `risk-${v}`;
  const bool = (v: boolean) => v ? '<span class="check">✓</span>' : '<span class="cross">—</span>';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>TARA Report – ${project.name}</title><style>${css}</style></head><body>

<h1>🛡️ TARA Report — ISO/SAE 21434</h1>
<p><strong>Project:</strong> ${project.name} &nbsp;|&nbsp; <strong>Vehicle:</strong> ${project.vehicleType} &nbsp;|&nbsp; <strong>Catalog:</strong> ${project.catalogVersion}</p>
<p><strong>Domains:</strong> ${project.domains.join(', ')} &nbsp;|&nbsp; <strong>Status:</strong> ${project.status} &nbsp;|&nbsp; <strong>Completion:</strong> ${project.completionPercentage ?? 0}%</p>
<p class="meta">Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; ${assets.length} Assets &nbsp;|&nbsp; ${threats.length} Threats</p>

<!-- ═══ 1. ASSET ANALYSIS ═══ -->
<h2>1. Asset Analysis (Clause 15.3)</h2>
<p class="section-intro">Cybersecurity assets identified and their security properties.</p>
<table>
  <tr><th>#</th><th>Asset ID</th><th>Asset Name</th><th>Type</th><th>Description</th><th>C</th><th>I</th><th>A</th><th>Au</th><th>Az</th><th>NR</th></tr>
  ${assets.map((a, i) => `<tr>
    <td>${i + 1}</td><td>${a.assetId}</td><td>${a.name}</td><td>${a.assetType}</td>
    <td>${a.description}</td>
    <td>${bool(a.confidentiality)}</td><td>${bool(a.integrity)}</td><td>${bool(a.availability)}</td>
    <td>${bool(a.authenticity)}</td><td>${bool(a.authorization)}</td><td>${bool(a.nonRepudiation)}</td>
  </tr>`).join('')}
</table>

<!-- ═══ 2. DAMAGE SCENARIOS ═══ -->
<h2>2. Damage Scenarios</h2>
<table>
  <tr><th>Asset ID</th><th>Asset Name</th><th>Damage Scenario</th></tr>
  ${assets.filter(a => a.damageScenario).map(a => `<tr>
    <td>${a.assetId}</td><td>${a.name}</td><td>${a.damageScenario}</td>
  </tr>`).join('')}
</table>

<!-- ═══ 3. IMPACT ANALYSIS ═══ -->
<h2>3. Impact Analysis (Clause 15.5)</h2>
<p class="section-intro">Impact rating for each asset across four categories.</p>
<table>
  <tr><th>Asset ID</th><th>Asset Name</th><th>Safety</th><th>Financial</th><th>Operational</th><th>Privacy</th><th>Max Impact</th></tr>
  ${impacts.map(imp => {
    const asset = assets.find(a => a.id === imp.linkedAssetId);
    const maxI = Math.max(impactToNumber(imp.safety), impactToNumber(imp.financial), impactToNumber(imp.operational), impactToNumber(imp.privacy));
    return `<tr>
      <td>${asset?.assetId || '—'}</td><td>${asset?.name || '—'}</td>
      <td>${badge(imp.safety)}</td><td>${badge(imp.financial)}</td>
      <td>${badge(imp.operational)}</td><td>${badge(imp.privacy)}</td>
      <td><strong>${maxI}/4</strong></td>
    </tr>`;
  }).join('')}
</table>

<!-- ═══ 4. THREAT ANALYSIS ═══ -->
<h2>4. Threat Analysis (Clause 15.4)</h2>
<p class="section-intro">Identified threat scenarios mapped to assets with STRIDE classification.</p>
<table>
  <tr><th>#</th><th>Threat ID</th><th>Scenario</th><th>Linked Asset</th><th>STRIDE Category</th></tr>
  ${threats.map((t, i) => {
    const asset = assets.find(a => a.id === t.linkedAssetId);
    return `<tr>
      <td>${i + 1}</td><td>${t.threatId}</td><td>${t.scenario}</td>
      <td>${asset?.name || '—'}</td><td>${t.strideCategory}</td>
    </tr>`;
  }).join('')}
</table>

<!-- ═══ 5. ATTACK PATH ANALYSIS ═══ -->
<h2>5. Attack Path Analysis (Clause 15.6)</h2>
<p class="section-intro">Attack vectors and paths for each identified threat.</p>
<table>
  <tr><th>#</th><th>Linked Threat</th><th>Attack Vector</th><th>Attack Path Description</th></tr>
  ${attackPaths.map((ap, i) => {
    const threat = threats.find(t => t.id === ap.linkedThreatId);
    return `<tr>
      <td>${i + 1}</td><td>${threat?.threatId || '—'}</td>
      <td>${ap.attackVector}</td><td>${ap.description}</td>
    </tr>`;
  }).join('')}
</table>

<!-- ═══ 6. FEASIBILITY ASSESSMENT ═══ -->
<h2>6. Feasibility Assessment (Clause 15.7)</h2>
<p class="section-intro">Attack feasibility based on five factors: Elapsed Time, Expertise, Knowledge, Equipment, Opportunity.</p>
<table>
  <tr><th>#</th><th>Threat</th><th>Time</th><th>Expertise</th><th>Knowledge</th><th>Equipment</th><th>Opportunity</th><th>Total</th><th>Level</th></tr>
  ${feasibilities.map((f, i) => {
    const ap = attackPaths.find(a => a.id === f.linkedAttackPathId);
    const threat = ap ? threats.find(t => t.id === ap.linkedThreatId) : null;
    const total = f.factors.time + f.factors.expertise + f.factors.knowledge + f.factors.equipment + f.factors.opportunity;
    const level = getFeasibilityLevel(f.factors);
    return `<tr>
      <td>${i + 1}</td><td>${threat?.threatId || '—'}</td>
      <td>${f.factors.time}</td><td>${f.factors.expertise}</td><td>${f.factors.knowledge}</td>
      <td>${f.factors.equipment}</td><td>${f.factors.opportunity}</td>
      <td><strong>${total}</strong></td><td>${level}</td>
    </tr>`;
  }).join('')}
</table>

<!-- ═══ 7. RISK DETERMINATION & TREATMENT ═══ -->
<h2>7. Risk Determination & Treatment Decision (Clause 15.8–15.9)</h2>
<p class="section-intro">Risk values computed from impact × feasibility, with treatment decisions.</p>
<table>
  <tr><th>#</th><th>Threat</th><th>Risk Value</th><th>Risk Level</th><th>Treatment</th><th>Controls</th></tr>
  ${treatments.map((tr, i) => {
    const threat = threats.find(t => t.id === tr.linkedThreatId);
    const rv = computeRisk(data, threat!);
    return `<tr>
      <td>${i + 1}</td><td>${threat?.threatId || '—'}</td>
      <td class="${riskClass(rv)}"><strong>${rv}/5</strong></td>
      <td class="${riskClass(rv)}">${getRiskLabel(rv)}</td>
      <td>${tr.decision}</td><td>${tr.controls || '—'}</td>
    </tr>`;
  }).join('')}
</table>

<!-- ═══ 8. CYBERSECURITY GOALS ═══ -->
<h2>8. Cybersecurity Goals (Clause 15.9)</h2>
<p class="section-intro">Goals and claims derived from threat treatment decisions.</p>
<table>
  <tr><th>#</th><th>Threat</th><th>Cybersecurity Goal</th><th>Cybersecurity Claim</th><th>Treatment</th></tr>
  ${treatments.map((tr, i) => {
    const threat = threats.find(t => t.id === tr.linkedThreatId);
    return `<tr>
      <td>${i + 1}</td><td>${threat?.threatId || '—'}</td>
      <td>${tr.cybersecurityGoal || '—'}</td><td>${tr.cybersecurityClaim || '—'}</td>
      <td>${tr.decision}</td>
    </tr>`;
  }).join('')}
</table>

<!-- ═══ 9. RESIDUAL RISK ═══ -->
<h2>9. Residual Risk Assessment</h2>
<p class="section-intro">Post-treatment residual risk levels.</p>
<table>
  <tr><th>#</th><th>Threat</th><th>Initial Risk</th><th>Treatment</th><th>Residual Risk</th><th>Residual Level</th></tr>
  ${treatments.map((tr, i) => {
    const threat = threats.find(t => t.id === tr.linkedThreatId);
    const rv = computeRisk(data, threat!);
    return `<tr>
      <td>${i + 1}</td><td>${threat?.threatId || '—'}</td>
      <td class="${riskClass(rv)}">${rv}/5</td>
      <td>${tr.decision}</td>
      <td class="${riskClass(tr.residualRisk)}">${tr.residualRisk}/5</td>
      <td class="${riskClass(tr.residualRisk)}">${getRiskLabel(tr.residualRisk)}</td>
    </tr>`;
  }).join('')}
</table>

<div class="footer">
  <p><strong>ISO/SAE 21434 Compliance Report</strong> — Generated by AutoTARA</p>
  <p>This document is confidential and intended for authorized personnel only.</p>
</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  downloadBlob(blob, `TARA_Report_${sanitize(project.name)}.html`);
}

// ─── EXCEL REPORT ──────────────────────────────────────────────────────

function generateExcelReport(project: Project, data: TaraReportData) {
  const { assets, threats, impacts, attackPaths, feasibilities, treatments } = data;
  const SEP = '\t';
  const sheets: string[] = [];

  // Project info
  sheets.push([
    'TARA REPORT',
    `Project:\t${project.name}`,
    `Vehicle Type:\t${project.vehicleType}`,
    `Catalog:\t${project.catalogVersion}`,
    `Domains:\t${project.domains.join(', ')}`,
    `Status:\t${project.status}`,
    `Completion:\t${project.completionPercentage ?? 0}%`,
    `Generated:\t${new Date().toLocaleString()}`,
    `Assets:\t${assets.length}`,
    `Threats:\t${threats.length}`,
    '',
  ].join('\n'));

  // 1. Asset Analysis
  sheets.push([
    '=== 1. ASSET ANALYSIS (Clause 15.3) ===',
    ['#', 'Asset ID', 'Asset Name', 'Type', 'Description', 'Confidentiality', 'Integrity', 'Availability', 'Authenticity', 'Authorization', 'Non-Repudiation', 'Damage Scenario'].join(SEP),
    ...assets.map((a, i) => [i + 1, a.assetId, a.name, a.assetType, a.description,
    a.confidentiality ? 'Yes' : 'No', a.integrity ? 'Yes' : 'No', a.availability ? 'Yes' : 'No',
    a.authenticity ? 'Yes' : 'No', a.authorization ? 'Yes' : 'No', a.nonRepudiation ? 'Yes' : 'No',
    a.damageScenario].join(SEP)),
    '',
  ].join('\n'));

  // 2. Impact Analysis
  sheets.push([
    '=== 2. IMPACT ANALYSIS (Clause 15.5) ===',
    ['Asset ID', 'Asset Name', 'Safety', 'Financial', 'Operational', 'Privacy', 'Max Impact'].join(SEP),
    ...impacts.map(imp => {
      const asset = assets.find(a => a.id === imp.linkedAssetId);
      const maxI = Math.max(impactToNumber(imp.safety), impactToNumber(imp.financial), impactToNumber(imp.operational), impactToNumber(imp.privacy));
      return [asset?.assetId || '', asset?.name || '', imp.safety, imp.financial, imp.operational, imp.privacy, `${maxI}/4`].join(SEP);
    }),
    '',
  ].join('\n'));

  // 3. Threat Analysis
  sheets.push([
    '=== 3. THREAT ANALYSIS (Clause 15.4) ===',
    ['#', 'Threat ID', 'Scenario', 'Linked Asset', 'STRIDE Category'].join(SEP),
    ...threats.map((t, i) => {
      const asset = assets.find(a => a.id === t.linkedAssetId);
      return [i + 1, t.threatId, t.scenario, asset?.name || '', t.strideCategory].join(SEP);
    }),
    '',
  ].join('\n'));

  // 4. Attack Path Analysis
  sheets.push([
    '=== 4. ATTACK PATH ANALYSIS (Clause 15.6) ===',
    ['#', 'Linked Threat', 'Attack Vector', 'Description'].join(SEP),
    ...attackPaths.map((ap, i) => {
      const threat = threats.find(t => t.id === ap.linkedThreatId);
      return [i + 1, threat?.threatId || '', ap.attackVector, ap.description].join(SEP);
    }),
    '',
  ].join('\n'));

  // 5. Feasibility Assessment
  sheets.push([
    '=== 5. FEASIBILITY ASSESSMENT (Clause 15.7) ===',
    ['#', 'Threat', 'Time', 'Expertise', 'Knowledge', 'Equipment', 'Opportunity', 'Total', 'Level'].join(SEP),
    ...feasibilities.map((f, i) => {
      const ap = attackPaths.find(a => a.id === f.linkedAttackPathId);
      const threat = ap ? threats.find(t => t.id === ap.linkedThreatId) : null;
      const total = f.factors.time + f.factors.expertise + f.factors.knowledge + f.factors.equipment + f.factors.opportunity;
      return [i + 1, threat?.threatId || '', f.factors.time, f.factors.expertise, f.factors.knowledge, f.factors.equipment, f.factors.opportunity, total, getFeasibilityLevel(f.factors)].join(SEP);
    }),
    '',
  ].join('\n'));

  // 6. Risk Determination & Treatment
  sheets.push([
    '=== 6. RISK DETERMINATION & TREATMENT (Clause 15.8-15.9) ===',
    ['#', 'Threat', 'Risk Value', 'Risk Level', 'Treatment Decision', 'Controls'].join(SEP),
    ...treatments.map((tr, i) => {
      const threat = threats.find(t => t.id === tr.linkedThreatId);
      const rv = threat ? computeRisk(data, threat) : tr.riskValue;
      return [i + 1, threat?.threatId || '', `${rv}/5`, getRiskLabel(rv), tr.decision, tr.controls || ''].join(SEP);
    }),
    '',
  ].join('\n'));

  // 7. Cybersecurity Goals
  sheets.push([
    '=== 7. CYBERSECURITY GOALS (Clause 15.9) ===',
    ['#', 'Threat', 'Cybersecurity Goal', 'Cybersecurity Claim', 'Treatment'].join(SEP),
    ...treatments.map((tr, i) => {
      const threat = threats.find(t => t.id === tr.linkedThreatId);
      return [i + 1, threat?.threatId || '', tr.cybersecurityGoal || '', tr.cybersecurityClaim || '', tr.decision].join(SEP);
    }),
    '',
  ].join('\n'));

  // 8. Residual Risk
  sheets.push([
    '=== 8. RESIDUAL RISK ASSESSMENT ===',
    ['#', 'Threat', 'Initial Risk', 'Treatment', 'Residual Risk', 'Residual Level'].join(SEP),
    ...treatments.map((tr, i) => {
      const threat = threats.find(t => t.id === tr.linkedThreatId);
      const rv = threat ? computeRisk(data, threat) : tr.riskValue;
      return [i + 1, threat?.threatId || '', `${rv}/5`, tr.decision, `${tr.residualRisk}/5`, getRiskLabel(tr.residualRisk)].join(SEP);
    }),
  ].join('\n'));

  const content = sheets.join('\n\n');
  const blob = new Blob(['\ufeff' + content], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `TARA_Report_${sanitize(project.name)}.xlsx`);
}

// ─── DOCX REPORT ───────────────────────────────────────────────────────

function generateDocxReport(project: Project, data: TaraReportData) {
  // Reuse the PDF generator's HTML structure but with Word-compatible namespace
  const { assets, threats, impacts, attackPaths, feasibilities, treatments } = data;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>TARA Report</title>
<style>
  body { font-family: Calibri, sans-serif; margin: 40px; font-size: 11pt; }
  h1 { color: #0f3460; font-size: 18pt; border-bottom: 2pt solid #0f3460; }
  h2 { color: #0f3460; font-size: 14pt; margin-top: 24pt; border-bottom: 1pt solid #cbd5e1; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0f3460; color: white; padding: 6px; text-align: left; font-size: 9pt; }
  td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 10pt; }
</style>
</head><body>

<h1>TARA Report — ${project.name}</h1>
<p><b>Vehicle:</b> ${project.vehicleType} | <b>Catalog:</b> ${project.catalogVersion} | <b>Domains:</b> ${project.domains.join(', ')}</p>
<p><b>Status:</b> ${project.status} | <b>Completion:</b> ${project.completionPercentage ?? 0}% | <i>Generated: ${new Date().toLocaleString()}</i></p>

<h2>1. Asset Analysis</h2>
<table><tr><th>ID</th><th>Name</th><th>Type</th><th>Description</th><th>C</th><th>I</th><th>A</th></tr>
${assets.map(a => `<tr><td>${a.assetId}</td><td>${a.name}</td><td>${a.assetType}</td><td>${a.description}</td><td>${a.confidentiality ? '✓' : '—'}</td><td>${a.integrity ? '✓' : '—'}</td><td>${a.availability ? '✓' : '—'}</td></tr>`).join('')}
</table>

<h2>2. Impact Analysis</h2>
<table><tr><th>Asset</th><th>Safety</th><th>Financial</th><th>Operational</th><th>Privacy</th></tr>
${impacts.map(imp => { const a = assets.find(x => x.id === imp.linkedAssetId); return `<tr><td>${a?.name || '—'}</td><td>${imp.safety}</td><td>${imp.financial}</td><td>${imp.operational}</td><td>${imp.privacy}</td></tr>`; }).join('')}
</table>

<h2>3. Threat Analysis</h2>
<table><tr><th>ID</th><th>Scenario</th><th>Asset</th><th>STRIDE</th></tr>
${threats.map(t => { const a = assets.find(x => x.id === t.linkedAssetId); return `<tr><td>${t.threatId}</td><td>${t.scenario}</td><td>${a?.name || '—'}</td><td>${t.strideCategory}</td></tr>`; }).join('')}
</table>

<h2>4. Attack Path Analysis</h2>
<table><tr><th>Threat</th><th>Vector</th><th>Description</th></tr>
${attackPaths.map(ap => { const t = threats.find(x => x.id === ap.linkedThreatId); return `<tr><td>${t?.threatId || '—'}</td><td>${ap.attackVector}</td><td>${ap.description}</td></tr>`; }).join('')}
</table>

<h2>5. Feasibility Assessment</h2>
<table><tr><th>Threat</th><th>Time</th><th>Expertise</th><th>Knowledge</th><th>Equipment</th><th>Opportunity</th><th>Level</th></tr>
${feasibilities.map(f => { const ap = attackPaths.find(x => x.id === f.linkedAttackPathId); const t = ap ? threats.find(x => x.id === ap.linkedThreatId) : null; return `<tr><td>${t?.threatId || '—'}</td><td>${f.factors.time}</td><td>${f.factors.expertise}</td><td>${f.factors.knowledge}</td><td>${f.factors.equipment}</td><td>${f.factors.opportunity}</td><td>${getFeasibilityLevel(f.factors)}</td></tr>`; }).join('')}
</table>

<h2>6. Risk Determination & Treatment</h2>
<table><tr><th>Threat</th><th>Risk</th><th>Level</th><th>Treatment</th></tr>
${treatments.map(tr => { const t = threats.find(x => x.id === tr.linkedThreatId); const rv = t ? computeRisk(data, t) : tr.riskValue; return `<tr><td>${t?.threatId || '—'}</td><td>${rv}/5</td><td>${getRiskLabel(rv)}</td><td>${tr.decision}</td></tr>`; }).join('')}
</table>

<h2>7. Cybersecurity Goals</h2>
<table><tr><th>Threat</th><th>Goal</th><th>Claim</th></tr>
${treatments.map(tr => { const t = threats.find(x => x.id === tr.linkedThreatId); return `<tr><td>${t?.threatId || '—'}</td><td>${tr.cybersecurityGoal || '—'}</td><td>${tr.cybersecurityClaim || '—'}</td></tr>`; }).join('')}
</table>

<h2>8. Residual Risk</h2>
<table><tr><th>Threat</th><th>Initial Risk</th><th>Treatment</th><th>Residual Risk</th><th>Level</th></tr>
${treatments.map(tr => { const t = threats.find(x => x.id === tr.linkedThreatId); const rv = t ? computeRisk(data, t) : tr.riskValue; return `<tr><td>${t?.threatId || '—'}</td><td>${rv}/5</td><td>${tr.decision}</td><td>${tr.residualRisk}/5</td><td>${getRiskLabel(tr.residualRisk)}</td></tr>`; }).join('')}
</table>

<hr/><p style="font-size:9pt;color:#888;">ISO/SAE 21434 Compliance Report — AutoTARA. Confidential.</p>
</body></html>`;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  downloadBlob(blob, `TARA_Report_${sanitize(project.name)}.doc`);
}

// ─── COMPONENT ─────────────────────────────────────────────────────────

export function QuickActionTile({ projects = [] }: QuickActionTileProps) {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const activeProjects = projects.filter((p) => p.status !== 'archived');

  const handleGenerate = async () => {
    const project = activeProjects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    setIsGenerating(true);

    try {
      // Load real TARA data from IndexedDB for this project
      const saved = await loadTaraDataFromDB(project.id);

      let reportData: TaraReportData;
      if (saved) {
        reportData = {
          assets: saved.assets as TaraAsset[],
          threats: saved.threats as TaraThreat[],
          impacts: saved.impacts as TaraImpact[],
          attackPaths: saved.attackPaths as TaraAttackPath[],
          feasibilities: saved.feasibilities as TaraFeasibility[],
          treatments: saved.treatments as TaraTreatment[],
        };
      } else {
        // If no saved data, use seed data from TaraContext
        const { buildSeedData } = await import('@/contexts/TaraContext');
        const seed = buildSeedData();
        reportData = seed;
      }

      switch (selectedFormat) {
        case 'pdf':
          generatePDFReport(project, reportData);
          break;
        case 'excel':
          generateExcelReport(project, reportData);
          break;
        case 'docx':
          generateDocxReport(project, reportData);
          break;
      }

      setIsDone(true);
      toast.success('Report generated successfully', {
        description: `${project.name} — ${selectedFormat.toUpperCase()} with ${reportData.assets.length} assets, ${reportData.threats.length} threats`,
      });

      setTimeout(() => setIsDone(false), 2000);
    } catch (e) {
      console.error('Report generation failed:', e);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenDialog = () => {
    setSelectedProjectId('');
    setSelectedFormat('pdf');
    setIsDone(false);
    setIsGenerating(false);
    setOpen(true);
  };

  return (
    <>
      <div className="bento-tile group relative overflow-hidden flex flex-col items-center justify-center p-5 text-center">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_50%,hsl(217_91%_60%/0.06),transparent_70%)] transition-opacity group-hover:bg-[radial-gradient(ellipse_at_50%_50%,hsl(217_91%_60%/0.12),transparent_70%)]" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center transition-transform group-hover:-translate-y-0.5">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Generate TARA Report
          </p>
          <Button
            size="sm"
            onClick={handleOpenDialog}
            className={cn(
              'rounded-full px-5 gap-2',
              'shadow-[0_0_15px_hsl(217_91%_60%/0.2)]'
            )}
          >
            <Play className="w-3.5 h-3.5" />
            Start
          </Button>
        </div>
      </div>

      {/* ═════ TARA Report Generation Dialog ═════ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl z-[100] glass-card-premium border-border/30">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="gradient-text flex items-center justify-center gap-2 text-xl">
              <FileText className="w-6 h-6" />
              Generate TARA Report
            </DialogTitle>
            <DialogDescription className="text-center">
              Select a project and choose the output format for your TARA report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-3">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                1. Select Project
              </Label>
              {activeProjects.length === 0 ? (
                <div className="p-6 rounded-xl border border-border/20 bg-card/20 text-center">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No projects available</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a project first to generate a report</p>
                </div>
              ) : (
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-11 bg-card/40 border-border/40">
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <span className={cn(
                            'w-2 h-2 rounded-full',
                            p.status === 'active' ? 'bg-emerald-400' : 'bg-muted-foreground'
                          )} />
                          {p.name}
                          <span className="text-muted-foreground text-xs ml-1">({p.completionPercentage ?? 0}%)</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                2. Choose Output Format
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {(['pdf', 'excel', 'docx'] as ExportFormat[]).map((fmt) => {
                  const Icon = formatIcons[fmt];
                  const descriptions: Record<ExportFormat, string> = {
                    pdf: '.html',
                    excel: '.xlsx',
                    docx: '.doc',
                  };
                  return (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                        selectedFormat === fmt
                          ? 'border-primary/50 bg-primary/10 shadow-[0_0_15px_hsl(217_91%_60%/0.2)] ring-1 ring-primary/30'
                          : 'border-border/30 bg-card/30 hover:border-primary/30 hover:bg-primary/5'
                      )}
                    >
                      <Icon className={cn(
                        'w-7 h-7',
                        selectedFormat === fmt ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <div className="text-center">
                        <span className={cn(
                          'text-xs font-semibold uppercase block',
                          selectedFormat === fmt ? 'text-primary' : 'text-foreground'
                        )}>
                          {fmt}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {descriptions[fmt]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-center gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)} className="px-6">
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!selectedProjectId || isGenerating || activeProjects.length === 0}
              className="gap-2 btn-lift px-6 shadow-[0_0_20px_hsl(217_91%_60%/0.3)]"
              size="lg"
            >
              {isDone ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Done!
                </>
              ) : isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate & Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
