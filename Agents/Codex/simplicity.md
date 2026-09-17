# The Golden Rule

**Write the minimum code that correctly satisfies the spec.**

---

## What This Means

- No speculative features ("might need this later")
- No "just in case" error handling for cases that can't happen
- No design patterns unless the spec requires them
- No wrappers, adapters, or abstractions unless they serve a current need
- No comments explaining what the code does — name things so they explain themselves

## What to Do Instead

Three similar lines > one premature abstraction.  
A flat function > a class hierarchy.  
A readable 5-line block > a clever 2-line expression.

## The Self-Check

Before finalizing any code, ask:  
_"Would a senior engineer look at this and think it's over-engineered?"_

If yes: rewrite. The spec is the ceiling of complexity, not the floor.

## Scope Discipline

Simple also means surgical.  
You were given a spec for ONE module.  
Touch only that module.  
Leave the rest exactly as you found it.
