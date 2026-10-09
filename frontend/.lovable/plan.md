

# Build the Unified TARA Datagrid

## Summary
Replace the current 4-tab TARA workflow (Asset List / Threats / Risk Assessment / Reports) with a single, unified high-density datagrid that consolidates the entire ISO 21434 Clause 15 flow into 7 columns. This follows an asset-first approach where each row represents a complete threat-analysis record from asset context through to treatment decision.

## What Changes

### 1. New Component: `TaraDataGrid.tsx`
A full-screen, high-density datagrid component (`bg-[#05070a]`) that replaces the existing `AssetListPanel`, `ThreatAnalysisGrid`, and `RiskAssessmentGrid` views within the TARA tab content area.

**Grid Structure -- 7 Columns:**

| Column | Header | Width | Sticky |
|--------|--------|-------|--------|
| 1. Asset Context | "Asset Context" | 240px | Yes (left) |
| 2. Impact | "Impact" | 100px | No |
| 3. Threat Description | "Threat Description" | 220px | No |
| 4. Attack Vector | "Attack Vector" | 130px | No |
| 5. Feasibility | "Feasibility" | 100px | No |
| 6. Risk | "Risk" | 80px | Yes (right) |
| 7. Treatment | "Treatment" | 130px | No |

**Column Details:**

- **Col 1 -- Asset Context (Clause 15.3):** Two lines per cell. Top line: asset name in `text-sm font-semibold text-white`. Bottom line: truncated damage scenario in `text-xs text-slate-500`. Left vertical accent bar colored by asset group.

- **Col 2 -- Impact (Clause 15.5):** A "Smart Badge" showing the highest of the 4 impact ratings (S/F/O/P) with color coding (Severe=red, Major=amber, Moderate=yellow, Negligible=gray). Clicking opens a Popover with 4 segmented controls (Safety, Financial, Operational, Privacy), each with options: Severe / Major / Moderate / Negligible.

- **Col 3 -- Threat Description (Clause 15.4):** Editable textarea (transparent bg, border on focus). Below the text, a small STRIDE tag badge (e.g., `[Spoofing]`).

- **Col 4 -- Attack Vector (Clause 15.6):** A Select badge with options: Network, Adjacent, Local, Physical. Each row has an expandable chevron that reveals a rich text area for "Attack Path Description" (step-by-step attack steps).

- **Col 5 -- Feasibility (Clause 15.7):** Colored badge (High/Medium/Low/Very Low). Clicking opens a Popover styled as "Attack Potential Calculator" with 5 vertical sliders (Elapsed Time, Expertise, Knowledge, Window of Opportunity, Equipment) each 0-4. Aggregate score updates live.

- **Col 6 -- Risk (Clause 15.8):** Read-only large colored number (1-5), auto-calculated from Impact x Feasibility. Glow effect (`shadow-[0_0_20px]`) for risk value 5.

- **Col 7 -- Treatment (Clause 15.9):** Select dropdown with options: Reduce, Avoid, Share, Retain. Selecting "Reduce" opens a Drawer for inputting a Cybersecurity Goal. Selecting "Retain" opens a Drawer for inputting a Cybersecurity Claim.

### 2. New Type: `TaraRow` interface
Extends the existing data model to unify asset, damage scenario, threat, and risk data into a single row type.

### 3. New Mock Data: `mock-tara-grid.ts`
Seed data combining assets from `mock-damage-scenarios.ts` with threat scenarios from `mock-threat-scenarios.ts`, generating ~10-15 representative rows.

### 4. Update `WorkspaceTabs.tsx`
- Replace the 4 separate `TabsContent` for asset-list/threats/risk-grid/reports with a unified layout:
  - The main content area renders `TaraDataGrid` (covers asset-list, threats, and risk-grid).
  - Keep "Reports" as a separate tab.
- Simplify the tab bar from 4 steps to 2: "TARA Analysis" and "Reports".

### 5. Sub-components within `TaraDataGrid.tsx`
- **ImpactCalculatorPopover:** Popover with 4 rows of S/F/O/P segmented controls.
- **FeasibilityCalculatorPopover:** Popover with 5 vertical sliders per ISO 21434 Table G.6.
- **TreatmentDrawer:** Vaul drawer for Cybersecurity Goal (on Reduce) or Cybersecurity Claim (on Retain).

### 6. Horizontal Scrolling
- The table container uses `overflow-x-auto` with `min-w-max` on the inner content.
- Column 1 (Asset Context) uses `sticky left-0 z-20` with a solid `bg-[#05070a]` background.
- Column 6 (Risk) uses `sticky right-0 z-20` with a solid background.

## Visual Style
- Background: `bg-[#05070a]`
- Borders: `border-white/5`
- Font: Monospace for IDs, `text-sm` for content
- Row hover: `hover:bg-white/[0.02]`
- Header: `bg-[#080c14] text-[10px] uppercase tracking-widest text-slate-500 font-mono`

## Technical Details

**Files created:**
- `src/components/workspace/TaraDataGrid.tsx` -- Main grid component with sub-components
- `src/data/mock-tara-grid.ts` -- Unified mock data

**Files modified:**
- `src/components/workspace/WorkspaceTabs.tsx` -- Simplify tabs, integrate TaraDataGrid
- `src/types/risk-assessment.ts` -- Add `TaraRow` interface and `AttackVector`/`StrideCategory`/`FeasibilityLevel` types

**Existing dependencies used:**
- `@radix-ui/react-popover` for Impact Calculator and Feasibility Calculator
- `@radix-ui/react-slider` for feasibility factor sliders
- `@radix-ui/react-select` for Attack Vector and Treatment dropdowns
- `vaul` (Drawer) for Treatment detail input
- `@radix-ui/react-tooltip` for column header tooltips
- Existing `Badge`, `Button`, `Textarea`, `Select`, `ScrollArea` UI primitives

**Key logic:**
- Risk auto-calculation reuses existing `calculateMaxImpact`, `calculateFeasibility`, `calculateRiskValue` from `src/types/risk-assessment.ts`
- Feasibility slider sum maps to High/Medium/Low/Very Low: 0-5 = Very Low, 6-10 = Low, 11-15 = Medium, 16-20 = High
- Expandable rows for Attack Path use a collapsible mechanism per row

