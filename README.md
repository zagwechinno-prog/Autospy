# Autospy

**Analyzer and Offer create.**

Autospy is the core engine of an AI-powered Opportunity System. It doesn't analyze a resume
for its own sake — it exists to turn someone's real, existing experience into a credible,
specific, marketable opportunity, then move that opportunity from idea to offer to market
validation, and keep improving it against real market response.

The system follows one fixed progression:

```
EXPERIENCE → PROFILE → AUTOPSY → CAPABILITIES → MARKET → OPPORTUNITIES → DIRECTION
→ ACTION PLAN → OFFER → REVIEW → ONE-PAGER → PROSPECTS → OUTREACH → RESPONSE → OPTIMIZATION
```

...wrapped in a sixteenth, non-linear role — the **Continuous Opportunity Loop** — that
maintains a living snapshot of the whole thing rather than being a stage you complete once.

The AI does the analysis, synthesis, research, drafting, and comparison. The human makes the
consequential decisions — approve, edit, or reject — at every stage. Nothing is fabricated:
every array is empty rather than padded, every URL is a real one the model actually found or
absent, every capability is tagged by how solid its evidence is, and pricing is a hypothesis
until the market says otherwise.

## What's live right now

All 15 pipeline stages plus the Loop are fully implemented end to end, each one a direct
implementation of its own engine spec:

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
6. **Opportunities** — the **Opportunity Ranking Engine** scores every approved capability on
   demand, buyer value, evidence, fit, and accessibility (0–10 each, explicitly framed as
   decision support, not an objective measurement) and ranks the top 3–5. The composite score
   is a geometric mean computed in code, never asked of the model. States plainly why #1
   ranked first and what could change the ranking.
7. **Direction** — the **Decision Guide** presents the strongest candidates with
   priority-based guidance ("if your priority is X, choose A") and then gets out of the way:
   picking one, and writing why, is a human action with no AI call involved. That choice
   becomes `SELECTED_DIRECTION` and nothing continues automatically from it.
8. **Action Plan** — the **Opportunity Execution Architect** turns the selected direction into
   a 4-week VALIDATE → PACKAGE → PROVE → SELL path, each week with an objective, actions,
   deliverable, success criteria, risks, and a decision gate. Executable by one person.
9. **Offer** — the **Offer Architect** pre-fills all nine offer inputs (target customer,
   problem, outcome, service, deliverables, timeline, pricing hypothesis, proof, positioning)
   each with its own recommendation/why/evidence/confidence, then drafts the 13-field offer
   document. Every field is directly editable; pricing is explicitly a hypothesis, never a
   guaranteed result.
10. **Review** — the **Offer Critic** attacks the offer across 14 dimensions, tries to
    disprove it, and produces critical/important/optional findings plus a revised offer.
    Material changes (a different buyer, problem, or promised outcome) are flagged rather than
    silently applied — adopting the revision vs. keeping the original is a human decision.
    Ends with a health score, a ready-for-market-test verdict, the biggest remaining risk, and
    the next best action.
11. **One-Pager** — the **Offer Asset Architect** packages the approved offer into a
    buyer-oriented one-page sales asset — not a resume, not a biography. Concrete language,
    a banned-word list (transform, elevate, unlock, leverage, cutting-edge, revolutionary,
    game-changing), and no invented clients, testimonials, results, or statistics.
12. **Prospects** — the **Prospect Research Engine** defines the Ideal Customer Profile, then
    researches real companies with live web search, prioritized by problem likelihood and fit
    rather than size. No fabricated decision-maker names or contacts; every prospect is
    labeled `VERIFIED` (a real, citable source) or `INFERRED` (plausible, not confirmed).
13. **Outreach** — the **Outreach Strategist** drafts prospect-specific sequences (email,
    LinkedIn, two follow-ups, discovery-call opener) built on observation → problem hypothesis
    → relevant insight → low-friction next step. The first touch doesn't hard-pitch.
    Assumptions are labeled; nothing about the prospect is invented.
14. **Response** — you log what actually happened when you sent that outreach (real prospect,
    real response), then the **Market Feedback Analyst** classifies each entry into one of 13
    categories and a root cause (target/problem/positioning/offer/proof/price/timing/outreach/
    insufficient data), and looks for patterns across entries rather than reacting to one.
15. **Optimization** — the **Offer Optimization Engine** decides, from repeated evidence, one
    of KEEP/REFINE/REPOSITION/NARROW/EXPAND/REPRICE/RETARGET/REJECT, explains each recommended
    change (what/why/evidence/expected effect/risk/confidence), and drafts Version 2. Adopting
    it vs. keeping the current offer is a human decision, same pattern as the Review stage.

**The Loop** — a non-gated, always-regenerable view (`/pipeline/[id]/loop`, linked from every
stage page) implementing the **Opportunity Operating System** role: a living snapshot of what's
known, inferred, tested, worked, failed, remains uncertain, and changed, plus the single
highest-value next action. It reads whatever state exists — partial pipelines included — rather
than requiring the full 15 stages to be complete.

## Architecture

- **Next.js (App Router) + TypeScript + Tailwind** — single deployable app.
- **`src/lib/pipeline.ts`** — the 15-stage definition (order, description, what it produces,
  whether it's implemented). This is the source of truth the stepper UI and routing key off.
  The Loop is deliberately not in this list — it's a cross-cutting view, not a stage.
- **`src/lib/types.ts`** — the `OpportunitySession` data model covering every stage's artifact,
  evidence tags, and review status throughout. Every stage reads/writes this shared structure
  so context persists — nothing already known is asked for twice.
- **`src/lib/store.ts`** — a simple file-based session store (`.data/sessions/<id>.json`).
  Good enough for single-user local/dev use; swap for a real database if this needs multiple
  concurrent users.
- **`src/lib/anthropic.ts`** — `callStructured` forces the model to respond through a single
  tool call matching a JSON schema, so every stage gets typed structured output instead of
  free text to parse.
- **`src/lib/prompts/`** — one module per engine, each a direct implementation of its own
  system-role spec. Two stages depart from the single-`callStructured`-call pattern:
  - `market.ts` and `prospects.ts` do real research: a free-form call with the `web_search`
    server tool, then a `callStructured` pass to extract structured, sourced results.
  - `direction.ts` deliberately has no AI call for the actual decision — only the
    priority-based guidance is generated; picking one is a human action.
- **`src/app/api/session/...`** — REST-ish routes, one folder per stage. Most follow
  generate (`POST .../<stage>`) + review (`POST .../<stage>/review`); a few have a different
  shape where the spec calls for it: Direction (`generate` + `select`), Response (`log` +
  `analyze` + `review`, since it needs real human-reported outcomes before AI can classify
  anything), Optimization (`generate` + `decision`), and the standalone `loop` route (no
  stage gating, callable anytime `experience` exists).
- **`src/app/pipeline/[id]/[stage]/page.tsx`** — the pipeline shell: stepper nav across all 15
  stages, stage-specific content component, locked stages until their predecessor is approved.
- **`src/app/pipeline/[id]/loop/page.tsx`** — the standalone Loop view, outside the stage
  stepper since it isn't part of the linear StageKey union.

## Running it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000, click through to Experience, and every AI-powered stage will call
the Anthropic API once `ANTHROPIC_API_KEY` is set. Without a key, Experience intake and the
Response log still work (they're human data entry); AI generation returns a clear error until
a key is configured. Market and Prospects additionally require your API key to have web search
enabled.

## Extending or modifying a stage

Every stage follows the same shape:

1. Its artifact type lives in `src/lib/types.ts` on `OpportunitySession`.
2. Its prompt module lives in `src/lib/prompts/<stage>.ts`, built on `callStructured` (or the
   `market.ts`/`prospects.ts` two-call research pattern for stages that need live search).
3. Its routes live in `src/app/api/session/[id]/<stage>/`, gated on the previous stage's
   `approved` flag and calling `unlockStage` on the next when this one completes.
4. Its UI component lives in `src/components/<Stage>Stage.tsx` (reuse `DecisionButton` for the
   approve/edit/reject pattern) and is wired into
   `src/app/pipeline/[id]/[stage]/page.tsx`.
5. `implemented: true` in `src/lib/pipeline.ts` once wired up.
