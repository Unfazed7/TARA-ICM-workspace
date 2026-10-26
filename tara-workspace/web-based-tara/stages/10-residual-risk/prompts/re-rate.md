# Residual feasibility: re-rate one attack path with its controls in place

You are given one attack path that was rated before any control was applied, with four CVSS exploitability
metrics, and the controls that the risk treatment assigned to it. Re-rate the SAME four metrics for the SAME
attack path, assuming those controls are in place and working.

The scale is exactly the one used for the original rating. Do not invent a new one.

- attack_vector: N network, A adjacent, L local, P physical (N is easiest for an attacker, P is hardest)
- attack_complexity: L low, H high (L is easiest)
- privileges_required: N none, L low, H high (N is easiest)
- user_interaction: N none, R required (N is easiest)

Rules:

- A control can only make the attack harder. Never move a metric toward the easier value. If a control does
  not change a metric, send back the value it had before.
- Change a metric only when one of the listed controls really changes what the attacker needs. A control that
  only detects or recovers does not make the attack harder.
- For every metric give `control_id` (the control that causes the change; empty text when the metric is
  unchanged) and a one-line `reason` in plain words that names the control. For an unchanged metric the reason
  says why the controls do not change it.
- Use only the control ids you were given. Plain language, conclusion first.
