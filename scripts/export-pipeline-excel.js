'use strict';

const fs = require('fs');
const path = require('path');

let ExcelJS;
try {
  ExcelJS = require('exceljs');
} catch (error) {
  console.error('Missing dependency: exceljs');
  console.error('Run this once locally: npm install');
  process.exit(1);
}

const STAGES = [
  {
    key: 'assets',
    title: '01 Assets',
    file: '01-asset-register.json',
    columns: [
      ['asset_id', 'Asset ID', 12],
      ['asset_title', 'Asset Title', 32],
      ['asset_type', 'Asset Type', 20],
      ['asset_description', 'Description', 58],
      ['ciaaan.confidentiality', 'Confidentiality', 16],
      ['ciaaan.integrity', 'Integrity', 12],
      ['ciaaan.availability', 'Availability', 14],
      ['ciaaan.authenticity', 'Authenticity', 14],
      ['ciaaan.authorization', 'Authorization', 15],
      ['ciaaan.non_repudiation', 'Non Repudiation', 17],
      ['input_mode', 'Input Mode', 14],
      ['created_timestamp', 'Created', 24]
    ]
  },
  {
    key: 'damage',
    title: '02 Damage',
    file: '02-damage-scenarios.json',
    columns: [
      ['damage_id', 'Damage ID', 12],
      ['asset_id', 'Asset ID', 12],
      ['asset_title', 'Asset Title', 30],
      ['property', 'CIAAAN Property', 18],
      ['damage_scenario', 'Damage Scenario', 82],
      ['stakeholder_affected', 'Stakeholder', 18],
      ['created_timestamp', 'Created', 24]
    ]
  },
  {
    key: 'threats',
    title: '03 Threats',
    file: '03-threats.json',
    columns: [
      ['threat_id', 'Threat ID', 12],
      ['damage_scenario_id', 'Damage ID', 12],
      ['asset_id', 'Asset ID', 12],
      ['asset_title', 'Asset Title', 30],
      ['property', 'CIAAAN Property', 18],
      ['stride_category', 'STRIDE', 24],
      ['owasp_reference', 'OWASP', 12],
      ['threat_statement', 'Threat Statement', 82],
      ['derivation_note', 'Derivation Note', 72],
      ['created_timestamp', 'Created', 24]
    ]
  },
  {
    key: 'attacks',
    title: '04 Attacks',
    file: '04-attack-paths.json',
    columns: [
      ['attack_id', 'Attack ID', 12],
      ['threat_id', 'Threat ID', 12],
      ['damage_scenario_id', 'Damage ID', 12],
      ['asset_id', 'Asset ID', 12],
      ['attack_description', 'Attack Description', 72],
      ['attack_path.step_1_initial_precondition', 'Step 1 Precondition', 54],
      ['attack_path.step_2_abuse_technique', 'Step 2 Abuse Technique', 54],
      ['attack_path.step_3_exploit_effect', 'Step 3 Exploit Effect', 54],
      ['attack_path.step_4_control_gap', 'Step 4 Control Gap', 54],
      ['attack_path.step_5_threat_realization', 'Step 5 Threat Realization', 58],
      ['cvss_metrics.attack_vector', 'AV', 8],
      ['cvss_metrics.attack_complexity', 'AC', 8],
      ['cvss_metrics.privileges_required', 'PR', 8],
      ['cvss_metrics.user_interaction', 'UI', 8],
      ['afr_value', 'AFR Value', 11],
      ['afr_label', 'AFR Label', 14],
      ['justifications.attack_vector', 'AV Justification', 42],
      ['justifications.attack_complexity', 'AC Justification', 42],
      ['justifications.privileges_required', 'PR Justification', 42],
      ['justifications.user_interaction', 'UI Justification', 42],
      ['created_timestamp', 'Created', 24]
    ]
  },
  {
    key: 'impacts',
    title: '05 Impacts',
    file: '05-impact-analysis.json',
    columns: [
      ['impact_id', 'Impact ID', 12],
      ['threat_id', 'Threat ID', 12],
      ['damage_scenario_id', 'Damage ID', 12],
      ['asset_id', 'Asset ID', 12],
      ['property', 'Property', 18],
      ['impact_narrative', 'Impact Narrative', 80],
      ['tool_user.safety', 'TU Safety', 14],
      ['tool_user.privacy', 'TU Privacy', 14],
      ['tool_user.financial', 'TU Financial', 14],
      ['tool_user.operational', 'TU Operational', 16],
      ['other_stakeholders.legal', 'Other Legal', 14],
      ['other_stakeholders.financial', 'Other Financial', 16],
      ['other_stakeholders.business', 'Other Business', 16],
      ['tool_user.rationale_privacy', 'Privacy Rationale', 54],
      ['tool_user.rationale_operational', 'Operational Rationale', 54],
      ['other_stakeholders.rationale_legal', 'Legal Rationale', 54],
      ['other_stakeholders.rationale_financial', 'Financial Rationale', 54],
      ['other_stakeholders.rationale_business', 'Business Rationale', 54],
      ['created_timestamp', 'Created', 24]
    ]
  },
  {
    key: 'risks',
    title: '06 Risks',
    file: '06-risk-register.json',
    columns: [
      ['risk_rank', 'Rank', 8],
      ['risk_id', 'Risk ID', 12],
      ['risk_level', 'Risk Level', 14],
      ['risk_score', 'Risk Score', 12],
      ['impact_rating_label', 'Impact Label', 16],
      ['impact_rating_value', 'Impact Value', 13],
      ['afr_label', 'AFR Label', 14],
      ['afr_value', 'AFR Value', 11],
      ['threat_id', 'Threat ID', 12],
      ['attack_id', 'Attack ID', 12],
      ['impact_id', 'Impact ID', 12],
      ['damage_scenario_id', 'Damage ID', 12],
      ['asset_id', 'Asset ID', 12],
      ['created_timestamp', 'Created', 24]
    ]
  },
  {
    key: 'treatments',
    title: '07 Treatment',
    file: '07-risk-treatment.json',
    columns: [
      ['treatment_id', 'Treatment ID', 14],
      ['risk_id', 'Risk ID', 12],
      ['treatment_option', 'Option', 12],
      ['residual_risk_expected', 'Residual Expected', 18],
      ['cal', 'CAL', 8],
      ['cybersecurity_goal.goal_id', 'Goal ID', 12],
      ['cybersecurity_goal.goal_statement', 'Goal Statement', 84],
      ['cybersecurity_goal.self_test_note', 'Goal Self-Test', 64],
      ['cybersecurity_claim.claim_id', 'Claim ID', 12],
      ['cybersecurity_claim.claim_statement', 'Claim Statement', 84],
      ['controls_assigned', 'Controls Assigned', 70],
      ['treatment_rationale', 'Treatment Rationale', 72],
      ['avoidance_action', 'Avoidance Action', 50],
      ['threat_id', 'Threat ID', 12],
      ['attack_id', 'Attack ID', 12],
      ['impact_id', 'Impact ID', 12],
      ['damage_scenario_id', 'Damage ID', 12],
      ['asset_id', 'Asset ID', 12],
      ['created_timestamp', 'Created', 24]
    ]
  }
];

const COLORS = {
  navy: 'FF12324A',
  blue: 'FF1F6FEB',
  paleBlue: 'FFEAF3FF',
  green: 'FF1F7A4D',
  paleGreen: 'FFE9F7EF',
  amber: 'FFB7791F',
  paleAmber: 'FFFFF6E5',
  red: 'FFB42318',
  paleRed: 'FFFFEDEC',
  gray: 'FFF3F4F6',
  border: 'FFD0D7DE',
  white: 'FFFFFFFF'
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!key || !key.startsWith('--')) throw new Error(`Invalid argument: ${key}`);
    args[key.slice(2)] = argv[index + 1];
  }
  return args;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getValue(object, dottedPath) {
  const value = dottedPath.split('.').reduce((current, part) => {
    if (current === null || current === undefined) return undefined;
    return current[part];
  }, object);

  if (Array.isArray(value)) {
    return value.map(formatArrayItem).join('\n');
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (value === null || value === undefined) return '';
  return value;
}

function formatArrayItem(item) {
  if (!item || typeof item !== 'object') return String(item);
  if (item.control_id) {
    const title = item.control_title ? ` - ${item.control_title}` : '';
    const rationale = item.assignment_rationale ? `: ${item.assignment_rationale}` : '';
    return `${item.control_id}${title}${rationale}`;
  }
  return JSON.stringify(item);
}

function countBy(items, field) {
  return items.reduce((acc, item) => {
    const value = getValue(item, field) || 'blank';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function sortObjectEntries(value) {
  return Object.entries(value).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function addTitle(sheet, title, subtitle) {
  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = title;
  sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: COLORS.white } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
  sheet.getCell('A1').alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 28;

  if (subtitle) {
    sheet.mergeCells('A2:H2');
    sheet.getCell('A2').value = subtitle;
    sheet.getCell('A2').font = { italic: true, color: { argb: 'FF4B5563' } };
  }
}

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
  });
}

function thinBorder() {
  return {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } }
  };
}

function addRowsSheet(workbook, stage, rows) {
  const sheet = workbook.addWorksheet(stage.title, {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  sheet.columns = stage.columns.map(([, header, width]) => ({
    header,
    key: header,
    width
  }));
  styleHeader(sheet.getRow(1));
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(rows.length + 1, 1), column: stage.columns.length }
  };

  for (const row of rows) {
    sheet.addRow(Object.fromEntries(stage.columns.map(([pathKey, header]) => [header, getValue(row, pathKey)])));
  }

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.alignment = { vertical: 'top', wrapText: true };
    row.eachCell((cell) => {
      cell.border = thinBorder();
    });
    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBFC' } };
      });
    }
  }

  sheet.getColumn(1).font = { bold: true };
  sheet.eachRow((row) => {
    row.height = Math.min(Math.max(18, estimateRowHeight(row.values)), 96);
  });
}

function estimateRowHeight(values) {
  const maxLines = values.reduce((max, value) => {
    if (typeof value !== 'string') return max;
    const lines = value.split(/\r?\n/).length + Math.floor(value.length / 85);
    return Math.max(max, lines);
  }, 1);
  return 18 + (maxLines - 1) * 14;
}

function addSummarySheet(workbook, datasets, inputDir) {
  const sheet = workbook.addWorksheet('Summary', {
    views: [{ state: 'frozen', ySplit: 4 }]
  });
  addTitle(sheet, 'TARA Pipeline Review Workbook', `Source directory: ${inputDir}`);

  const overview = [
    ['Stage', 'Output File', 'Records', 'Status'],
    ...STAGES.map((stage) => [
      stage.title,
      stage.file,
      datasets[stage.key] ? datasets[stage.key].length : 0,
      datasets[stage.key] ? 'Loaded' : 'Missing'
    ])
  ];
  sheet.addRows([]);
  sheet.addRows(overview);
  styleHeader(sheet.getRow(4));
  sheet.columns = [
    { width: 22 },
    { width: 36 },
    { width: 12 },
    { width: 14 },
    { width: 24 },
    { width: 14 }
  ];

  for (let rowNumber = 5; rowNumber <= 11; rowNumber += 1) {
    sheet.getRow(rowNumber).eachCell((cell) => {
      cell.border = thinBorder();
      cell.alignment = { vertical: 'middle' };
      if (cell.value === 'Missing') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.paleAmber } };
        cell.font = { color: { argb: COLORS.amber }, bold: true };
      }
    });
  }

  let cursor = 13;
  cursor = addDistribution(sheet, cursor, 'Risk Levels', datasets.risks, 'risk_level');
  cursor = addDistribution(sheet, cursor + 1, 'Treatment Options', datasets.treatments, 'treatment_option');
  cursor = addDistribution(sheet, cursor + 1, 'STRIDE Categories', datasets.threats, 'stride_category');
  addDistribution(sheet, cursor + 1, 'AFR Labels', datasets.attacks, 'afr_label');
}

function addDistribution(sheet, startRow, title, rows, field) {
  sheet.getCell(startRow, 1).value = title;
  sheet.getCell(startRow, 1).font = { bold: true, size: 13, color: { argb: COLORS.navy } };
  sheet.getCell(startRow + 1, 1).value = 'Value';
  sheet.getCell(startRow + 1, 2).value = 'Count';
  styleHeader(sheet.getRow(startRow + 1));

  const entries = rows ? sortObjectEntries(countBy(rows, field)) : [];
  if (entries.length === 0) {
    sheet.getCell(startRow + 2, 1).value = 'No data';
    sheet.getCell(startRow + 2, 2).value = 0;
    return startRow + 3;
  }

  entries.forEach(([value, count], index) => {
    const row = sheet.getRow(startRow + 2 + index);
    row.getCell(1).value = value;
    row.getCell(2).value = count;
    row.eachCell((cell) => {
      cell.border = thinBorder();
    });
  });
  return startRow + 2 + entries.length;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = path.resolve(args['input-dir'] || '.tmp/model-pipeline');
  const outPath = path.resolve(args.out || path.join(inputDir, 'TARA_Pipeline_Review.xlsx'));

  if (!fs.existsSync(inputDir)) {
    throw new Error(`Pipeline output directory not found: ${inputDir}`);
  }

  const datasets = {};
  for (const stage of STAGES) {
    const rows = readJsonIfExists(path.join(inputDir, stage.file));
    datasets[stage.key] = Array.isArray(rows) ? rows : null;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TARA ICM Workspace';
  workbook.created = new Date();
  workbook.modified = new Date();

  addSummarySheet(workbook, datasets, inputDir);
  for (const stage of STAGES) {
    if (datasets[stage.key]) {
      addRowsSheet(workbook, stage, datasets[stage.key]);
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await workbook.xlsx.writeFile(outPath);
  console.log(`Excel review workbook written: ${outPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
