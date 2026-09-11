# Autospy

**Analyzer and Offer create.**

Autospy is the core engine of an AI-powered Opportunity System. It doesn't analyze a resume
for its own sake — it exists to turn someone's real, existing experience into a credible,
specific, marketable opportunity, then move that opportunity from idea to offer to market
validation.

The system follows one fixed progression:

```
EXPERIENCE → PROFILE → AUTOPSY → CAPABILITIES → MARKET → OPPORTUNITIES → DIRECTION
→ ACTION PLAN → OFFER → REVIEW → ONE-PAGER → PROSPECTS → OUTREACH → RESPONSE → OPTIMIZATION
```

The AI does the analysis, synthesis, research, drafting, and comparison. The human makes the
consequential decisions — approve, edit, or reject — at every stage. Nothing is fabricated:
every claim the system makes is tagged with how solid the evidence behind it is.

## What's live right now

The first three stages are fully implemented end to end:

1. **Experience** — capture what you've actually done, in your own words plus optional
   structured roles and achievements.
2. **Profile** — the AI synthesizes that into a structured Opportunity Profile: an identity
   summary and a set of capability statements, each tagged `CONFIRMED`, `INFERRED`,
   `MARKET-SUPPORTED`, or `HYPOTHESIS`. You approve, edit, or reject each one.
3. **Autopsy** — the AI decomposes your approved Profile: job title → real economic
   capability, skill → problem solved, activity → outcome delivered. It also names the
   recurring pattern underneath your work. Same approve/edit/reject review.

Stages 4–15 (Capabilities through Optimization) are scaffolded in the pipeline UI with their
purpose and expected output described, but not yet wired to the AI engine. They follow the
same artifact-in → AI draft → human review → artifact-out pattern as the first three.

## Architecture

- **Next.js (App Router) + TypeScript + Tailwind** — single deployable app.
- **`src/lib/pipeline.ts`** — the 15-stage definition (order, description, what it produces,
  whether it's implemented). This is the source of truth the stepper UI and routing key off.
- **`src/lib/types.ts`** — the `OpportunitySession` data model: Experience intake, Profile,
  Autopsy, evidence tags, review status. Every stage reads/writes this shared structure so
  context persists — nothing already known is asked for twice.
- **`src/lib/store.ts`** — a simple file-based session store (`.data/sessions/<id>.json`).
  Good enough for single-user local/dev use; swap for a real database if this needs multiple
  concurrent users.
- **`src/lib/anthropic.ts`** — a thin wrapper that forces the model to respond through a single
  tool call matching a JSON schema, so every stage gets typed structured output instead of
  free text to parse.
- **`src/lib/prompts/`** — one system prompt per AI-powered stage, all built on
  `shared.ts`'s `CORE_RULES` (evidence before claims, capability over job title, problem over
  skill, outcome over activity, visible uncertainty, no fabrication).
- **`src/app/api/session/...`** — REST-ish routes: create a session, submit Experience,
  generate/review Profile, generate/review Autopsy.
- **`src/app/pipeline/[id]/[stage]/page.tsx`** — the single pipeline shell: stepper nav across
  all 15 stages, stage-specific content component, locked stages until their predecessor is
  approved.

## Running it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000, click through to Experience, and the Profile/Autopsy stages will
call the Anthropic API once `ANTHROPIC_API_KEY` is set. Without a key, Experience intake still
works; Profile/Autopsy generation will return a clear error until a key is configured.

## Extending a new stage

Each of the remaining 12 stages follows the same shape as Profile/Autopsy:

1. Add fields to `OpportunitySession` in `src/lib/types.ts` for the stage's artifact.
2. Write a prompt module in `src/lib/prompts/<stage>.ts` using `CORE_RULES` + `callStructured`.
3. Add `POST /api/session/[id]/<stage>/route.ts` (generate) and `.../review/route.ts` (human
   approve/edit/reject), following `profile`/`autopsy` as templates.
4. Add a `<Stage>Stage.tsx` component and wire it into
   `src/app/pipeline/[id]/[stage]/page.tsx`.
5. Flip `implemented: true` for that stage in `src/lib/pipeline.ts`.
