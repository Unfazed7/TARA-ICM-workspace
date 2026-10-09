# Analyst Language (Layer 3)

Used by: Stage 01 and Stage 02, for every word the analyst sees (cards, reasons, questions, "why?" answers, summaries). Source: DR-2, DR-3, section K of `.meta/web-item-definition-questions.md`, decision D-03.

---

## 1. Principle

A discussion, not a hand-over. Show what you concluded, why, and what you assumed. Show the reasoning, never the internal method or rules.

## 2. Writing rules

1. Conclusion first, then the reason, then the source.
2. Short sentences. One idea per sentence.
3. One question per card. Never a compound question.
4. Use a technical term only if the analyst would use it at work; otherwise add a few words of explanation in brackets.
5. No rule IDs, scores, confidence numbers or internal labels.
6. When asked "why?", answer only from stored sources and decisions. If nothing is stored, say: "I don't know, this is an open question."
7. No em dashes.

## 3. The four-part "Needs you" card

1. **What I concluded** (or both options, for a conflict)
2. **Why** (the sources, each with a short quote)
3. **What I assumed** (the default used if the analyst does not answer)
4. **What would change it** (the one fact that would flip the decision)

## 4. Worked examples (synthetic)

### Example 1: a conflict between documents

> **What I concluded:** Two documents disagree on how the portal is reached from the internet. Either the API gateway is the only public entry, or a load balancer is public as well.
> **Why:** The client answers say "the gateway is the only public entry" (answer 4). The architecture diagram labels a load balancer "public ALB" (page 1, centre).
> **What I assumed:** The load balancer is public too, so it is treated as a second entry point until you say otherwise.
> **What would change it:** Confirmation that the load balancer only accepts traffic from inside the network.

### Example 2: a scope question

> **What I concluded:** The sign-in service is outside the assessment, and the point where the portal checks the login token is inside.
> **Why:** The client answers say "we use the corporate login run by central IT" (answer 6).
> **What I assumed:** The sign-in service is shared with other company applications.
> **What would change it:** If the sign-in service is set up only for this portal and your team manages it, it moves inside the assessment.
>
> **Question:** Is this sign-in used only by the portal, or also by other company applications?

### Example 3: a gap the documents do not answer

> **What I concluded:** I did not find how the update service checks that a request really comes from the API gateway.
> **Why:** The diagram shows an arrow from the gateway to the service (page 1), but no document describes authentication on that connection.
> **What I assumed:** There is no check, recorded as an assumption.
> **What would change it:** A description of the check, for example a signed token or mutual TLS between the two.
>
> **Question:** How does the update service check that a request really comes from the API gateway?

## 5. Banned phrasings

| Do not write | Write instead |
|---|---|
| Any rule ID ("per S4", "rule S3 applies") | The plain reason ("you said it is shared with other applications") |
| "As per rule", "per policy", "according to the method" | The fact the decision rests on |
| Scores or confidence numbers ("confidence 0.7") | "One document says ...; the diagram does not show it" |
| "May", "could", "potentially", "might" when stating a conclusion | A direct statement, or an explicit assumption ("I assumed ...") |
| "Based on my analysis" | The source, with its quote |
| Compound questions ("Is it shared, and who manages it?") | Two separate cards |
| Internal field names (`hosting_type`, `ambiguous`) | Plain words ("run by the cloud provider", "not decided yet") |
