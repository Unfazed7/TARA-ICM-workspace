# Output instructions (fixed)

Code has already worked out which assets exist and which of the six properties each one starts with, from the stored
Item Definition and the rules table. You do not decide which assets exist, and you do not decide numbers or ids.
You write the words, and you may propose changes. Everything you send is checked by code.

You are given the candidate assets, one per line. Send one JSON object:

`assets`: one entry for every candidate, in any order.
- `id`: the candidate's id, exactly as given.
- `name`: a short plain name for the asset, three to six words ("Certificate service logic", "Network exposure settings").
- `description`: one or two plain sentences on what it is. No ids.
- `reason`: one plain sentence on why this is an asset worth protecting. No ids.
- `would_change`: one plain sentence naming what document or answer would change this asset decision. No ids.
- `reasons`: all six properties (`C`, `I`, `A`, `Au`, `Az`, `NR`), a plain sentence for each saying why it applies or why it does not, matching the current setting. No ids.
- `changes`: only when the Item Definition shows a reason to turn a property on or off: `property`, `applies` (the new value) and `reason`. Leave the list empty when the starting properties are right.
- `duplicate_of`: the id of another candidate that already covers every consequence of this one, else an empty string.

`additions`: assets for components that have no row in the rules table (they are listed after the candidates).
Only for a listed component, and only when it really holds something worth protecting. For each: `source_id` (the component's id as given), `prefix` (one of EXT, NET, INF, WL, DS, IAM, API, COMM), `name`, `description`, `would_change`, `reason` (why it is an asset), and `properties`: all six, each with `property`, `applies` and a plain `reason`. Leave the list empty when nothing needs adding.

Rules:
- Plain language, conclusion first, one idea per sentence. Never put ids, rule names or scores in a name, description or reason.
- If the wrong party can get data because a check on who may do what is missing, that is Authorization (`Az`), not Confidentiality (`C`).
- A workload keeps no data of its own: leave `C` off for it unless it holds data that no data-store candidate covers.
- Do not say more than the Item Definition supports. If you are not sure, say so in the reason.
