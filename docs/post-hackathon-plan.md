# BackOffice Agent — Post-Hackathon Plan

**Status:** Draft for team review
**Reviewers/editors:** Brent, Nia, Melissa — everyone edits
**Last updated:** 2026-04-17

---

## How to read this doc

- **This is a working document.** Anyone can edit, push back, or rewrite sections. Nothing here is final until we agree as a team.
- Items marked **[DISCUSS]** are open questions we haven't decided yet — leave comments inline or bring them to the review meeting.
- **DoD = Definition of Done.** The specific, testable criteria that prove a task is actually complete. Example: "portal redesign done" doesn't mean the code was written; it means "view-scope token gets 403 on approve endpoint" and the test proves it. DoD prevents the "I thought that was finished" problem and makes hand-offs clean.
- **Contributors** column lists who's best suited to *drive* an item, but anyone can jump in. Not ownership — suggested allocation.

---

## Context

We placed 2nd at OSS4AI (the #1 AI community in Seattle + Silicon Valley). That's locked in. This plan is about (a) capitalizing on the momentum, (b) closing the specific gaps the judges flagged, and (c) being ready with credible answers when OSS4AI follows up or investors/customers reach out.

**No hackathon deadline.** We build at real-product cadence.

---

## The strategic reframe **[DISCUSS — does everyone agree?]**

**From:** "Five-agent back-office platform for freelancers"
**To:** **"Change-order infrastructure for freelancers — every scope change becomes signed, paid, and audit-logged."**

Why this change:
- Judges called the current framing "generic" and "less novel than some others"
- The Scope Guardian → change-order flow is the actual wedge (multiple judges said so)
- The moat is the workflow (evidence trail + billing + audit), not the AI detection
- Solide won 1st place with the same pattern: one narrow workflow, perfected, with defensible specifics

What changes: landing page copy, deck, nav labels, marketing one-liner, pitch narrative.
What stays: the 5-agent architecture, seed data, brand system, UI aesthetic, tech stack.

**Open question:** does "change-order infrastructure" feel too narrow? Does it constrain upsell into other freelancer ops later? Team discuss.

---

## Phases at a glance

| Phase | Focus | Rough duration | Primary contributors |
|---|---|---|---|
| 1 | Credibility fixes (security, trust, integrity) | ~1 week | Brent (code) + Melissa (approval UI spec) |
| 2 | Customer discovery + vertical commit + design partner | ~2-3 weeks | Nia (drives) + all (reviews output) |
| 3 | Vertical depth (KB, Health Score, Activity Log) | ~2-3 weeks | Brent (build) + Nia (KB content) + Melissa (UI) |
| 4 | Payment wedge (Stripe) | ~1-2 weeks | Brent |
| 5 | Narrative + polish (deck, landing, proof sheet, demo assets) | ~1 week | All three |
| **Total** | | **~8-10 weeks** | |

---

## Phase 1 — Credibility Fixes (~Week 1)

These are the things that would be embarrassing or risky if anyone from OSS4AI, a judge, or a customer dug in. Ship before any follow-up conversation.

| # | Item | Why | DoD | Contributors |
|---|---|---|---|---|
| 1.1 | Adopt proper migrations (node-pg-migrate or numbered SQL + schema_migrations table); back-fill existing schema as migration 001 | `CREATE TABLE IF NOT EXISTS` can't handle new columns on live DB | `npm run db:migrate` works on fresh + existing DB; rollback tested | Brent |
| 1.2 | Flip `rejectUnauthorized: true` in `server/db.js`; install helmet; rate-limit `/portal/*`; fix missing `DELETE /projects/:id` | Judges flagged portal security twice. Low-effort, embarrassing if skipped. | curl evidence + integration tests cover each | Brent |
| 1.3 | Tool architecture split: every sensitive tool becomes `draft_*` (agent-callable) and `send_*` (user-auth HTTP route only, removed from all agent registries). Enforce at dispatch layer. | Real answer to "manual review for finance/legal." Also the anti-prompt-injection defense. | Agent cannot emit a `send_*` tool call; test: "send invoice to client" prompt → draft only, no email/Stripe side effect | Brent |
| 1.4 | Portal redesign: magic-link → short-lived session cookie → CSRF-protected approve/reject. Token-in-URL = view scope only. `portal_access_tokens` table (scope, revoked_at, viewer_email, expires_at). | Judges flagged open portal twice. | View-scope token gets 403 on approve endpoint (integration test) | Brent (+ Melissa for client-side UX) |
| 1.5 | Approval queue UI: drafted invoices/contracts/change-orders land in "Pending Review" with diff/approve/edit/reject | The UI half of the draft/send split. Without this, 1.3 isn't usable. | User can approve/edit/reject a drafted doc and the correct `send_*` route fires only on approve | Melissa (design) + Brent (build) **[DISCUSS — Melissa drives design spec]** |
| 1.6 | Audit log: `audit_events` table with hash chain; revoke UPDATE/DELETE grants from app DB role; `logEvent()` wired into 8 mutations; read-only viewer in settings | Trust substrate. Future "wow moment" in pitches. | Tamper attempt breaks chain; test proves detection; viewer renders chain | Brent |
| 1.7 | Sonnet claim integrity fix: either re-enable Sonnet for Chief (currently all Haiku) or strike the claim from deck/UI/README | Judges believed marketing that isn't true. Integrity risk. | Deck + README + `agent-config.js` in agreement | Brent **[DISCUSS — re-enable Sonnet or drop claim?]** |
| 1.8 | Environment/ops baseline: Sentry, staging Railway env, CI activation (lint+test+build on PR), DB backup rehearsal | Missing from current stack; mandatory before Stripe goes live. | All four operational; staging URL documented | Brent |

**Realistic Week 1 scope for one dev:** 1.1, 1.2, 1.6, 1.7, 1.8 fully + 1.3 started. Items 1.3 → 1.4 → 1.5 are sequential (same codepaths). Likely spills into early Phase 2. **That's fine — no deadline.**

---

## Phase 2 — Customer Discovery + Vertical Commit (~Weeks 2-4)

The most important phase for long-term product-market fit. Three rounds of adversarial review agreed: **the current vertical pick (design studios) is motivated reasoning from seed data, not evidence.** We pick the vertical from interview signal, not assumptions.

| # | Item | DoD | Contributors |
|---|---|---|---|
| 2.1 | Interview guide + recruiting plan + synthesis template | Shared doc, ready to use; interview questions locked | Nia (drafts) + all (review) |
| 2.2 | Run 15-20 interviews across design studios, dev shops, boutique law, accounting | Recorded calls + transcripts in shared folder | Nia (schedules + conducts) + Brent (sits in on 3-4 for technical Q&A) |
| 2.3 | Validate pricing hypothesis (initial guess: $29/mo vs Bonsai $39/mo + paralegal $75/hr) | Willingness-to-pay signal from ≥5 subjects; pricing memo | Nia |
| 2.4 | Recruit 1-2 design partners (at least one signed LOI on a real project) | Signed LOI — this is the "proof" judges asked for | Nia |
| 2.5 | Vertical decision memo: named vertical, 3 quotes, pricing, competitor map, GTM hypothesis | Team ratifies before Phase 3 starts | Nia (writes) + all (ratify) |
| 2.6 | Estimation accuracy backtest — "pricing within ±12% of freelancer's own rate on 20 seeded projects" | Deterministic metric + report; answers judge feedback #10 | Brent |

### Open questions for Phase 2 **[DISCUSS]**

- Interview volume: 15-20 realistic, or is 10 right? Quality over quantity?
- Vertical shortlist priority: which 3-4 verticals matter? Order?
- Recruiting channels: cold outbound (LinkedIn / Twitter), communities (Designer Hangout, Indie Hackers, HN Who's Hiring), referrals?
- Incentives budget? ($25-50 gift card per interview = ~$400-1000 total)
- What qualifies as a "design partner" — active project, paying, or just signed LOI?

---

## Phase 3 — Vertical Depth (~Weeks 5-7)

Gated on Phase 2 output. Structure is fixed; specific content depends on chosen vertical.

| # | Item | DoD | Contributors |
|---|---|---|---|
| 3.1 | Knowledge base for chosen vertical: 5+ proposal templates, scope definitions per deliverable, rate benchmarks, red-flag phrase library | KB queryable by agents; templates render in UI | Nia (curates content from interviews) + Brent (builds) |
| 3.2 | Immutable pinned templates: `template_version_id` on projects/proposals/contracts | Version mismatch throws; migration + backfill tested | Brent |
| 3.3 | Client Health Score (deterministic 0-100, multi-factor): payment timeliness, scope event density, revision count, invoice age | Pure function with 6+ unit tests; displayed on client detail + dashboard; formula documented | Brent (logic) + Melissa (visualization) **[DISCUSS — ring/bar/semaphore? where in UI?]** |
| 3.4 | Revenue Protected counter on dashboard | Dashboard tile summing approved change-order $; SQL query documented; animated tick | Brent (logic) + Melissa (animation spec) |
| 3.5 | Agent Activity Log (inspector view): tool calls, args, outcomes, human overrides | Inspector panel reads from existing `agent_logs` + new audit events; redacts PII | Brent (server plumbing 80% done) + Melissa (UI) **[DISCUSS — inline in chat or separate tab?]** |
| 3.6 | App.jsx extraction: ChatView, ProjectDetail, DashboardView, AgentInspector, PortalApprovalModal | App.jsx under 600 lines; app still works; smoke tests cover each view | Brent + Melissa (ratifies component boundaries since she designed the monolith) |

### Open questions for Phase 3 **[DISCUSS]**

- Component extraction boundaries — does the proposed 5-component split match Melissa's design intent?
- Where does Client Health Score live in the UI? How does it visualize?
- Revenue Protected animation — prominence, style, trigger conditions?
- Activity Log placement — inline in chat (Solide-style), separate tab, or both?

---

## Phase 4 — Payment Wedge (~Weeks 8-9)

Small scope, high leverage. Prereq: Phase 1.8 (Sentry + staging) must be live first.

| # | Item | DoD | Contributors |
|---|---|---|---|
| 4.1 | Stripe payment link on sent invoices | Test-mode flow works end-to-end from invoice → pay | Brent |
| 4.2 | Signature-verified webhook; idempotency table (`stripe_events`); reconciliation to milestone unlock | Replay test passes; no double-credit; missed webhooks reconcile on next cron | Brent |
| 4.3 | Test-mode → live-mode key management; webhook URL registered in Stripe dashboard | Live payment succeeds in staging account | Brent (Nia has the Stripe key per prior memo) |

**Explicitly deferred to post-launch:** refund/dispute handling, escrow, subscription billing, Gmail ingestion.

**Open question [DISCUSS]:** Should Stripe milestone-escrow ship in Phase 4 or post-launch? Nia's earlier product direction mentioned it.

---

## Phase 5 — Narrative + Polish (~Week 10)

The "pitch exists in Notion, not in the room" blind spot. Fix.

| # | Item | DoD | Contributors |
|---|---|---|---|
| 5.1 | 4-minute scripted demo (demo-architect draft as v1) | Rehearsed, timed, recorded | Nia (writes) + all (rehearse) |
| 5.2 | Deck refresh — change-order infrastructure positioning; architecture slide; named-competitor slide (Bonsai + paralegal vs us); unit economics carryover; proactive roadmap teaser | PDF + keynote file; reviewed by team | Nia (copy) + Melissa (design) |
| 5.3 | Landing page rewrite around new one-liner | Live on prod URL; matches deck positioning | Nia (copy) + Melissa (design) + Brent (deploy) |
| 5.4 | One-page proof sheet (architecture diagram, 3 interview quotes, security checklist, numbers) | PDF ready to send to follow-ups | All three |
| 5.5 | Demo UI assets: animated Revenue Protected counter tick, red-flag phrase highlight on messages, tamper-break verify endpoint + red banner | All three assets trigger correctly in demo flow | Brent (build) + Melissa (design spec) |
| 5.6 | Design-partner case study (one real scope-creep event caught → change order → payment) | Case study doc with before/after numbers + quote | Nia (interviews) + Brent (pulls data) |

### Open questions for Phase 5 **[DISCUSS]**

- Landing page scope — full redesign or copy-only pass?
- Who does the case study writeup — Nia leads, or collaborative?
- Does Melissa want to reshape the architecture diagram visual vs using the raw system map?

---

## Known risks

1. **Interview scheduling slips** → Phase 3 cascades. *Mitigation:* start recruiting Day 0 of Phase 2, not Day 1.
2. **Tool split (1.3) takes 3 days not 1** → sequential with 1.4/1.5 pushes Phase 1 into early Phase 2. *Mitigation:* this is OK, no deadline.
3. **Vertical evidence is ambiguous** (no clear winner from interviews) → *Mitigation:* decision criteria written *before* interviews start (willingness-to-pay threshold, pain intensity, market size signals).
4. **Design partner flakes** → *Mitigation:* recruit 2, not 1.
5. **Melissa's bandwidth** — she contributed a significant UI overhaul commit pre-hackathon; Phase 3 + Phase 5 depend on her availability. **[DISCUSS — realistic time commitment per week?]**
6. **Nia's bandwidth** — Phase 2 is interview-heavy; Phase 5 is narrative-heavy. Overlap is fine but load is front-and-back. **[DISCUSS]**
7. **Brent is the only engineer** — single point of failure. Consider: any Phase 2/3 work Nia or Melissa can take on to reduce critical-path risk?

---

## Decisions we need to make together (bring to review meeting)

### Strategic
- [ ] Ratify the reframe to "change-order infrastructure"
- [ ] Vertical shortlist: which 3-4, in what order?
- [ ] Pricing hypothesis: $29/mo the right opening bid, or different?
- [ ] Design partner criteria: LOI vs active project vs paid?
- [ ] Sonnet claim: re-enable or drop from deck?
- [ ] Stripe escrow: Phase 4 or post-launch?

### Operational
- [ ] Interview volume target: 10, 15, or 20?
- [ ] Incentives budget?
- [ ] Interview recruiting channels?
- [ ] Who writes interview guide v1?
- [ ] Meeting cadence during active phases (weekly sync? async?)
- [ ] Where does this doc live going forward — local, Notion, Google Doc?

### UI/UX (Melissa's territory primarily, but team reviews)
- [ ] Approval queue UI shape — page, modal, sidebar?
- [ ] Client Health Score visualization + placement
- [ ] Revenue Protected animation style
- [ ] Activity Log — inline or separate tab
- [ ] Component extraction boundaries (ratify proposed 5 components)
- [ ] Landing page scope — full redesign or copy pass

---

## Next actions (before review meeting)

- [ ] Brent: share this doc with Nia and Melissa
- [ ] Nia + Melissa: read through, mark up with comments/edits, come ready to discuss
- [ ] Brent: schedule review meeting (propose 1 hour, week of Apr 20)
- [ ] Nia: pre-draft interview guide v0 so review includes something to push back on
- [ ] Melissa: look at `src/App.jsx` and flag any component seams we've missed in 3.6

---

*Plan synthesized from: judge feedback audit (2026-04-17), three-agent strategic critique (strategist, engineer, security), three-agent execution review (judge-decoder, execution-specialist, demo-narrative-architect), and team collaboration notes.*
