/** The ids the screens show (D-61). The data keeps the pipeline's own ids; only what is displayed changes. */

const DASH = (prefix: string) => (id: string | null | undefined): string => {
  const m = /^[A-Z]+_(\d+)$/.exec(id ?? '');
  return m ? `${prefix}-${m[1]}` : (id ?? '');
};

/** DS_01 → DMG-01 */
export const damageCode = DASH('DMG');
/** TH_01 → THR-01 */
export const threatCode = DASH('THR');
/** AT_01 → AP-01 */
export const attackCode = DASH('AP');
/** RSK_01 → RSK-01 */
export const riskCode = DASH('RSK');
/** CG_01 → CG-01 */
export const goalCode = DASH('CG');
/** CC_01 → CC-01, CTR_07 → CTR-07: the same rule for every id with an underscore */
export const dashed = (id: string | null | undefined): string => (id ?? '').replace(/^([A-Z]+)_(\d+)$/, '$1-$2');

/** An asset is shown by its reference (WL-01), which the register carries; an uploaded list has none, so AS_01 → AS-01. */
export const assetCode = (assetRef: string | null | undefined, assetId?: string): string => assetRef || dashed(assetId);
