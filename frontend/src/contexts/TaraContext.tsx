import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ImpactLevel, AttackVector, StrideCategory, FeasibilityFactors, TreatmentDecision, getFeasibilityLevel, feasibilityLevelToNumber, impactToNumber, calculateRiskValue } from '@/types/risk-assessment';
import { loadTaraDataFromDB, saveTaraDataToDB, TaraDataSnapshot } from '@/lib/database';

// === Types ===

export type AssetType = 'data-flow' | 'data-at-rest' | 'function' | 'component' | 'interface' | 'other';

export const assetTypeOptions: { id: AssetType; label: string }[] = [
  { id: 'data-flow', label: 'Data Flow' },
  { id: 'data-at-rest', label: 'Data at Rest' },
  { id: 'function', label: 'Function' },
  { id: 'component', label: 'Component' },
  { id: 'interface', label: 'Interface' },
  { id: 'other', label: 'Other' },
];

export interface TaraAsset {
  id: string;
  assetId: string; // Auto-generated A-001 format
  name: string;
  assetType: AssetType;
  description: string;
  confidentiality: boolean;
  integrity: boolean;
  availability: boolean;
  authenticity: boolean;
  authorization: boolean;
  nonRepudiation: boolean;
  damageScenario: string;
}

export interface TaraThreat {
  id: string;
  threatId: string; // Auto-generated T-01, T-02...
  scenario: string;
  linkedAssetId: string;
  strideCategory: StrideCategory;
}

export interface TaraImpact {
  id: string;
  linkedAssetId: string;
  safety: ImpactLevel;
  financial: ImpactLevel;
  operational: ImpactLevel;
  privacy: ImpactLevel;
}

export interface TaraAttackPath {
  id: string;
  linkedThreatId: string;
  attackVector: AttackVector;
  description: string;
}

export interface TaraFeasibility {
  id: string;
  linkedAttackPathId: string;
  factors: FeasibilityFactors;
}

export interface TaraTreatment {
  id: string;
  linkedThreatId: string;
  riskValue: number;
  decision: TreatmentDecision;
  cybersecurityGoal: string;
  cybersecurityClaim: string;
  controls: string;
  postFeasibilityFactors?: FeasibilityFactors;
  residualRisk: number; // 1-5
}

interface TaraContextType {
  assets: TaraAsset[];
  threats: TaraThreat[];
  impacts: TaraImpact[];
  attackPaths: TaraAttackPath[];
  feasibilities: TaraFeasibility[];
  treatments: TaraTreatment[];
  addAsset: (asset: Omit<TaraAsset, 'id'>) => void;
  updateAsset: (id: string, updates: Partial<TaraAsset>) => void;
  removeAsset: (id: string) => void;
  addThreat: (threat: Omit<TaraThreat, 'id' | 'threatId'>) => void;
  updateThreat: (id: string, updates: Partial<TaraThreat>) => void;
  removeThreat: (id: string) => void;
  updateImpact: (assetId: string, updates: Partial<TaraImpact>) => void;
  addAttackPath: (path: Omit<TaraAttackPath, 'id'>) => void;
  updateAttackPath: (id: string, updates: Partial<TaraAttackPath>) => void;
  removeAttackPath: (id: string) => void;
  updateFeasibility: (attackPathId: string, factors: FeasibilityFactors) => void;
  updateTreatment: (threatId: string, updates: Partial<TaraTreatment>) => void;
  getImpactForAsset: (assetId: string) => TaraImpact | undefined;
  getRiskForThreat: (threatId: string) => number;
  saveProgress: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

const TaraContext = createContext<TaraContextType | null>(null);

export function useTara() {
  const ctx = useContext(TaraContext);
  if (!ctx) throw new Error('useTara must be used within TaraProvider');
  return ctx;
}

// === Seed Data ===

import { mockTaraRows } from '@/data/mock-tara-grid';

export function buildSeedData() {
  const assets: TaraAsset[] = [];
  const threats: TaraThreat[] = [];
  const impacts: TaraImpact[] = [];
  const attackPaths: TaraAttackPath[] = [];
  const feasibilities: TaraFeasibility[] = [];
  const treatments: TaraTreatment[] = [];

  const seenAssets = new Map<string, string>();
  let threatCounter = 1;

  let assetCounter = 1;

  mockTaraRows.forEach((row) => {
    // Deduplicate assets by name
    let assetId = seenAssets.get(row.assetName);
    if (!assetId) {
      assetId = `asset-${crypto.randomUUID().slice(0, 8)}`;
      seenAssets.set(row.assetName, assetId);
      const isIntegrityAsset = row.assetName === 'Low Beam Request Signal';
      assets.push({
        id: assetId,
        assetId: `A-${String(assetCounter++).padStart(3, '0')}`,
        name: row.assetName,
        assetType: isIntegrityAsset ? 'data-flow' : 'function',
        description: isIntegrityAsset
          ? 'CAN signal from BCM to Headlamp ECU requesting low beam activation'
          : 'Function controlling headlamp on/off state via BCM and Headlamp ECU',
        confidentiality: false,
        integrity: isIntegrityAsset,
        availability: !isIntegrityAsset,
        authenticity: false,
        authorization: false,
        nonRepudiation: false,
        damageScenario: row.damageScenario,
      });
      impacts.push({
        id: `imp-${assetId}`,
        linkedAssetId: assetId,
        safety: row.impactSafety,
        financial: row.impactFinancial,
        operational: row.impactOperational,
        privacy: row.impactPrivacy,
      });
    }

    const threatId = `threat-${crypto.randomUUID().slice(0, 8)}`;
    threats.push({
      id: threatId,
      threatId: `T-${String(threatCounter++).padStart(2, '0')}`,
      scenario: row.threatDescription,
      linkedAssetId: assetId,
      strideCategory: row.strideCategory,
    });

    const attackPathId = `ap-${crypto.randomUUID().slice(0, 8)}`;
    attackPaths.push({
      id: attackPathId,
      linkedThreatId: threatId,
      attackVector: row.attackVector,
      description: row.attackPathDescription,
    });

    feasibilities.push({
      id: `feas-${attackPathId}`,
      linkedAttackPathId: attackPathId,
      factors: row.feasibilityFactors,
    });

    const maxImpact = Math.max(
      impactToNumber(row.impactSafety),
      impactToNumber(row.impactFinancial),
      impactToNumber(row.impactOperational),
      impactToNumber(row.impactPrivacy)
    );
    const feasLevel = getFeasibilityLevel(row.feasibilityFactors);
    const feasNum = feasibilityLevelToNumber(feasLevel);
    const riskValue = calculateRiskValue(maxImpact, feasNum);

    treatments.push({
      id: `treat-${threatId}`,
      linkedThreatId: threatId,
      riskValue,
      decision: row.treatmentDecision,
      cybersecurityGoal: row.cybersecurityGoal,
      cybersecurityClaim: row.cybersecurityClaim,
      controls: '',
      residualRisk: Math.max(1, riskValue - 1),
    });
  });

  return { assets, threats, impacts, attackPaths, feasibilities, treatments };
}

// === Provider ===

interface TaraProviderProps {
  children: ReactNode;
  projectId?: string;
}

export function TaraProvider({ children, projectId }: TaraProviderProps) {
  const seed = buildSeedData();
  const [assets, setAssets] = useState<TaraAsset[]>(seed.assets);
  const [threats, setThreats] = useState<TaraThreat[]>(seed.threats);
  const [impacts, setImpacts] = useState<TaraImpact[]>(seed.impacts);
  const [attackPaths, setAttackPaths] = useState<TaraAttackPath[]>(seed.attackPaths);
  const [feasibilities, setFeasibilities] = useState<TaraFeasibility[]>(seed.feasibilities);
  const [treatments, setTreatments] = useState<TaraTreatment[]>(seed.treatments);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved TARA data from IndexedDB on mount
  useEffect(() => {
    if (!projectId) {
      setIsLoaded(true);
      return;
    }

    async function loadSaved() {
      try {
        const saved = await loadTaraDataFromDB(projectId!);
        if (saved) {
          setAssets(saved.assets as TaraAsset[]);
          setThreats(saved.threats as TaraThreat[]);
          setImpacts(saved.impacts as TaraImpact[]);
          setAttackPaths(saved.attackPaths as TaraAttackPath[]);
          setFeasibilities(saved.feasibilities as TaraFeasibility[]);
          setTreatments(saved.treatments as TaraTreatment[]);
        }
        // If no saved data, keep seed data
      } catch (e) {
        console.error('Failed to load TARA data from DB:', e);
      }
      setIsLoaded(true);
    }

    loadSaved();
  }, [projectId]);

  // Mark unsaved changes on any state change after initial load
  useEffect(() => {
    if (isLoaded) {
      setHasUnsavedChanges(true);
    }
  }, [assets, threats, impacts, attackPaths, feasibilities, treatments]);

  // Save progress to IndexedDB
  const saveProgress = useCallback(async () => {
    if (!projectId) return;

    setIsSaving(true);
    try {
      const snapshot: TaraDataSnapshot = {
        projectId,
        assets,
        threats,
        impacts,
        attackPaths,
        feasibilities,
        treatments,
        savedAt: new Date().toISOString(),
      };
      await saveTaraDataToDB(snapshot);
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error('Failed to save TARA data:', e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, assets, threats, impacts, attackPaths, feasibilities, treatments]);

  const addAsset = useCallback((asset: Omit<TaraAsset, 'id'>) => {
    const id = `asset-${crypto.randomUUID().slice(0, 8)}`;
    setAssets(prev => {
      const num = prev.length + 1;
      return [...prev, { ...asset, id, assetId: asset.assetId || `A-${String(num).padStart(3, '0')}` }];
    });
    setImpacts(prev => [...prev, { id: `imp-${id}`, linkedAssetId: id, safety: 'negligible', financial: 'negligible', operational: 'negligible', privacy: 'negligible' }]);
  }, []);

  const updateAsset = useCallback((id: string, updates: Partial<TaraAsset>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const removeAsset = useCallback((id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    setImpacts(prev => prev.filter(i => i.linkedAssetId !== id));
  }, []);

  const addThreat = useCallback((threat: Omit<TaraThreat, 'id' | 'threatId'>) => {
    const id = `threat-${crypto.randomUUID().slice(0, 8)}`;
    setThreats(prev => {
      const num = prev.length + 1;
      return [...prev, { ...threat, id, threatId: `T-${String(num).padStart(2, '0')}` }];
    });
    // Auto-create treatment entry
    setTreatments(prev => [...prev, { id: `treat-${id}`, linkedThreatId: id, riskValue: 1, decision: 'reduce', cybersecurityGoal: '', cybersecurityClaim: '', controls: '', residualRisk: 1 }]);
  }, []);

  const updateThreat = useCallback((id: string, updates: Partial<TaraThreat>) => {
    setThreats(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const removeThreat = useCallback((id: string) => {
    setThreats(prev => prev.filter(t => t.id !== id));
    setAttackPaths(prev => prev.filter(ap => ap.linkedThreatId !== id));
    setTreatments(prev => prev.filter(tr => tr.linkedThreatId !== id));
  }, []);

  const updateImpact = useCallback((assetId: string, updates: Partial<TaraImpact>) => {
    setImpacts(prev => prev.map(i => i.linkedAssetId === assetId ? { ...i, ...updates } : i));
  }, []);

  const addAttackPath = useCallback((path: Omit<TaraAttackPath, 'id'>) => {
    const id = `ap-${crypto.randomUUID().slice(0, 8)}`;
    setAttackPaths(prev => [...prev, { ...path, id }]);
    setFeasibilities(prev => [...prev, { id: `feas-${id}`, linkedAttackPathId: id, factors: { time: 0, expertise: 0, knowledge: 0, equipment: 0, opportunity: 0 } }]);
  }, []);

  const updateAttackPath = useCallback((id: string, updates: Partial<TaraAttackPath>) => {
    setAttackPaths(prev => prev.map(ap => ap.id === id ? { ...ap, ...updates } : ap));
  }, []);

  const removeAttackPath = useCallback((id: string) => {
    setAttackPaths(prev => prev.filter(ap => ap.id !== id));
    setFeasibilities(prev => prev.filter(f => f.linkedAttackPathId !== id));
  }, []);

  const updateFeasibility = useCallback((attackPathId: string, factors: FeasibilityFactors) => {
    setFeasibilities(prev => prev.map(f => f.linkedAttackPathId === attackPathId ? { ...f, factors } : f));
  }, []);

  const getImpactForAsset = useCallback((assetId: string) => {
    return impacts.find(i => i.linkedAssetId === assetId);
  }, [impacts]);

  const getRiskForThreat = useCallback((threatId: string) => {
    const threat = threats.find(t => t.id === threatId);
    if (!threat) return 1;
    const impact = impacts.find(i => i.linkedAssetId === threat.linkedAssetId);
    if (!impact) return 1;
    const maxImpact = Math.max(impactToNumber(impact.safety), impactToNumber(impact.financial), impactToNumber(impact.operational), impactToNumber(impact.privacy));
    const ap = attackPaths.find(a => a.linkedThreatId === threatId);
    if (!ap) return 1;
    const feas = feasibilities.find(f => f.linkedAttackPathId === ap.id);
    if (!feas) return 1;
    const feasLevel = getFeasibilityLevel(feas.factors);
    const feasNum = feasibilityLevelToNumber(feasLevel);
    return calculateRiskValue(maxImpact, feasNum);
  }, [threats, impacts, attackPaths, feasibilities]);

  const updateTreatment = useCallback((threatId: string, updates: Partial<TaraTreatment>) => {
    setTreatments(prev => prev.map(t => t.linkedThreatId === threatId ? { ...t, ...updates } : t));
  }, []);

  return (
    <TaraContext.Provider value={{
      assets, threats, impacts, attackPaths, feasibilities, treatments,
      addAsset, updateAsset, removeAsset,
      addThreat, updateThreat, removeThreat,
      updateImpact,
      addAttackPath, updateAttackPath, removeAttackPath,
      updateFeasibility, updateTreatment,
      getImpactForAsset, getRiskForThreat,
      saveProgress, isSaving, hasUnsavedChanges,
    }}>
      {children}
    </TaraContext.Provider>
  );
}
