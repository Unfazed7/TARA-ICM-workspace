/**
 * "Add asset" on 03 Assets (D-69): a small form in the screen's own look. The analyst gives the family, the name, the
 * asset type, a description, where the asset comes from in the item definition, and ticks the properties that apply,
 * each with a short reason. Nothing here uses a model.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stagesApi } from '@/lib/stagesApi';
import type { NewAssetBody, PropertyCode } from '@/types/stages';
import { PROPS, st } from './constants';

interface Props {
  assessmentId: string;
  onClose: () => void;
  /** Saves the asset. Rejects with the server's plain message when it is refused. */
  onSave: (body: NewAssetBody) => Promise<void>;
}

const KIND_LABEL = { element: 'Elements', link: 'Connections', function: 'Functions' } as const;
const label = 'display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: #1C1B19; min-width: 0';
const field = 'width: 100%; min-height: 40px; padding: 8px 10px';

export function AddAssetForm({ assessmentId, onClose, onSave }: Props) {
  const options = useQuery({ queryKey: ['asset-options', assessmentId], queryFn: () => stagesApi.assetOptions(assessmentId) });
  const [family, setFamily] = useState('');
  const [name, setName] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [description, setDescription] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const first = useRef<HTMLSelectElement>(null);

  useEffect(() => { first.current?.focus(); }, [options.isSuccess]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const families = useMemo(() => options.data?.families ?? [], [options.data]);
  const typeLabels = families.find((f) => f.code === family)?.type_labels ?? [];
  const pickFamily = (code: string) => {
    setFamily(code);
    const labels = families.find((f) => f.code === code)?.type_labels ?? [];
    setTypeLabel(labels[0] ?? '');
  };

  const ticked = PROPS.filter((x) => ticks[x.k]);
  const problem =
    !family ? 'Choose a family.'
      : name.trim().length < 3 ? 'Give the asset a name of at least 3 characters.'
        : !typeLabel.trim() ? 'Give the asset type.'
          : description.trim().length < 10 ? 'Describe the asset in at least 10 characters.'
            : !sourceId ? 'Choose where the asset comes from.'
              : ticked.length === 0 ? 'Tick at least one property.'
                : ticked.some((x) => (reasons[x.k] ?? '').trim().length < 10) ? 'Give each ticked property a reason of at least 10 characters.'
                  : '';

  const save = async () => {
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError('');
    const properties = Object.fromEntries(PROPS.map((x) => [x.k, ticks[x.k] ? { applies: true, reason: reasons[x.k].trim() } : { applies: false }])) as NewAssetBody['properties'];
    try {
      await onSave({ family, name: name.trim(), type_label: typeLabel.trim(), description: description.trim(), source_id: sourceId, properties });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The asset could not be saved.');
      setSaving(false);
    }
  };

  return (
    <div className="addveil" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="panel addform" role="dialog" aria-modal="true" aria-labelledby="add-asset-h" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="phead">
          <span id="add-asset-h" style={st('font-size: 15px; font-weight: 600')}>Add asset</span>
          <button type="button" className="ibtn" aria-label="Close" title="Close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        {options.isLoading ? (
          <p style={st('margin: 0; padding: 20px 24px; color: #6B6A66')}>Loading...</p>
        ) : options.error ? (
          <p role="alert" style={st('margin: 0; padding: 20px 24px; color: #9F2F2D')}>{(options.error as Error).message}</p>
        ) : (
          <div className="addbody">
            <div className="addrow">
              <label style={st(label)}>Family
                <select ref={first} className="fld" value={family} onChange={(e) => pickFamily(e.target.value)} style={st(field)}>
                  <option value="">Choose a family</option>
                  {families.map((f) => <option key={f.code} value={f.code}>{f.code} · {f.name}</option>)}
                </select>
              </label>
              <label style={st(label)}>Asset type
                <input className="fld" list="add-asset-types" value={typeLabel} maxLength={60} onChange={(e) => setTypeLabel(e.target.value)} placeholder="For example: Data store" style={st(field)} />
                <datalist id="add-asset-types">{typeLabels.map((t) => <option key={t} value={t} />)}</datalist>
              </label>
            </div>
            <label style={st(label)}>Name
              <input className="fld" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="For example: Operator session records" style={st(field)} />
            </label>
            <label style={st(label)}>Description
              <textarea className="fld" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it is and what it holds or does." style={st(`${field}; resize: vertical`)} />
            </label>
            <label style={st(label)}>Comes from
              <select className="fld" value={sourceId} onChange={(e) => setSourceId(e.target.value)} style={st(field)}>
                <option value="">Choose an element, a connection or a function of the item definition</option>
                {(['element', 'link', 'function'] as const).map((kind) => (
                  <optgroup key={kind} label={KIND_LABEL[kind]}>
                    {(options.data?.sources ?? []).filter((s) => s.kind === kind).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>

            <fieldset style={st('margin: 0; padding: 0; border: 0; min-width: 0; display: flex; flex-direction: column; gap: 8px')}>
              <legend className="dlabel" style={st('padding: 0; margin-bottom: 4px')}>Cybersecurity properties</legend>
              <span style={st('font-size: 12.5px; color: #6B6A66')}>Tick each property that applies and say why in one short sentence. Do not write ids in a reason.</span>
              {PROPS.map((x) => {
                const on = Boolean(ticks[x.k]);
                return (
                  <div key={x.k} className="addprop">
                    <button
                      type="button" role="checkbox" aria-checked={on} aria-label={x.name} className={on ? 'split on addtick' : 'split addtick'}
                      onClick={() => setTicks((t) => ({ ...t, [x.k]: !on }))}
                      style={st(`--pc: ${x.t}; --ph: ${x.h}; ` + (on
                        ? `background: ${x.h}; color: ${x.t}; box-shadow: inset 0 0 0 1.5px ${x.t}, 0 0 0 3px color-mix(in srgb, ${x.t} 12%, transparent)`
                        : 'background: #F3F1EC; color: #7A776F; box-shadow: inset 0 0 0 1px #C9C4B9'))}
                    >
                      <span className="mono" style={st('font-weight: 600')}>{x.k}</span>
                    </button>
                    <span style={st('display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1 1 auto')}>
                      <span style={st(`font-size: 13.5px; font-weight: ${on ? 600 : 400}; color: ${on ? '#1C1B19' : '#5F5E5B'}`)}>{x.name}</span>
                      {on && (
                        <input className="fld" aria-label={`Why ${x.name} applies`} value={reasons[x.k] ?? ''} maxLength={500} onChange={(e) => setReasons((r) => ({ ...r, [x.k]: e.target.value }))} placeholder="Why it applies" style={st('width: 100%; min-height: 36px; padding: 6px 10px; background: #FFFFFF')} />
                      )}
                    </span>
                  </div>
                );
              })}
            </fieldset>
          </div>
        )}

        <div className="addfoot">
          <span role="alert" style={st('flex: 1 1 200px; min-width: 0; font-size: 13px; color: #9F2F2D')}>{error}</span>
          <span style={st('display: flex; gap: 8px')}>
            <button type="button" className="btn btn-line btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-dark btn-sm" disabled={saving || !options.data}>{saving ? 'Saving...' : 'Add asset'}</button>
          </span>
        </div>
      </form>
    </div>
  );
}
