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
every array is empty rather than padded, every URL is a real one the model actually found or
absent, and every capability is tagged by how solid its evidence is.

## What's live right now

Stages 1–5 are fully implemented end to end, each one a direct implementation of its own
engine spec:

1. **Experience** — capture what you've actually done, in your own words plus optional
   structured roles and achievements.
2. **Profile** — two chained AI calls. The **Experience Intake Engine** first extracts
   `PROFILE_RAW`: roles, industries, responsibilities, tools, skills, evidence items, and
   uncertainties, interpreting the underlying work rather than copying keywords. The
   **Professional Profile Architect** then builds a capability profile from that extraction —
   core, supporting, domain-expertise, transferable, commercial, operational, and technical
   capabilities, each tagged `CONFIRMED` or `INFERRED`, plus a direct (not flattering) human
   summary. You approve, edit, or reject each capability.
3. **Autopsy** — the **Resume Autopsy Engine** analyzes the raw experience as evidence of
   economic capability: strengths, weaknesses, hidden value, under-positioned capabilities,
   generic claims, missing evidence, patterns, risks, and opportunity clues. Produces the
   headline and the 3 strongest discoveries. Same approve/edit/reject review.
4. **Capabilities** — the **Capability Translation Engine** converts the approved Profile and
   Autopsy into 5–10 candidate marketable capabilities, careful to keep skill ≠ capability ≠
   service ≠ offer distinct. Each candidate carries buyer problems, likely buyers, evidence
   strength, transferability, and an explicit proof gap.
5. **Market** — the **Market Intelligence Engine** researches each approved capability with
   live web search (Claude's server-side `web_search` tool), then a second pass extracts the
   findings into structured market reads — demand, buyer segments, existing solutions,
   competitive intensity, pricing signals, entry barriers — distinguishing employment demand
   from service, consulting, and product demand. Every claim is sourced or explicitly labeled
   an inference; it does not recommend an opportunity yet, only presents the evidence.

Stages 6–15 (Opportunities through Optimization) are scaffolded in the pipeline UI with their
purpose and expected output described, but not yet wired to the AI engine. They follow the
same artifact-in → AI draft → human review → artifact-out pattern as the first five.

## Architecture

- **Next.js (App Router) + TypeScript + Tailwind** — single deployable app.
- **`src/lib/pipeline.ts`** — the 15-stage definition (order, description, what it produces,
  whether it's implemented). This is the source of truth the stepper UI and routing key off.
- **`src/lib/types.ts`** — the `OpportunitySession` data model: Experience intake, `ProfileRaw`,
  Profile, Autopsy, Capabilities, Market, evidence tags, review status. Every stage reads/writes
  this shared structure so context persists — nothing already known is asked for twice.
- **`src/lib/store.ts`** — a simple file-based session store (`.data/sessions/<id>.json`).
  Good enough for single-user local/dev use; swap for a real database if this needs multiple
  concurrent users.
- **`src/lib/anthropic.ts`** — `callStructured` forces the model to respond through a single
  tool call matching a JSON schema, so every stage gets typed structured output instead of
  free text to parse.
- **`src/lib/prompts/`** — one module per engine (`profile.ts`, `autopsy.ts`,
  `capabilities.ts`, `market.ts`), each a direct implementation of its own system-role spec.
  `market.ts` is the one two-phase-but-different case: a free-form research call with the
  `web_search` server tool, then a `callStructured` pass to extract the structured reads.
- **`src/app/api/session/...`** — REST-ish routes: create a session, submit Experience,
  generate/review each of Profile, Autopsy, Capabilities, Market.
- **`src/app/pipeline/[id]/[stage]/page.tsx`** — the single pipeline shell: stepper nav across
  all 15 stages, stage-specific content component, locked stages until their predecessor is
  approved.

## Running it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000, click through to Experience, and stages 2–5 will call the
Anthropic API once `ANTHROPIC_API_KEY` is set. Without a key, Experience intake still works;
AI generation returns a clear error until a key is configured. The Market stage additionally
requires your API key to have web search enabled.

## Extending a new stage

Each of the remaining 10 stages follows the same shape as Profile/Autopsy/Capabilities:

1. Add fields to `OpportunitySession` in `src/lib/types.ts` for the stage's artifact.
2. Write a prompt module in `src/lib/prompts/<stage>.ts` using `callStructured` (or the
   `market.ts` two-call pattern if the stage needs live research).
3. Add `POST /api/session/[id]/<stage>/route.ts` (generate) and `.../review/route.ts` (human
   approve/edit/reject), following `capabilities`/`market` as templates.
4. Add a `<Stage>Stage.tsx` component (reuse `DecisionButton`) and wire it into
   `src/app/pipeline/[id]/[stage]/page.tsx`.
5. Flip `implemented: true` for that stage in `src/lib/pipeline.ts`.
