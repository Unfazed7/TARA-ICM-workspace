import { ThreatScenario } from '@/types/risk-assessment';

// Generate 100+ mock threat scenarios for performance testing
export const generateMockScenarios = (): ThreatScenario[] => {
  const baseScenarios: Partial<ThreatScenario>[] = [
    {
      name: 'CAN Bus Injection Attack',
      description: 'Unauthorized injection of malicious CAN frames to control vehicle functions',
      targetAsset: 'ECU-Gateway',
      impactSafety: 'severe',
      impactFinancial: 'major',
      impactOperational: 'major',
      impactPrivacy: 'moderate',
    },
    {
      name: 'Firmware Extraction',
      description: 'Physical extraction and reverse engineering of ECU firmware',
      targetAsset: 'ECU-Engine',
      impactSafety: 'moderate',
      impactFinancial: 'major',
      impactOperational: 'moderate',
      impactPrivacy: 'major',
    },
    {
      name: 'OTA Update Manipulation',
      description: 'Man-in-the-middle attack on over-the-air software updates',
      targetAsset: 'Telematics Unit',
      impactSafety: 'severe',
      impactFinancial: 'severe',
      impactOperational: 'major',
      impactPrivacy: 'moderate',
    },
    {
      name: 'Key Fob Relay Attack',
      description: 'Signal amplification attack on passive entry systems',
      targetAsset: 'BCM',
      impactSafety: 'negligible',
      impactFinancial: 'severe',
      impactOperational: 'moderate',
      impactPrivacy: 'negligible',
    },
    {
      name: 'Infotainment Data Exfiltration',
      description: 'Unauthorized access to personal data stored in IVI system',
      targetAsset: 'Infotainment Head Unit',
      impactSafety: 'negligible',
      impactFinancial: 'moderate',
      impactOperational: 'negligible',
      impactPrivacy: 'severe',
    },
    {
      name: 'Diagnostic Port Exploitation',
      description: 'Malicious access via OBD-II diagnostic interface',
      targetAsset: 'Diagnostic Module',
      impactSafety: 'major',
      impactFinancial: 'major',
      impactOperational: 'major',
      impactPrivacy: 'moderate',
    },
    {
      name: 'Sensor Spoofing (LiDAR)',
      description: 'Injection of false LiDAR data to confuse ADAS systems',
      targetAsset: 'ADAS Controller',
      impactSafety: 'severe',
      impactFinancial: 'major',
      impactOperational: 'severe',
      impactPrivacy: 'negligible',
    },
    {
      name: 'GPS Spoofing',
      description: 'False GPS signals to mislead navigation and location services',
      targetAsset: 'Navigation Unit',
      impactSafety: 'major',
      impactFinancial: 'moderate',
      impactOperational: 'major',
      impactPrivacy: 'moderate',
    },
    {
      name: 'V2X Protocol Attack',
      description: 'Exploitation of Vehicle-to-Everything communication protocols',
      targetAsset: 'V2X Module',
      impactSafety: 'severe',
      impactFinancial: 'moderate',
      impactOperational: 'major',
      impactPrivacy: 'major',
    },
    {
      name: 'Battery Management DoS',
      description: 'Denial of service attack on EV battery management system',
      targetAsset: 'BMS Controller',
      impactSafety: 'major',
      impactFinancial: 'major',
      impactOperational: 'severe',
      impactPrivacy: 'negligible',
    },
  ];

  const treatmentOptions: ThreatScenario['treatmentDecision'][] = ['avoid', 'reduce', 'share', 'accept'];
  const reviewStatuses: ThreatScenario['reviewStatus'][] = ['pending', 'approved', 'revision-requested'];

  const scenarios: ThreatScenario[] = [];

  // Generate 100+ scenarios by combining base scenarios with variations
  for (let i = 0; i < 120; i++) {
    const base = baseScenarios[i % baseScenarios.length];
    const variation = Math.floor(i / baseScenarios.length);
    
    const feasibilityFactors = {
      time: Math.floor(Math.random() * 5),
      expertise: Math.floor(Math.random() * 5),
      knowledge: Math.floor(Math.random() * 5),
      equipment: Math.floor(Math.random() * 5),
      opportunity: Math.floor(Math.random() * 5),
    };

    const impactToNum = (level: string) => {
      const map: Record<string, number> = { negligible: 1, moderate: 2, major: 3, severe: 4 };
      return map[level] || 2;
    };

    const maxImpact = Math.max(
      impactToNum(base.impactSafety!),
      impactToNum(base.impactFinancial!),
      impactToNum(base.impactOperational!),
      impactToNum(base.impactPrivacy!)
    );

    const feasibilityTotal = Object.values(feasibilityFactors).reduce((a, b) => a + b, 0);
    const feasibilityScore = Math.ceil((feasibilityTotal / 20) * 5);
    const product = maxImpact * feasibilityScore;
    const riskValue = product <= 4 ? 1 : product <= 8 ? 2 : product <= 12 ? 3 : product <= 16 ? 4 : 5;

    const scenario: ThreatScenario = {
      id: `scenario-${String(i + 1).padStart(3, '0')}`,
      threatId: `TS-${String(i + 1).padStart(3, '0')}`,
      name: variation > 0 ? `${base.name} (Variant ${variation})` : base.name!,
      description: base.description!,
      targetAsset: base.targetAsset!,
      impactSafety: base.impactSafety!,
      impactFinancial: base.impactFinancial!,
      impactOperational: base.impactOperational!,
      impactPrivacy: base.impactPrivacy!,
      feasibilityFactors,
      feasibilityScore,
      riskValue,
      treatmentDecision: treatmentOptions[i % treatmentOptions.length],
      cybersecurityGoal: generateCybersecurityGoal(base.name!, base.targetAsset!),
      reviewStatus: reviewStatuses[i % reviewStatuses.length],
      lastModified: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    scenarios.push(scenario);
  }

  return scenarios;
};

function generateCybersecurityGoal(threatName: string, targetAsset: string): string {
  const goalTemplates = [
    `The ${targetAsset} shall be protected against ${threatName.toLowerCase()}`,
    `Unauthorized access to ${targetAsset} via ${threatName.toLowerCase()} shall be prevented`,
    `The ${targetAsset} shall detect and respond to ${threatName.toLowerCase()} attempts`,
    `Security controls shall prevent successful ${threatName.toLowerCase()} on ${targetAsset}`,
  ];
  return goalTemplates[Math.floor(Math.random() * goalTemplates.length)];
}

export const mockThreatScenarios = generateMockScenarios();
