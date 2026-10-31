/**
 * The colour ramps of the designs (.meta/design/04-06). Four steps for the impact levels; the TARA design adds a middle step
 * for its five risk levels, and the pipeline's attack feasibility has five levels too, so those use the five-step ramp.
 */

export const OUT = ['#A9CFA0', '#EDC54A', '#EE8F66', '#DD5A63'];
export const TINT = [['#E5F2E0', '#2F6B2A'], ['#FFF5D3', '#6B4E00'], ['#FFE7DD', '#B4441B'], ['#FDE3E3', '#A61B26']];
/** Text on the solid fills is dark on green, yellow, orange and orange-red, white on crimson: the design's white on green (2.3:1) and on orange-red (3.4:1) was too faint. */
export const SOLID = [['#7FB874', '#16331A'], ['#F2C53D', '#3D2E00'], ['#E8613C', '#2B0F05'], ['#A3172B', '#FFFFFF']];

/** The design's risk ramp: one step more between yellow and orange (Tara.dc.html RISK and ROUT). */
export const RISK = [['#7FB874', '#16331A'], ['#F2C53D', '#3D2E00'], ['#F09A3E', '#3D2300'], ['#E8613C', '#2B0F05'], ['#A3172B', '#FFFFFF']];
export const ROUT = ['#A9CFA0', '#EDC54A', '#F2B26E', '#EE8F66', '#DD5A63'];
/** Tinted cells of the five-step ramp: the design's four, with a pale orange for the middle step. */
export const TINT5 = [TINT[0], TINT[1], ['#FDEBD3', '#7A4400'], TINT[2], TINT[3]];

export const NEUTRAL = 'background: #FFFFFF; color: #2F2E2B; box-shadow: inset 0 0 0 1px #DCD8CF';
