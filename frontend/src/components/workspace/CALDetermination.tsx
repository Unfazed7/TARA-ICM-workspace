import { useTara } from '@/contexts/TaraContext';
import { impactToNumber } from '@/types/risk-assessment';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertTriangle, Info } from 'lucide-react';

// ─── CAL Matrix Lookup (ISO/SAE 21434 Table E.1) ─────────────────────
// Impact levels: Negligible=0, Moderate=1, Major=2, Severe=3
// Attack vectors: Physical=0, Local=1, Adjacent=2, Network=3

type CALValue = 'CAL1' | 'CAL2' | 'CAL3' | 'CAL4' | '---';

const CAL_MATRIX: CALValue[][] = [
  // Physical   Local     Adjacent   Network
  ['---', '---', '---', '---'],      // Negligible (0)
  ['CAL1', 'CAL1', 'CAL2', 'CAL3'],     // Moderate   (1)
  ['CAL1', 'CAL2', 'CAL3', 'CAL4'],     // Major      (2)
  ['CAL2', 'CAL3', 'CAL4', 'CAL4'],     // Severe     (3)
];

const IMPACT_LABELS = ['Negligible', 'Moderate', 'Major', 'Severe'];
const VECTOR_LABELS = ['Physical', 'Local', 'Adjacent', 'Network'];

function vectorToIndex(v: string): number {
  switch (v.toLowerCase()) {
    case 'physical': return 0;
    case 'local': return 1;
    case 'adjacent': return 2;
    case 'network': return 3;
    default: return 3;
  }
}

function calColor(cal: CALValue): string {
  switch (cal) {
    case 'CAL4': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'CAL3': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'CAL2': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'CAL1': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
  }
}

function calDescription(cal: CALValue): string {
  switch (cal) {
    case 'CAL4': return 'Highest assurance — stringent cybersecurity measures required';
    case 'CAL3': return 'High assurance — robust cybersecurity process recommended';
    case 'CAL2': return 'Medium assurance — standard cybersecurity process applicable';
    case 'CAL1': return 'Low assurance — basic cybersecurity measures sufficient';
    default: return 'No cybersecurity assurance level applicable';
  }
}

export function CALDetermination() {
  const { assets, impacts, threats, attackPaths } = useTara();

  // ─── Compute per-asset CAL ──────────────────────────────────────────
  const assetCALData = assets.map(asset => {
    // Get impact for this asset
    const impact = impacts.find(i => i.linkedAssetId === asset.id);
    // impactToNumber returns 1-4 (negligible=1..severe=4), CAL matrix uses 0-3
    const maxImpactRaw = impact
      ? Math.max(
        impactToNumber(impact.safety),
        impactToNumber(impact.financial),
        impactToNumber(impact.operational),
        impactToNumber(impact.privacy),
      )
      : 1;
    const maxImpactNum = maxImpactRaw - 1; // 0=negligible, 3=severe

    // Get all attack vectors linked to this asset (via threats → attack paths)
    const assetThreats = threats.filter(t => t.linkedAssetId === asset.id);
    const assetAttackPaths = attackPaths.filter(ap =>
      assetThreats.some(t => t.id === ap.linkedThreatId)
    );

    // The highest attack vector determines the CAL
    let maxVectorIdx = -1;
    const vectors: string[] = [];
    for (const ap of assetAttackPaths) {
      const idx = vectorToIndex(ap.attackVector);
      vectors.push(ap.attackVector);
      if (idx > maxVectorIdx) maxVectorIdx = idx;
    }

    // If no attack paths, cannot determine CAL
    if (maxVectorIdx < 0 || maxImpactNum === 0) {
      return {
        asset,
        impactLevel: IMPACT_LABELS[maxImpactNum] || 'Negligible',
        impactIdx: maxImpactNum,
        vectors: vectors.length > 0 ? [...new Set(vectors)] : [],
        maxVectorLabel: vectors.length > 0 ? VECTOR_LABELS[maxVectorIdx] : '—',
        maxVectorIdx,
        cal: '---' as CALValue,
      };
    }

    const cal = CAL_MATRIX[maxImpactNum][maxVectorIdx];

    return {
      asset,
      impactLevel: IMPACT_LABELS[maxImpactNum],
      impactIdx: maxImpactNum,
      vectors: [...new Set(vectors)],
      maxVectorLabel: VECTOR_LABELS[maxVectorIdx],
      maxVectorIdx,
      cal,
    };
  });

  // Overall project CAL = highest CAL across all assets
  const allCALs: CALValue[] = assetCALData.map(d => d.cal).filter((c): c is Exclude<CALValue, '---'> => c !== '---');
  const overallCAL: CALValue = allCALs.length > 0
    ? (['CAL4', 'CAL3', 'CAL2', 'CAL1'] as const).find(c => allCALs.includes(c)) || '---'
    : '---';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#05070a]">
      {/* Header */}
      <div className="px-6 py-4 shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              Cybersecurity Assurance Level (CAL)
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono uppercase tracking-widest">
              ISO/SAE 21434 Annex E — Table E.1 — Auto-calculated from Impact Analysis × Attack Vectors
            </p>
          </div>
          <div className={cn('px-4 py-2 rounded-xl border text-lg font-bold font-mono', calColor(overallCAL))}>
            Project CAL: {overallCAL}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 px-6 pb-4 pt-4 overflow-hidden min-h-0">
        {/* Left — Reference Matrix */}
        <div className="w-[360px] shrink-0 flex flex-col gap-4 overflow-auto">
          <div className="rounded-xl border border-white/5 bg-card/10 backdrop-blur-sm p-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" />
              CAL Reference Matrix
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1.5 text-[10px] text-slate-500 font-mono uppercase">Impact</th>
                  {VECTOR_LABELS.map(v => (
                    <th key={v} className="px-2 py-1.5 text-center text-[10px] text-slate-500 font-mono uppercase">{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[3, 2, 1, 0].map(impIdx => (
                  <tr key={impIdx} className="border-t border-white/5">
                    <td className="px-2 py-1.5 font-medium text-slate-300">{IMPACT_LABELS[impIdx]}</td>
                    {[0, 1, 2, 3].map(vecIdx => {
                      const val = CAL_MATRIX[impIdx][vecIdx];
                      return (
                        <td key={vecIdx} className="px-2 py-1.5 text-center">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border',
                            calColor(val)
                          )}>
                            {val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-slate-600 mt-3 italic">
              Attack vector is a static parameter of attack feasibility. See [PM-06-08].
            </p>
          </div>

          {/* CAL Legend */}
          <div className="rounded-xl border border-white/5 bg-card/10 backdrop-blur-sm p-4 space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">CAL Rigour Levels</h2>
            {(['CAL4', 'CAL3', 'CAL2', 'CAL1'] as CALValue[]).map(cal => (
              <div key={cal} className={cn('flex items-start gap-2 px-3 py-2 rounded-lg border', calColor(cal))}>
                <span className="font-mono font-bold text-xs shrink-0 mt-0.5">{cal}</span>
                <span className="text-[11px] opacity-80">{calDescription(cal)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Per-asset CAL results */}
        <div className="flex-1 min-w-0 overflow-auto">
          <div className="rounded-xl border border-white/5 bg-card/10 backdrop-blur-sm h-full flex flex-col">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400">Per-Asset CAL Assignment</h2>
              <span className="text-[10px] text-slate-600 font-mono">{assets.length} assets</span>
            </div>

            {assets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <AlertTriangle className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm text-slate-400">No assets defined yet</p>
                <p className="text-xs text-slate-600 mt-1">Add assets in the Asset Analysis tab, then define impacts and attack paths.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#080c14] z-10">
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-2.5 text-[10px] text-slate-500 font-mono uppercase tracking-widest">Asset ID</th>
                      <th className="text-left px-4 py-2.5 text-[10px] text-slate-500 font-mono uppercase tracking-widest">Asset Name</th>
                      <th className="text-center px-4 py-2.5 text-[10px] text-slate-500 font-mono uppercase tracking-widest">CIAAAN</th>
                      <th className="text-center px-4 py-2.5 text-[10px] text-slate-500 font-mono uppercase tracking-widest">Max Impact</th>
                      <th className="text-center px-4 py-2.5 text-[10px] text-slate-500 font-mono uppercase tracking-widest">Attack Vectors</th>
                      <th className="text-center px-4 py-2.5 text-[10px] text-slate-500 font-mono uppercase tracking-widest">Max Vector</th>
                      <th className="text-center px-4 py-2.5 text-[10px] text-slate-500 font-mono uppercase tracking-widest w-[100px]">CAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetCALData.map(row => (
                      <tr key={row.asset.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-primary/70">{row.asset.assetId}</td>
                        <td className="px-4 py-3 text-sm">{row.asset.name}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            {[
                              { label: 'C', value: row.asset.confidentiality, title: 'Confidentiality' },
                              { label: 'I', value: row.asset.integrity, title: 'Integrity' },
                              { label: 'A', value: row.asset.availability, title: 'Availability' },
                              { label: 'A', value: row.asset.authenticity, title: 'Authenticity' },
                              { label: 'A', value: row.asset.authorization, title: 'Authorization' },
                              { label: 'N', value: row.asset.nonRepudiation, title: 'Non-Repudiation' },
                            ].map((prop, i) => (
                              <div
                                key={i}
                                title={prop.title}
                                className={cn(
                                  "w-5 h-5 flex items-center justify-center rounded text-[10px] font-mono font-bold transition-colors cursor-help",
                                  prop.value
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : "bg-white/5 text-slate-600 border border-transparent"
                                )}
                              >
                                {prop.label}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'px-2 py-0.5 rounded-md text-xs font-medium',
                            row.impactIdx >= 3 ? 'bg-red-500/10 text-red-400' :
                              row.impactIdx >= 2 ? 'bg-orange-500/10 text-orange-400' :
                                row.impactIdx >= 1 ? 'bg-yellow-500/10 text-yellow-400' :
                                  'bg-slate-500/10 text-slate-400'
                          )}>
                            {row.impactLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.vectors.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {row.vectors.map((v, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-slate-500/10 text-[10px] font-mono text-slate-400 capitalize">
                                  {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600 italic">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-mono text-slate-300">{row.maxVectorLabel}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'inline-block px-3 py-1 rounded-lg border font-mono font-bold text-sm',
                            calColor(row.cal)
                          )}>
                            {row.cal}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
