import { useState, useCallback, useRef, useEffect } from 'react';
import { StreamColumn, StreamItem, StreamEmpty } from './StreamColumn';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  mockFeatures,
  mockFunctions,
  mockAbuseCases,
  mockDamageScenarios,
  mockThreats,
  mockCiaaan,
  mockThreatAssets,
  mockAssociatedECUs,
  strideCategories,
  impactAreas,
  ecuTypes,
  assetCategories,
  type AbuseCase,
  type FeatureFunction,
  type DamageScenarioItem,
  type ThreatItem,
  type CiaaanItem,
  type ThreatAsset,
  type AssociatedECU,
} from '@/data/mock-threat-stream';

/* ── Connection Lines ── */
function ConnectionLines({ containerRef, selections }: {
  containerRef: React.RefObject<HTMLDivElement>;
  selections: (string | null)[];
}) {
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    const calc = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPaths: string[] = [];
      for (let i = 0; i < selections.length - 1; i++) {
        const id = selections[i];
        const nextId = selections[i + 1];
        if (!id || !nextId) break;
        const el = containerRef.current.querySelector(`[data-id="${id}"]`);
        const nextEl = containerRef.current.querySelector(`[data-id="${nextId}"]`);
        if (!el || !nextEl) break;
        const r1 = el.getBoundingClientRect();
        const r2 = nextEl.getBoundingClientRect();
        const x1 = r1.right - rect.left;
        const y1 = r1.top + r1.height / 2 - rect.top;
        const x2 = r2.left - rect.left;
        const y2 = r2.top + r2.height / 2 - rect.top;
        const dx = (x2 - x1) * 0.5;
        newPaths.push(`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
      }
      setPaths(newPaths);
    };
    calc();
    const t = setTimeout(calc, 100);
    return () => clearTimeout(t);
  }, [selections, containerRef]);

  if (paths.length === 0) return null;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
      <defs>
        <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(6,182,212,0.4)" />
          <stop offset="100%" stopColor="rgba(6,182,212,0.1)" />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="url(#line-grad)" strokeWidth="1.5" strokeDasharray="4 4" />
      ))}
    </svg>
  );
}

/* ── CIAAAN Display ── */
function CiaaanDisplay({ item }: { item: CiaaanItem }) {
  const props = [
    { key: 'C', val: item.confidentiality },
    { key: 'I', val: item.integrity },
    { key: 'A', val: item.availability },
    { key: 'Au', val: item.authenticity },
    { key: 'Az', val: item.authorization },
    { key: 'NR', val: item.nonRepudiation },
  ];
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {props.map((p) => (
        <span
          key={p.key}
          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
            p.val
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'bg-muted/30 text-muted-foreground/40 border border-transparent'
          }`}
        >
          {p.key}
        </span>
      ))}
    </div>
  );
}

/* ── Main Component ── */
export function FeatureAnalysis() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [selectedAbuseCase, setSelectedAbuseCase] = useState<string | null>(null);
  const [selectedDamage, setSelectedDamage] = useState<string | null>(null);
  const [selectedThreat, setSelectedThreat] = useState<string | null>(null);
  const [selectedCiaaan, setSelectedCiaaan] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const [functions, setFunctions] = useState<FeatureFunction[]>(mockFunctions);
  const [abuseCases, setAbuseCases] = useState<AbuseCase[]>(mockAbuseCases);
  const [damages, setDamages] = useState<DamageScenarioItem[]>(mockDamageScenarios);
  const [threats, setThreats] = useState<ThreatItem[]>(mockThreats);
  const [ciaaanItems, setCiaaanItems] = useState<CiaaanItem[]>(mockCiaaan);
  const [assets, setAssets] = useState<ThreatAsset[]>(mockThreatAssets);
  const [ecus, setEcus] = useState<AssociatedECU[]>(mockAssociatedECUs);

  const filteredFunctions = functions.filter((f) => f.featureId === selectedFeature);
  const filteredAbuseCases = abuseCases.filter((a) => a.functionId === selectedFunction);
  const filteredDamages = damages.filter((d) => d.abuseCaseId === selectedAbuseCase);
  const filteredThreats = threats.filter((t) => t.damageId === selectedDamage);
  const filteredCiaaan = ciaaanItems.filter((c) => c.threatId === selectedThreat);
  const filteredAssets = assets.filter((a) => a.ciaaanId === selectedCiaaan);
  const filteredEcus = ecus.filter((e) => e.assetId === selectedAsset);

  const clearFrom = (level: number) => {
    if (level <= 1) setSelectedFunction(null);
    if (level <= 2) setSelectedAbuseCase(null);
    if (level <= 3) setSelectedDamage(null);
    if (level <= 4) setSelectedThreat(null);
    if (level <= 5) setSelectedCiaaan(null);
    if (level <= 6) setSelectedAsset(null);
  };

  const selectFeature = useCallback((id: string) => { setSelectedFeature(id); clearFrom(1); }, []);
  const selectFunction = useCallback((id: string) => { setSelectedFunction(id); clearFrom(2); }, []);
  const selectAbuseCase = useCallback((id: string) => { setSelectedAbuseCase(id); clearFrom(3); }, []);
  const selectDamage = useCallback((id: string) => { setSelectedDamage(id); clearFrom(4); }, []);
  const selectThreat = useCallback((id: string) => { setSelectedThreat(id); clearFrom(5); }, []);
  const selectCiaaan = useCallback((id: string) => { setSelectedCiaaan(id); clearFrom(6); }, []);
  const selectAsset = useCallback((id: string) => { setSelectedAsset(id); }, []);

  const handleAddFunction = useCallback(() => {
    if (!selectedFeature) return;
    const id = `fn-${Date.now()}`;
    setFunctions((p) => [...p, { id, featureId: selectedFeature, name: 'New Function', description: '' }]);
    selectFunction(id);
  }, [selectedFeature]);

  const handleAddAbuseCase = useCallback(() => {
    if (!selectedFunction) return;
    const id = `ac-${Date.now()}`;
    setAbuseCases((p) => [...p, { id, functionId: selectedFunction, name: 'New Abuse Case', description: '', stride: 'Spoofing' }]);
    selectAbuseCase(id);
  }, [selectedFunction]);

  const handleAddDamage = useCallback(() => {
    if (!selectedAbuseCase) return;
    const id = `dmg-${Date.now()}`;
    setDamages((p) => [...p, { id, abuseCaseId: selectedAbuseCase, name: 'New Damage Scenario', description: '', impactArea: 'Safety' }]);
    selectDamage(id);
  }, [selectedAbuseCase]);

  const handleAddThreat = useCallback(() => {
    if (!selectedDamage) return;
    const id = `th-${Date.now()}`;
    setThreats((p) => [...p, { id, damageId: selectedDamage, name: 'New Threat', description: '', attackVector: '' }]);
    selectThreat(id);
  }, [selectedDamage]);

  const handleAddCiaaan = useCallback(() => {
    if (!selectedThreat) return;
    const id = `ci-${Date.now()}`;
    setCiaaanItems((p) => [...p, { id, threatId: selectedThreat, confidentiality: false, integrity: false, availability: false, authenticity: false, authorization: false, nonRepudiation: false }]);
    selectCiaaan(id);
  }, [selectedThreat]);

  const handleAddAsset = useCallback(() => {
    if (!selectedCiaaan) return;
    const id = `ta-${Date.now()}`;
    setAssets((p) => [...p, { id, ciaaanId: selectedCiaaan, name: 'New Asset', category: 'data' }]);
    selectAsset(id);
  }, [selectedCiaaan]);

  const handleAddEcu = useCallback(() => {
    if (!selectedAsset) return;
    const id = `ecu-${Date.now()}`;
    setEcus((p) => [...p, { id, assetId: selectedAsset, name: 'New ECU', type: 'ECU' }]);
  }, [selectedAsset]);

  const handleUpdateStride = useCallback((id: string, stride: AbuseCase['stride']) => {
    setAbuseCases((p) => p.map((a) => (a.id === id ? { ...a, stride } : a)));
  }, []);

  const handleUpdateImpact = useCallback((id: string, impactArea: DamageScenarioItem['impactArea']) => {
    setDamages((p) => p.map((d) => (d.id === id ? { ...d, impactArea } : d)));
  }, []);

  const handleUpdateEcuType = useCallback((id: string, type: AssociatedECU['type']) => {
    setEcus((p) => p.map((e) => (e.id === id ? { ...e, type } : e)));
  }, []);

  const handleToggleCiaaan = useCallback((id: string, prop: string) => {
    setCiaaanItems((p) => p.map((c) => (c.id === id ? { ...c, [prop]: !(c as any)[prop] } : c)));
  }, []);

  const selections = [selectedFeature, selectedFunction, selectedAbuseCase, selectedDamage, selectedThreat, selectedCiaaan, selectedAsset];
  const firstEcu = filteredEcus[0]?.id ?? null;
  const lineSelections = [...selections, firstEcu];

  return (
    <div ref={containerRef} className="h-full flex relative overflow-x-auto">
      <ConnectionLines containerRef={containerRef} selections={lineSelections} />

      {/* 1: Features */}
      <div className="min-w-[220px] w-[12.5%] h-full relative z-20">
        <StreamColumn stepNumber={1} title="Features" emptyMessage="" onAdd={() => {}} addLabel="Add Feature">
          {mockFeatures.map((f) => (
            <StreamItem key={f.id} id={f.id} isSelected={selectedFeature === f.id} onClick={() => selectFeature(f.id)}>
              <div className="text-xs font-medium">{f.name}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{f.description}</div>
            </StreamItem>
          ))}
        </StreamColumn>
      </div>

      {/* 2: Functions */}
      <div className="min-w-[220px] w-[12.5%] h-full relative z-20">
        <StreamColumn stepNumber={2} title="Functions"
          subtitle={selectedFeature ? <span className="text-cyan-400/80">{mockFeatures.find((f) => f.id === selectedFeature)?.name}</span> : undefined}
          emptyMessage="Select a Feature" onAdd={selectedFeature ? handleAddFunction : undefined} addLabel="Add Function">
          {!selectedFeature ? <StreamEmpty message="Select a Feature" /> : filteredFunctions.length === 0 ? <StreamEmpty message="No functions defined" /> : (
            filteredFunctions.map((fn) => (
              <StreamItem key={fn.id} id={fn.id} isSelected={selectedFunction === fn.id} onClick={() => selectFunction(fn.id)}>
                <div className="text-xs font-medium">{fn.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{fn.description}</div>
              </StreamItem>
            ))
          )}
        </StreamColumn>
      </div>

      {/* 3: Abuse Cases */}
      <div className="min-w-[220px] w-[12.5%] h-full relative z-20">
        <StreamColumn stepNumber={3} title="Abuse Cases"
          subtitle={selectedFunction ? <span className="text-cyan-400/80">{functions.find((f) => f.id === selectedFunction)?.name}</span> : undefined}
          emptyMessage="Select a Function" onAdd={selectedFunction ? handleAddAbuseCase : undefined} addLabel="Add Abuse Case">
          {!selectedFunction ? <StreamEmpty message="Select a Function" /> : filteredAbuseCases.length === 0 ? <StreamEmpty message="No abuse cases" /> : (
            filteredAbuseCases.map((ac) => (
              <StreamItem key={ac.id} id={ac.id} isSelected={selectedAbuseCase === ac.id} onClick={() => selectAbuseCase(ac.id)}>
                <div className="text-xs font-medium">{ac.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{ac.description}</div>
                <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                  <Select value={ac.stride} onValueChange={(val) => handleUpdateStride(ac.id, val as AbuseCase['stride'])}>
                    <SelectTrigger className="h-6 bg-background/5 border-border/10 text-[9px] text-muted-foreground w-full">
                      <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-400 px-1.5 py-0">
                        STRIDE: <SelectValue />
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {strideCategories.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </StreamItem>
            ))
          )}
        </StreamColumn>
      </div>

      {/* 4: Damage */}
      <div className="min-w-[220px] w-[12.5%] h-full relative z-20">
        <StreamColumn stepNumber={4} title="Damage"
          subtitle={selectedAbuseCase ? <span className="text-cyan-400/80">{abuseCases.find((a) => a.id === selectedAbuseCase)?.name}</span> : undefined}
          emptyMessage="Select an Abuse Case" onAdd={selectedAbuseCase ? handleAddDamage : undefined} addLabel="Add Damage">
          {!selectedAbuseCase ? <StreamEmpty message="Select an Abuse Case" /> : filteredDamages.length === 0 ? <StreamEmpty message="No damage scenarios" /> : (
            filteredDamages.map((dmg) => (
              <StreamItem key={dmg.id} id={dmg.id} isSelected={selectedDamage === dmg.id} onClick={() => selectDamage(dmg.id)}>
                <div className="text-xs font-medium">{dmg.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{dmg.description}</div>
                <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                  <Select value={dmg.impactArea} onValueChange={(val) => handleUpdateImpact(dmg.id, val as DamageScenarioItem['impactArea'])}>
                    <SelectTrigger className="h-6 bg-background/5 border-border/10 text-[9px] text-muted-foreground w-full">
                      <Badge variant="outline" className="text-[9px] border-red-500/40 text-red-400 px-1.5 py-0">
                        Impact: <SelectValue />
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {impactAreas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </StreamItem>
            ))
          )}
        </StreamColumn>
      </div>

      {/* 5: Threats */}
      <div className="min-w-[220px] w-[12.5%] h-full relative z-20">
        <StreamColumn stepNumber={5} title="Threats"
          subtitle={selectedDamage ? <span className="text-cyan-400/80">{damages.find((d) => d.id === selectedDamage)?.name}</span> : undefined}
          emptyMessage="Select a Damage Scenario" onAdd={selectedDamage ? handleAddThreat : undefined} addLabel="Add Threat">
          {!selectedDamage ? <StreamEmpty message="Select a Damage Scenario" /> : filteredThreats.length === 0 ? <StreamEmpty message="No threats defined" /> : (
            filteredThreats.map((th) => (
              <StreamItem key={th.id} id={th.id} isSelected={selectedThreat === th.id} onClick={() => selectThreat(th.id)}>
                <div className="text-xs font-medium">{th.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{th.description}</div>
                {th.attackVector && (
                  <Badge variant="outline" className="text-[9px] border-purple-500/40 text-purple-400 mt-1 px-1.5 py-0">
                    {th.attackVector}
                  </Badge>
                )}
              </StreamItem>
            ))
          )}
        </StreamColumn>
      </div>

      {/* 6: CIAAAN */}
      <div className="min-w-[220px] w-[12.5%] h-full relative z-20">
        <StreamColumn stepNumber={6} title="CIAAAN"
          subtitle={selectedThreat ? <span className="text-cyan-400/80">{threats.find((t) => t.id === selectedThreat)?.name}</span> : undefined}
          emptyMessage="Select a Threat" onAdd={selectedThreat ? handleAddCiaaan : undefined} addLabel="Add CIAAAN">
          {!selectedThreat ? <StreamEmpty message="Select a Threat" /> : filteredCiaaan.length === 0 ? <StreamEmpty message="No CIAAAN defined" /> : (
            filteredCiaaan.map((ci) => (
              <StreamItem key={ci.id} id={ci.id} isSelected={selectedCiaaan === ci.id} onClick={() => selectCiaaan(ci.id)}>
                <div className="text-[10px] text-muted-foreground mb-1">Security Properties</div>
                <CiaaanDisplay item={ci} />
                <div className="flex flex-wrap gap-1 mt-2">
                  {(['confidentiality', 'integrity', 'availability', 'authenticity', 'authorization', 'nonRepudiation'] as const).map((prop) => (
                    <button key={prop} onClick={(e) => { e.stopPropagation(); handleToggleCiaaan(ci.id, prop); }}
                      className={`text-[8px] px-1 py-0.5 rounded border transition-all ${
                        ci[prop] ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-border/20 text-muted-foreground/50 hover:border-border/40'
                      }`}>
                      {prop === 'nonRepudiation' ? 'NR' : prop.charAt(0).toUpperCase() + prop.slice(1, 4)}
                    </button>
                  ))}
                </div>
              </StreamItem>
            ))
          )}
        </StreamColumn>
      </div>

      {/* 7: Assets */}
      <div className="min-w-[220px] w-[12.5%] h-full relative z-20">
        <StreamColumn stepNumber={7} title="Assets"
          subtitle={selectedCiaaan ? <span className="text-cyan-400/80">CIAAAN Profile</span> : undefined}
          emptyMessage="Select a CIAAAN" onAdd={selectedCiaaan ? handleAddAsset : undefined} addLabel="Add Asset">
          {!selectedCiaaan ? <StreamEmpty message="Select a CIAAAN profile" /> : filteredAssets.length === 0 ? <StreamEmpty message="No assets defined" /> : (
            filteredAssets.map((asset) => (
              <StreamItem key={asset.id} id={asset.id} isSelected={selectedAsset === asset.id} onClick={() => selectAsset(asset.id)}>
                <div className="text-xs font-medium">{asset.name}</div>
                <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400 mt-1 px-1.5 py-0">
                  {assetCategories.find((c) => c.value === asset.category)?.label}
                </Badge>
              </StreamItem>
            ))
          )}
        </StreamColumn>
      </div>

      {/* 8: Associated ECU */}
      <div className="min-w-[220px] w-[12.5%] h-full relative z-20">
        <StreamColumn stepNumber={8} title="Associated ECU" isLast
          subtitle={selectedAsset ? <span className="text-cyan-400/80">{assets.find((a) => a.id === selectedAsset)?.name}</span> : undefined}
          emptyMessage="Select an Asset" onAdd={selectedAsset ? handleAddEcu : undefined} addLabel="Add ECU">
          {!selectedAsset ? <StreamEmpty message="Select an Asset" /> : filteredEcus.length === 0 ? <StreamEmpty message="No ECUs linked" /> : (
            filteredEcus.map((ecu) => (
              <StreamItem key={ecu.id} id={ecu.id} isSelected={false} onClick={() => {}}>
                <div className="text-xs font-medium">{ecu.name}</div>
                <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                  <Select value={ecu.type} onValueChange={(val) => handleUpdateEcuType(ecu.id, val as AssociatedECU['type'])}>
                    <SelectTrigger className="h-6 bg-background/5 border-border/10 text-[9px] text-muted-foreground w-full">
                      <Badge variant="outline" className="text-[9px] border-blue-500/40 text-blue-400 px-1.5 py-0">
                        Type: <SelectValue />
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {ecuTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </StreamItem>
            ))
          )}
        </StreamColumn>
      </div>
    </div>
  );
}
