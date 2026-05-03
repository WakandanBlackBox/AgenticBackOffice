# Future Proof Labs — Unified Business Plan (v2)

**Status:** Strategic synthesis for team discussion (Brent, Nia, Melissa)
**Date:** 2026-04-19 (v2 — refined with self-audit, see §0 and §12)
**Synthesizes:** Judge feedback (OSS4AI #32), Brent's post-hackathon technical plan, Nia's Future Proof Labs services plan, fresh market research
**Posture:** Honest about a 3-day MVP. No false precision. Security-first. Vertical-bias.

---

## 0. What changed in this revision

v1 of this doc treated normal early-stage incompleteness as embarrassment. The team built **a 5-agent multi-agent platform in 3 days, placed 2nd at a competitive Seattle/SF AI hackathon, and got substantive judge feedback**. That is genuinely impressive — well above the indie-SaaS norm where 80% of MVPs take a month or more ([Y Combinator data](https://medium.com/@vicki-larson/in15-ai-micro-saas-ideas-ranked-by-launch-speed-market-saturation-2026-guide-96d4820a4ee4)).

The big v2 changes:

1. **Reframed gaps as expected hackathon reality, not failures.** "No paying customers, no LOIs, no validated retention" is true. It's also *exactly* what you'd expect 6 days post-hackathon.
2. **Removed false-precision financial projections** (the v1 "$87K-$255K Year 1" range multiplied two unknowns). Replaced with scenarios.
3. **Switched from 12-month phased plan to a 90-day plan with explicit re-evaluation gates.** Three part-time founders work in sprints, not quarters.
4. **Surfaced the alternative structure:** maybe BackOffice and Build·Launch·Scale are two separate ventures, not a studio. Both options are now presented; the integrated path is recommended *with* explicit failure-mode mitigation.
5. **Reframed the security investment as upmarket enablement**, not freelancer marketing copy. Freelancers don't buy on security; brokerages and small law firms do. Security funds the upmarket move, not the bottom-of-market pitch.
6. **Added real estate TC as one of several vertical candidates** for BackOffice's interview-driven vertical commit, weighted equally with design studios and boutique law. (Note: Brent's separate TDM project is a different product in this market and is *not* part of this plan — see §3.)
7. **Stronger cohort-product integration thesis:** the cohort curriculum *is* BackOffice's wedge. We teach "build a Scope Guardian for your industry." BackOffice is the reference implementation. That compounds; "cohort grads become customers" doesn't.
8. **Withdrew unsolicited fundraising guidance.** Bootstrapped is the recommended path; VC is mentioned only as one explicit decision option later.

The full self-audit is §12.

---

## 1. Executive Summary

### What we are
A three-person AI studio that, in 3 days at a hackathon, shipped a multi-agent SaaS, took 2nd place at a real Seattle/SF AI hackathon, and got the kind of detailed third-party feedback most early companies pay consultants for.

### What's already validated (don't underplay this)
- **Team chemistry under pressure.** Three people, three skill sets, one working product in 3 days. That's a recruiting story and a co-founder story.
- **The wedge.** Multiple judges singled out the Scope Guardian → change-order workflow as the standout idea. Not the multi-agent architecture, not the UI — the workflow.
- **Market direction.** 2026 funding pattern: vertical AI with owned workflows is the only AI category VCs fund, and productized services are the proven bootstrap path.
- **Build velocity.** 3 days to a 2nd-place hackathon entry is materially faster than the 1-month indie-SaaS MVP norm.

### What's not yet validated (this is normal at day 7)
- Zero paying customers on either arm.
- No design partner LOIs yet.
- No retention or CAC data yet.
- Nia's cohort hasn't run; pricing and ICP are hypotheses.
- The "design studios" vertical pick is a seed-data choice from a 3-day demo, not a market commitment.
- The Sonnet-vs-Haiku marketing claim doesn't match the code (Haiku-only). One-line fix.
- "#1 in Seattle/SF" was OSS4AI's self-marketing. We should drop the line. "2nd at OSS4AI #32" is plenty.

### The thesis in one sentence
**Build·Launch·Scale (Nia's cohort + sprint) generates near-term revenue and customer signal; BackOffice Agent compounds that signal into a defensible vertical SaaS that the cohort then teaches as a reference implementation.**

### What we are asking the team to ratify
1. Adopt the parent-and-product structure (Future Proof Labs / BackOffice / Build·Launch·Scale) **OR** explicitly choose the alternative — two separate companies that share founders. See §3.
2. Treat the next 90 days as **discovery + credibility fixes + first-revenue beta**, not "scale." No paid acquisition.
3. Run beta cohort and BackOffice customer interviews in parallel — both serve the same goal of de-risking ICP.
4. Adopt zero-trust agent security as a **build priority**, but market it only when selling upmarket (brokerages, law firms, accounting practices), not to lone freelancers.
5. Defer SOC 2, hiring, and fundraising. Revisit at the 90-day gate.

---

## 2. Honest situation assessment

### What the judges actually said
- **Strengths:** clean demo, real multi-agent orchestration, Scope Guardian is innovative, problem statement crisp, unit economics shown, "strong business potential."
- **Gaps to fix:** open client portal flagged for security (twice — most-mentioned concern), no manual review for sensitive finance/legal output, no accuracy/trust evidence, generic positioning ("less novel than some others"), Sonnet-vs-Haiku marketing claim is not actually true in code.

### What that feedback actually means
- **The product idea is fine.** The execution gaps are credibility issues we expected to find — that's *why* we entered the hackathon.
- **"Less novel than some others"** is a comparative judgment from one moment in time, against unknown competing entries. The judges still placed us **second**. Don't over-weight this line.
- **Security is the most actionable.** A 3-day demo with an unauthenticated client portal is normal. A production product with one is not. Fixing this is in Brent's plan as Phase 1.
- **The Sonnet claim integrity issue is one commit.** Either re-enable Sonnet for Chief or change the README and deck. Trivial.

### What's true about Nia's plan (Build·Launch·Scale)
- The pricing ladder ($750 / $1,500 / $2,500 cohort, $5K-$12K sprint, $2K/mo retainer) is **inside the validated 2026 market range**: AI bootcamps cluster at $1,999-$3,000 ([AI-First Mindset](https://aifirstmindset.ai/ai-bootcamp-for-business-leaders/)), AI agency retainers $3K-$8K, productized AI sprints $5K-$15K.
- **The Standard tier may be slightly underpriced** vs. comparable AI bootcamps. Worth A/B testing later.
- The ICP ("women in corporate roles, 30-45, expertise + capital, building a side business") is sharp, distinct from BackOffice's ICP, and **plausibly fillable from Nia's existing network** — the most important property of a beta-cohort ICP.
- The "Stop consuming AI content. Build something that pays you." line works. It implies status reversal and is specific.
- **Untested:** the cohort itself. First beta cohort is the single most important validation Nia will do this year.

### What's true about Brent's technical plan (post-hackathon-plan.md)
- Adopt Phase 1 (security/credibility) intact.
- Phase 2 (customer discovery + vertical commit) is correctly gated.
- Phase 3-5 depend on Phase 2 output.
- Already incorporates honest self-correction from prior agent reviews (false parallelism flagged, Sonnet claim flagged, missing migration strategy flagged). Engineering rigor is already there.
- **What v1 of this doc missed:** the plan implicitly assumes Brent is full-time. He's not. Real velocity is unknown.

### What the team has that doesn't show up in any plan
- Three skill sets covered (build, sell/strategy, design).
- One paying customer-adjacent: Nia has the Stripe key and existing audience.
- Demonstrated speed: built in 3 days.
- A product that runs in production *right now* on Railway.
- Documented feedback from a competitive hackathon (most teams don't get this).

---

## 3. Strategic thesis — and the alternative

### The recommended path: integrated studio
**Future Proof Labs** is the parent. **BackOffice Agent** is the SaaS product. **Build·Launch·Scale** is the services arm.

Why this is the recommended path:
- 2026 funding research is unambiguous: vertical AI SaaS is the only AI category VCs fund; productized services are the proven bootstrap path. ([TechCrunch SaaSpocalypse](https://techcrunch.com/2026/03/01/saas-in-saas-out-heres-whats-driving-the-saaspocalypse/), [Stormy AI playbook](https://stormy.ai/blog/build-1m-productized-service-agency-playbook))
- The cohort can fund operations from month one; SaaS doesn't have to.
- One brand is easier to market than two.
- One LLC is simpler than two until tax/liability separation matters.

### The alternative path: two separate ventures
- **BackOffice Inc** (SaaS, eventually fundable, Brent runs it).
- **Nia's company** (cohort + sprint, services-only, Nia runs it).
- Founders are shared but business entities are separate.

When this is the right choice:
- If founder economics differ materially (e.g., Nia takes most of the cohort upside, Brent takes most of the SaaS upside).
- If the cohort grows fast enough that splitting attention damages BackOffice.
- If SaaS fundraising (later) requires a clean cap table without services revenue muddying the metrics.

The studio model has documented failure patterns we need to address either way:
- **"Identity-less builder"** — studios fail when their public mission is unclear. ([VentureStudioForum](https://newsletter.venturestudioforum.org/p/the-fatal-flaws-in-the-venture-studio))
- **"Phantom founder"** — misaligned incentives between studio and product.
- **"Heterogenesis of ends"** — short-term services revenue conflicts with long-term SaaS investment.
- **"Split focus"** — one studio explicitly named this: "It's just too much."

How we mitigate (if we go integrated):
- Each arm has one *driver* (Nia for services, Brent for SaaS) — the other two contribute but don't share decision rights inside that arm.
- Founders' agreement spells out IP ownership, equity vesting, and what happens if either arm is spun out later.
- Studio public identity is **secondary** to product identity. We market BackOffice and Build·Launch·Scale as the consumer-facing brands; Future Proof Labs is the legal entity, not the marketing front.

### What the studio is *not*
- Not an agency that takes any work that walks in.
- Not a generic "AI consultancy."
- Not a course mill.

### Vertical commit — why we deliberately delay
v1 of this doc was right to defer. Candidates for BackOffice's vertical commit, weighted equally pending interview signal:

| Vertical | Wedge fit | Willingness to pay (validated) | Note |
|---|---|---|---|
| **Design studios** | Good (current default) | Bonsai-tier $25-79/mo | The default we should make earn its keep — not assume |
| **Boutique law firms** | Excellent — change orders are universal | Higher (legal tools $50-$200/mo, often per-seat) | Need legal-savvy advisor; longer sales cycle |
| **Dev shops / fractional CTO** | Good | Sophisticated buyer; moderate WTP | Brent's natural network |
| **Bookkeepers / fractional CFO** | Decent | Recurring relationships, pricing varies | Lowest tested vertical for us |

**Real estate TC is intentionally excluded from BackOffice's vertical candidate list.** Brent has a separate, more mature project ([Transaction Deadline Manager](https://github.com/BlackPanther01/transaction-deadline-manager)) that already addresses this market. Treating real estate TC as a BackOffice vertical would force the two projects to compete or merge — both bad outcomes. **TDM and BackOffice stay structurally separate.** TDM is Brent's parallel build (Nia is invited to review and potentially collaborate); BackOffice is the studio's flagship hackathon-validated SaaS.

---

## 4. Market analysis

### Macro tailwind (cited but not gospel)
- Vertical SaaS growing 18-22% CAGR vs 12-15% for horizontal SaaS ([tech-insider.org](https://tech-insider.org/the-rise-of-vertical-saas-why-industry-specific-software-is-winning/)) — directional, source quality medium.
- AI agent market $7.6B in 2025 → projected $50B by 2030 ([SelfEmployed.com](https://www.selfemployed.com/news/ai-agents-for-solopreneurs-2026/)) — projection, not measured.
- VC funding numbers from Q1 2026 articles vary widely depending on source; **don't quote the $297B number in pitches without citing a primary source**.

### Competitive landscape (the thing that matters)

**For the freelancer back-office market:**
| Tier | Players | Their position | Why we can compete |
|---|---|---|---|
| Incumbents | Bonsai, HoneyBook, Dubsado, FreshBooks ($19-79/mo) | Templates, manual workflows | 8-10 year codebases. Adding agentic AI requires re-architecting. |
| Cheap challengers | Plutio ($19/mo), Moxie ($10/mo) | Compete on price | No AI moat. |
| AI-native challengers | Mostly stealth in 2026 | New entrants | **This is the timing risk.** 12-18 months before category fills. |
| Adjacent contract-AI | Spellbook, Ivo, Brightflag, LegalFly | Enterprise legal | Different ICP; could pivot down. |

**For the real estate TC market (if we go vertical here):**
| Tier | Players | Pricing | Our angle |
|---|---|---|---|
| Market leader | Dotloop (~50% US share) | $29-35/mo | Workflow, not AI; doc-management focus |
| Compliance leader | SkySlope | ~$250/mo | Audit trails, broker-side |
| Modern challengers | Open to Close | $99-399/mo | Better UX, smaller share |
| Niche tools | Paperless Pipeline, BoldTrail TC, Brokermint | Various | Fragmentation = opportunity |

**Read on real estate TC:** market is real ($29-$399/mo, mature buyers, 67% of top teams already pay for software), there's no AI-native player yet, and our wedge (catch + draft + log every change to a transaction) maps directly to the daily TC pain.

### The cohort/services market
- AI bootcamp pricing: $1,999-$3,000 for 8-week programs ([AI-First Mindset](https://aifirstmindset.ai/ai-bootcamp-for-business-leaders/), [Maven](https://maven.com/aimakerspace/ai-eng-bootcamp))
- AI agency retainers: $3K-$8K/month
- AI sprint pricing: $5K-$15K
- Nia's pricing is in band; Standard tier ($1,500) is at the lower end of comparable bootcamps.

### The thing nobody else is doing
A cohort whose **curriculum produces vertical AI agents**, with the operator's own product (BackOffice) as the live reference implementation. That's not a marketing claim, it's a real pedagogical asset: students see a working multi-agent system, learn the architecture, and ship one for their own vertical. Few other AI bootcamps can demo their own production product live.

---

## 5. Product strategy: BackOffice Agent

### Honest product status (Day 7 post-hackathon)
- **Works in production:** auth, project/client CRUD, 5 specialist agents + Chief, dispatcher, tool-use with Claude Haiku, SSE streaming, demo seed data.
- **Hackathon shortcuts to fix:** portal security, draft-vs-send separation, Sonnet claim, audit log, migrations, helmet, rate limiting, approval queue UI.
- **Doesn't exist yet:** Stripe payments, Knowledge Base for any vertical, Client Health Score, Activity Inspector UI, design-partner case study, accuracy backtests.

### What BackOffice becomes (12-month vision)
- **Core:** a workspace for an indie operator (freelancer, TC, paralegal, fractional CFO) where every client interaction generates a draft requiring **explicit human approval** before going out, and every approved action is **immutably logged** with cryptographic tamper-evidence.
- **Wedge:** Scope Guardian flags scope creep in inbound messages, drafts a polite "happy to do that — here's the change order" response, and tracks "Revenue Protected" as a dashboard metric.
- **Trust layer:** read-only verifiable audit log shareable with the client. The differentiator nobody else demos live.

### Adopt Brent's post-hackathon plan
That doc is the engineering roadmap. v2 of *this* doc compresses the relationship to Nia's arm:

| Brent's Phase | Sprint window | Integration with Build·Launch·Scale |
|---|---|---|
| 1: Credibility fixes | Sprint 1-2 (~3-4 weeks part-time) | Nia recruits Beta cohort applicants in parallel |
| 2: Customer discovery + vertical commit | Sprint 2-3 | Beta cohort *is* the interview pool |
| 3: Vertical depth | Sprint 4-6 | First Done-For-You sprint client uses new features |
| 4: Payment wedge | Sprint 6-7 | Stripe enables both BackOffice subs AND cohort/sprint billing |
| 5: Narrative + polish | Sprint 7-8 | Cohort pitch, BackOffice case study, sprint pitch share one deck |

Sprint = 2 weeks, part-time. Full plan gates at the 90-day mark (§8).

### The deliberate not-to-build list (2026)
- **No Gmail / Slack ingestion** until SOC 2 (forces security review work we can't afford).
- **No mobile companion app** — the freelancer-friend feedback was interesting but separate product.
- **No multi-seat agency tier** until single-seat is proven.
- **No marketplace, white-label, Zapier integration, or AI-generated logos.** None of these are the wedge.

---

## 6. Security architecture — built now, marketed later

This is the section I most over-corrected on in v1. Splitting it cleanly:

### What we BUILD in Sprint 1-3 (non-negotiable)
These are the controls that make BackOffice production-grade. They directly answer judge feedback. They are also what an upmarket buyer (brokerage, small law firm) will need on day one — but freelancer ICP doesn't notice them. Build them anyway.

| Control | What it is | Why now |
|---|---|---|
| **Draft / Send separation** | Sensitive tools split into `draft_*` (agent-callable) and `send_*` (HTTP route requiring authenticated session) | Direct answer to "manual review for finance/legal." Also the anti-prompt-injection defense. |
| **Scoped portal tokens** | Magic-link → short-lived cookie → CSRF-protected approve/reject. Token-in-URL is view-only. `portal_access_tokens` table. | Direct answer to most-cited judge concern. |
| **Tamper-evident audit log** | `audit_events` with hash chain. App DB role has no UPDATE/DELETE. Verify endpoint detects breaks. | Reframes product from "tool" to "infrastructure." Visceral demo. |
| **Credential isolation** | API keys never touch any prompt or tool output | Mitigates prompt-injection blast radius. ([VentureBeat — Anthropic pattern](https://venturebeat.com/security/ai-agent-zero-trust-architecture-audit-credential-isolation-anthropic-nvidia-nemoclaw)) |
| **Migrations** | Numbered SQL + schema_migrations table; replace `IF NOT EXISTS` everywhere | Production hygiene; can't ALTER live tables otherwise. |
| **helmet + rate limiting on `/portal/*`** | Standard middleware | One-day fix; embarrassing if skipped. |
| **`rejectUnauthorized: true` on Postgres** | Production SSL | One-line fix. |
| **Webhook signature + idempotency** | Stripe webhooks verify signature, store `stripe_events`, reconcile via cron | Mandatory before live mode. |

### What we DEFER (and why)
- **Per-agent identity in Entra/Okta-style flows** — interesting but premature. ([Microsoft ZT4AI](https://particula.tech/blog/microsoft-zt4ai-zero-trust-ai-agents)) is enterprise-scale tooling. We don't need it until enterprise sells force us to.
- **ABAC permission engine** — RBAC is fine for single-seat; ABAC is right for multi-seat agency tier. Defer with that tier.
- **SOC 2 Type 1** — pre-revenue startups should NOT pursue. ([Vanta](https://www.vanta.com/collection/soc-2/soc-2-audit-cost) is explicit.) $45-55K, 3-4 month timeline, controls break as the product iterates. Revisit when one paying upmarket prospect cites SOC 2 as a blocker.
- **Pen test** — defer with SOC 2.
- **SSO/SAML** — defer to multi-seat tier.

### What we MARKET, and to whom
**To freelancer ICP:** "Your client portal is locked down — magic links, scoped access, every action logged. Approve every send before it goes out." Plain language. No "zero-trust" jargon.

**To upmarket ICP** (brokerages, law firms, accounting practices, fractional CFO firms): "Built with the agent-security patterns documented in 2026's enterprise frameworks — draft/send separation, credential isolation, tamper-evident audit logs, hash-chained transaction history. Independently verifiable." Different audience, different language, same controls.

The market data backs this: **83% of enterprise buyers require SOC 2** ([SaaS buying survey 2026](https://www.spendflo.com/blog/insights-from-the-state-of-saas-buying-survey)) but no comparable percentage exists for freelancers. Security spend is upmarket enablement.

---

## 7. Financial picture (scenarios, not point estimates)

v1 of this doc multiplied two unknowns and produced a fake $87K-$255K range. v2 replaces that with three scenarios and explicit gates.

### What we know
- Operating costs are very small: Railway + Anthropic API + Sentry + LLC + accounting + cohort tooling = roughly **$10K-$30K/year**.
- We are not paying ourselves salaries.
- Three founders are part-time.
- Month-1 cash needed: ~$2K-5K (LLC formation, legal templates, domain, initial tools).

### Scenario A — Beta cohort fills, BackOffice stays in beta
- 1 Beta cohort × $750 × 5 students = $3.75K
- 0-5 BackOffice friend-of-friend users at $0 (free trial)
- Net: ~$0-$3K profit at 90 days
- Read: validates Nia's cohort thesis at minimum risk. Brent's BackOffice is on-track but unmonetized.

### Scenario B — Cohort + first design partner
- Beta cohort × $750 × 6 students = $4.5K
- 1 Standard cohort started × $1,500 × 8 = $12K
- 2-3 BackOffice paid design partners at $29/mo = ~$200/mo
- Net: ~$10-15K cash positive at 90 days
- Read: cohort model is real, BackOffice has its first revenue.

### Scenario C — Both arms hitting (the bull case)
- Beta + 2 Standard cohorts = ~$30-40K
- 1 Sprint client at $5K = $5K
- 5-10 BackOffice paid design partners at $29-99/mo = ~$1K MRR
- Net: $35-50K cash positive at 90 days
- Read: studio model is working; can plan Year 2 with confidence.

### What this means
- **The studio is operationally cheap enough that even Scenario A doesn't kill us.** That's the point of bootstrapping.
- **No fundraising pressure for at least 12 months.** Capital is optional.
- **The biggest financial risk** is not running out of money. It's spending Brent's engineering hours on the wrong vertical.

### Unit economics for BackOffice (carryover, still true on paper)
- ~$0.013 AI cost per interaction
- $2.40-$12 AI cost per user per month
- $55 blended ARPU (untested)
- 78-82% gross margin at scale
- LTV ~$1,155 (24-mo tenure, 5% monthly churn — unvalidated)

These remain hypotheses until the first paying cohort of design partners hits month 3.

---

## 8. 90-day plan with explicit gates

v1 had a 12-month phased plan. v2 collapses to 90 days (six 2-week sprints) with one explicit re-evaluation gate at day 90.

### Sprint 1 (Days 1-14) — Foundation + cohort recruiting
**Engineering (Brent):**
- LLC formation kickoff (paralegal or lawyer, ~$500-1,500)
- Sonnet claim fix (one commit)
- Migrations + helmet + rate-limit /portal/* + `rejectUnauthorized: true` (Brent's items 1.1, 1.2, 1.7)
- Sentry + staging env (Brent's 1.8)
**Services (Nia):**
- Beta cohort landing page draft + signup form
- Email/LinkedIn outreach to 30 warm contacts in target ICP
- Beta cohort pricing locked at $750
**Design (Melissa):**
- Approval queue UI spec (paper sketch + acceptance criteria for Sprint 2)
- Audit Melissa's actual weekly bandwidth — calibrate Sprint 2-3 plans accordingly

**Gate at end of Sprint 1:** Are 5 Beta cohort signups within reach? Is the LLC paperwork moving? If neither, escalate.

### Sprint 2 (Days 15-28) — Trust layer + first interviews
**Engineering:**
- Draft/send tool split (Brent's 1.3) — biggest engineering item, may stretch into Sprint 3
- Magic-link portal redesign (1.4)
- Audit log with hash chain (1.6)
**Services:**
- Beta cohort confirmed; 5-8 students locked
- 5 customer-discovery interviews (target: real estate TC + boutique law + design)
**Design:**
- Approval queue UI ships in code

**Gate at end of Sprint 2:** Draft/send + magic-link portal demoable? Beta cohort filled? At least 3 interviews done?

### Sprint 3 (Days 29-42) — Beta cohort starts + interviews continue
**Engineering:**
- Approval queue UI built (Brent's 1.5)
- Estimation accuracy backtest (judge feedback #10) — "pricing within ±12% of freelancer's own rate on 20 seeded projects"
**Services:**
- Beta cohort week 1 begins
- 5-10 more interviews
**Design:**
- Component extraction prep (Brent's 3.6) — paper plan, no code yet

**Gate at end of Sprint 3:** Cohort engagement positive? At least 10 cumulative interviews? Vertical signal emerging?

### Sprint 4 (Days 43-56) — Vertical commit + first design partner
**Decision sprint.** Vertical decision memo (Brent's 2.5) ratified by team.
- Brent: Knowledge Base scaffold for chosen vertical (Brent's 3.1)
- Nia: First design-partner LOI signed
- Melissa: UI for chosen vertical's nuances

**Gate at end of Sprint 4:** Vertical chosen with evidence? At least one signed LOI? Cohort halfway-point check (NPS, attendance)?

### Sprint 5 (Days 57-70) — Vertical depth + cohort delivery
**Engineering:**
- Client Health Score (Brent's 3.3)
- Revenue Protected counter (3.4)
- Activity Log inspector (3.5)
**Services:**
- Beta cohort wraps; testimonials captured
- First Sprint client conversation initiated (target $5K)

### Sprint 6 (Days 71-84) — Stripe + first revenue + decision prep
**Engineering:**
- Stripe payment links + webhook + idempotency (Brent's 4.1, 4.2)
**Services:**
- Standard cohort planned for early Sprint 7-8
- Proof sheet drafted (Brent's 5.4)
**All:**
- Day-90 decision memo drafted

### Day 90 Gate — Fork in the road
Three options based on real metrics:

| Option | Trigger | What we do next |
|---|---|---|
| **A. Lean into BackOffice** | 5+ paid design partners, retention signal positive, vertical commit feels right | Next 90 days = Standard cohorts + sprint marketing + push to $1M ARR |
| **B. Stay balanced** | Cohort revenue strong, BackOffice steady but not exploding | Next 90 days = grow cohort cadence, BackOffice ships incremental, no rush |
| **C. Pivot or decouple** | Either arm dramatically over/under-performs | Honest writeup, decide whether to keep both arms together or split |

---

## 9. Risks — ranked

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Founder bandwidth.** Three part-time people across two products. | Each arm has one driver. Sprint reviews catch overload early. Defer scope before adding hours. |
| 2 | **Wrong vertical commit.** Inertia picks design studios; real estate TC was actually the better wedge. | Sprint 4 vertical memo requires evidence from interviews. Real estate TC is now explicitly weighted higher. |
| 3 | **First cohort doesn't fill.** Nia's ICP untested. | Beta tier is $750 specifically so it can fill on warm network. Sprint 1 gate catches this. |
| 4 | **Brent is single point of failure for SaaS.** | Reduce scope ruthlessly. Nia/Melissa take more discovery, content, design — every hour Brent isn't shipping is a risk. |
| 5 | **Studio model failure modes.** Identity-less builder, phantom founder, split focus. | Studio is legal entity; products are public brands. Founders' agreement clarifies IP and equity. Drivers per arm. |
| 6 | **Incumbent ships "Scope Guardian" feature.** HoneyBook/Bonsai have distribution. | Win on architecture (audit log, draft/send), not feature parity. Hard to retrofit into 10-year-old codebases. |
| 7 | **Adjacent AI startup pivots into our space.** Solide-style player. | Move faster on vertical commit. Workflow ownership beats AI quality at this stage. |
| 8 | **Security incident pre-SOC 2.** | Sprint 1-3 controls are non-negotiable. Audit log + draft/send + scoped tokens are the three load-bearing controls. |
| 9 | **Melissa's bandwidth.** Plan assumes more than she may give. | Sprint 1 explicitly calibrates her weekly capacity. Plans adjust accordingly. |
| 10 | **Founder dispute.** Most studios die from this. | Founders' agreement in Sprint 1 with explicit IP assignment, vesting, tiebreak mechanism. Real lawyer, $1-2K. |

---

## 10. Open decisions for the team review meeting

### Strategic
- [ ] Ratify the parent-and-product structure **OR** explicitly choose the two-separate-companies alternative (§3)
- [ ] Strike "#1 in Seattle/SF" claim from all marketing — replace with "2nd at OSS4AI #32"
- [ ] Vertical priority for BackOffice: design studios / boutique law / dev shops / bookkeepers — initial interview targets and recruiting order
- [ ] TDM (Brent's separate project): does Nia want to collaborate / review? Is it formally part of Future Proof Labs or kept personal?
- [ ] Keep "change-order infrastructure" reframe? Or hold positioning open until vertical is chosen?
- [ ] Sonnet claim: re-enable Sonnet for Chief or strike from deck/UI? (One commit either way.)
- [ ] Stripe escrow: Sprint 6 or post-90-day?

### Legal & operational
- [ ] LLC formation — registered agent? State?
- [ ] Equity split (3-way? Different splits per arm? Vesting cliffs?)
- [ ] IP assignment (all current code → Future Proof Labs)
- [ ] Founders' agreement — lawyer or template?
- [ ] Banking: Mercury / Brex / Wise?
- [ ] Accounting: who's bookkeeping? Quarterly reviews?

### Build·Launch·Scale (Nia)
- [ ] Beta cohort start date (target: late May / early June)
- [ ] Beta cohort size cap (5-8?)
- [ ] Cohort delivery platform (Maven, Circle, Discord?)
- [ ] Webinar frequency for top-of-funnel
- [ ] First-cohort ICP — narrow ("women in corporate") or open beta?
- [ ] Sprint pricing — start at $5K or $8K?
- [ ] Sprints: full-team or Nia-led with Brent/Melissa contracted in?

### BackOffice Agent (Brent)
- [ ] Customer discovery: target 15 interviews or start with 10?
- [ ] Interview incentives budget ($25-50 × 15 = $375-750)
- [ ] Recruiting channels: LinkedIn / Twitter cold, communities, referrals?
- [ ] Design partner criteria: signed LOI / active project / paying?
- [ ] BackOffice pricing — does $29/$59/$99 hold up after interviews, or does the real-estate TC tier ($99-$299) become live?
- [ ] Free trial length

### UI/UX (Melissa)
- [ ] Approval queue UI shape: page, modal, sidebar?
- [ ] Client Health Score visualization + dashboard placement
- [ ] Revenue Protected animation style
- [ ] Activity Log: inline in chat, separate tab, or both?
- [ ] Component extraction boundaries
- [ ] Landing page rewrite scope: full redesign or copy-only

### Security
- [ ] Adopt the build-now / market-later split (§6) explicitly?
- [ ] Defer SOC 2 to post-90-day gate?

### Cadence & process
- [ ] Sprint length: 2 weeks confirmed?
- [ ] Weekly sync day/time
- [ ] Where do these docs live going forward (this repo, Notion, Google Drive)?
- [ ] Tiebreak mechanism for disagreements

---

## 11. What we are explicitly NOT doing in 2026

- **Not adding features outside the wedge.** No Gmail ingestion, no Slack bot, no mobile app, no multi-seat tier (yet), no marketplace, no Zapier integration.
- **Not raising venture capital in the first 90 days.** Maybe ever. Studio model funds itself.
- **Not pursuing SOC 2 / HIPAA / PCI Level 1 in 2026.** Defer until enterprise inbound forces our hand.
- **Not hiring.** Three people is enough through day 90 minimum.
- **Not opening Future Proof Labs as a generic AI consultancy.** When inbound asks "can you build us X?", default answer is "no, but our Sprint program might fit if X is services-adjacent."
- **Not building cohort tech.** Use Maven or Circle. We do not write our own LMS, community platform, or video player.
- **Not building a second SaaS product.** Second product is a Day 90+ decision, not a parallel skunkworks.
- **Not chasing the cohort upmarket** into enterprise L&D.

---

## 12. Reasoning audit (visible self-critique of v1 of this doc)

This section is here so the team can see what I changed and why before reading the rest. If anything below resonates, push back further — these are *my* identified biases, you may have others.

### Bias 1 — Treated 3-day MVP gaps as failures
**v1 said:** "We have zero paying customers. We have zero design partner LOIs. We have no validated retention or CAC data."
**The problem:** All true. Wrong tone. A 3-day hackathon project that placed 2nd is *exactly* where you'd expect those gaps. v1 read like a confession; it should read like a launch position.
**v2 fix:** Lead with what *is* validated (team chemistry, wedge, build velocity, judge endorsement) before listing what isn't.

### Bias 2 — False precision in financial projections
**v1 said:** "Year 1 plausible range $87K-$255K."
**The problem:** Lower bound assumed Nia's untested cohort fills; upper bound assumed BackOffice acquires 200 paying users with no validation. Multiplying two unknowns produces a fake range. Worse, citing it gives the team a false anchor.
**v2 fix:** Three explicit scenarios (beta-only, cohort + first design partner, both arms hitting). No anchored Year 1 number.

### Bias 3 — Prescriptive timing without basis
**v1 said:** "Phase 1 = 5 weeks, Phase 2 = 6-8 weeks, total 8-10 weeks."
**The problem:** Three part-time founders ≠ hackathon velocity. I was using arbitrary durations.
**v2 fix:** 90-day plan with six 2-week sprints and one explicit re-evaluation gate. No claim that we'll know what year-end looks like at day 7.

### Bias 4 — Forced integration narrative
**v1 said:** "BackOffice and cohort ICPs only overlap ~10-20% but the two arms reinforce each other."
**The problem:** Contradictory. If customers don't overlap, the two products don't really "reinforce." I was selling the studio thesis without making the case.
**v2 fix:** Present the alternative (two separate companies) explicitly. Articulate the *real* integration — cohort curriculum *is* BackOffice's wedge; the cohort teaches "build a Scope Guardian for your industry" and uses BackOffice as the live reference. That's a real compounding asset, not a customer funnel.

### Bias 5 — Wrong audience for security marketing
**v1 said:** "'Built with zero-trust agent security from day one' — converts the judges' biggest criticism into our biggest differentiator."
**The problem:** Freelancers don't buy on security. Brokerages and small law firms do. v1 was selling enterprise language to bottom-of-market ICP.
**v2 fix:** Split §6 into Build (do these now), Defer (SOC 2, ABAC, per-agent identity), and Market (different language to different ICPs). Security investment becomes upmarket enablement, not freelancer copy.

### Bias 6 — Conflated TDM with a BackOffice vertical option
**v1 said:** Real estate TC was on the candidate list but tied with design studios.
**v2 (initial) said:** Real estate TC moves from "candidate" to "leading candidate" pending interviews.
**The problem:** Both v1 and the first cut of v2 treated real estate TC as a vertical BackOffice could pivot into. But Brent already has a separate, much more mature project (TDM) addressing that exact market. Treating real estate TC as a BackOffice vertical would have forced the two projects to either compete or merge — both bad outcomes. The correct framing: TDM is a parallel project, **not** a future BackOffice vertical.
**v2 fix:** Real estate TC removed from BackOffice's vertical candidate list. TDM stays structurally separate. BackOffice's vertical commit is from design studios / boutique law / dev shops / bookkeepers, picked on interview signal.

### Bias 7 — Studio model failure modes ignored
**v1 said:** Adopted studio model without addressing why studios commonly fail.
**The problem:** Documented patterns: identity-less builder, phantom founder, heterogenesis of ends, split focus. ([VentureStudioForum](https://newsletter.venturestudioforum.org/p/the-fatal-flaws-in-the-venture-studio))
**v2 fix:** Surface these explicitly in §3 and §9. Mitigations: each arm has one driver, products are the public brands not the studio, founders' agreement clarifies IP and equity.

### Bias 8 — Treated all market research as gospel
**v1 said:** "$297B Q1 2026 funding..." cited without source-quality assessment.
**The problem:** That's a marketing-fluff-or-real number. I cited it as evidence.
**v2 fix:** Direct sourcing notes. "Don't quote the $297B number in pitches without citing primary source."

### Bias 9 — Missed the strongest cohort-product compound
**v1 said:** "Cohort grads become BackOffice customers."
**The problem:** Weak compound — different ICPs make this a tiny conversion funnel.
**v2 fix:** The strong compound is: **the cohort's curriculum produces vertical AI agents, with BackOffice as the live reference implementation.** That's a real pedagogical asset and a real moat.

### Bias 10 — Gave fundraising guidance unprompted
**v1 said:** "Path A: lean into BackOffice, raise pre-seed ($500K-$1M)."
**The problem:** User said "build a business," not "find investors." I projected a venture path that wasn't asked for.
**v2 fix:** Bootstrap is the recommended posture. VC mentioned only as one explicit option at the day-90 gate.

### Bias 11 — Roadmap horizon too long for part-time founders
**v1 said:** 12-month plan with 5 phases.
**The problem:** Three part-time people don't credibly plan 12 months. They plan 90 days.
**v2 fix:** 90-day plan with six sprints and a hard gate at day 90.

### Bias 12 — Underweighted Melissa bandwidth uncertainty
**v1 said:** Plan assumed Melissa's full participation in Phase 2-3 design work.
**The problem:** Memory shows uncertain availability. Plan should be defensive.
**v2 fix:** Sprint 1 explicitly calibrates Melissa's actual weekly capacity. Plans for Sprints 2-3 adjust accordingly.

### What I'm still uncertain about (not corrected, just flagged)
- **Whether the integrated studio is actually right.** I recommend it but the alternative (two separate companies) is genuinely defensible. The team should make this call explicitly, not by inertia.
- **Whether $750 Beta is too cheap.** Cohort attendees value what they pay for. There's a real argument for $1,000 Beta.
- **Whether real estate TC is the right vertical commit.** I weighted it higher than v1 but interview signal beats research signal. We commit at Sprint 4, not now.
- **Whether to spin out BackOffice as a separate corp later.** Not urgent. Revisit at day 90.

---

## 13. The one-paragraph version

Future Proof Labs is a three-person AI studio. In April 2026, in 3 days at the OSS4AI hackathon, we shipped **BackOffice Agent** — a multi-agent platform that catches scope creep and turns it into signed, paid, audit-logged change orders for indie operators in services-heavy verticals (initial candidates: real estate transaction coordinators, boutique law, design studios, fractional CFOs). We placed 2nd, with judge feedback that confirmed the wedge and named the gaps we are now shipping against. Our second arm, **Build·Launch·Scale**, is a cohort and sprint program whose curriculum produces vertical AI agents — using BackOffice as the live reference implementation. Services pay the bills; SaaS compounds. We are bootstrapped, not raising, with a 90-day plan and an explicit re-evaluation gate. The next cohort starts when we say it does, and the next BackOffice vertical is chosen by interview signal, not assumption.

---

## Sources & research

### Market research
- [TechCrunch — SaaSpocalypse](https://techcrunch.com/2026/03/01/saas-in-saas-out-heres-whats-driving-the-saaspocalypse/)
- [Qubit Capital — Vertical SaaS 2026 trends](https://qubit.capital/blog/rise-vertical-saas-sector-specific-opportunities)
- [tech-insider.org — vertical SaaS retention](https://tech-insider.org/the-rise-of-vertical-saas-why-industry-specific-software-is-winning/)
- [The Branx — Q1 2026 funding (cite carefully)](https://thebranx.com/blog/q1s-vc-funding-record-and-where-ai-saas-are-heading-in-2026)
- [Stormy AI — productized service playbook](https://stormy.ai/blog/build-1m-productized-service-agency-playbook)
- [SelfEmployed — AI agents for solopreneurs 2026](https://www.selfemployed.com/news/ai-agents-for-solopreneurs-2026/)
- [Computerworld — freelancer demand and AI agents](https://www.computerworld.com/article/3986821/freelancer-demand-explodes-thanks-to-ai-agents.html)
- [Indie Hackers — AI MVP timeline benchmarks 2026](https://medium.com/@vicki-larson/in15-ai-micro-saas-ideas-ranked-by-launch-speed-market-saturation-2026-guide-96d4820a4ee4)

### Competitive landscape
- [Plutio — HoneyBook vs Dubsado vs Bonsai 2026](https://www.plutio.com/compare/honeybook-vs-dubsado)
- [Bonsai blog — Dubsado alternatives 2026](https://www.hellobonsai.com/blog/dubsado-alternatives)
- [Listed Kit — best transaction coordinator software 2026](https://www.listedkit.com/best-tc-software)
- [Dotloop](https://www.dotloop.com/) — real estate TC market leader
- [Capterra — dotloop vs SkySlope](https://www.capterra.com/compare/136372-172896/dotloop-vs-SkySlope)
- [Spellbook — AI tools for contract due diligence](https://www.spellbook.legal/learn/best-ai-tools-for-contract-due-diligence)
- [Clearstory — change-order management precedent](https://www.clearstory.build/)

### Cohort / bootcamp pricing
- [AI-First Mindset — $1,999 8-week bootcamp](https://aifirstmindset.ai/ai-bootcamp-for-business-leaders/)
- [Maven — End-to-End AI Engineering Bootcamp](https://maven.com/swirl-ai/end-to-end-ai-engineering)
- [TripleTen — best AI bootcamps 2026](https://tripleten.com/blog/posts/best-ai-engineering-bootcamps)

### Security architecture
- [Particula — Microsoft ZT4AI explained](https://particula.tech/blog/microsoft-zt4ai-zero-trust-ai-agents)
- [VentureBeat — Anthropic credential isolation](https://venturebeat.com/security/ai-agent-zero-trust-architecture-audit-credential-isolation-anthropic-nvidia-nemoclaw)
- [TrueFoundry — MCP / zero trust for agentic AI](https://www.truefoundry.com/blog/mcp-security)

### Studio model
- [VentureStudioForum — fatal flaws in the venture studio model](https://newsletter.venturestudioforum.org/p/the-fatal-flaws-in-the-venture-studio)
- [VC Stack — venture studio model deep dive](https://www.vcstack.io/blog/deep-dive-understanding-the-venture-studio-model)
- [Vestd — co-founder fallout horror stories](https://www.vestd.com/blog/startup-horror-stories-when-co-founders-fall-out)

### Compliance & buying signals
- [Vanta — SOC 2 audit cost, pre-revenue guidance](https://www.vanta.com/collection/soc-2/soc-2-audit-cost)
- [Spendflo — State of SaaS Buying Survey 2026](https://www.spendflo.com/blog/insights-from-the-state-of-saas-buying-survey)

### Internal references
- `docs/judge-feedback.md` — verbatim judge comments
- `docs/post-hackathon-plan.md` — Brent's technical roadmap
- `MARKET_RESEARCH.md` — original BackOffice competitive matrix and unit economics
- `Future Proof Labs (Brent, Nia, Mel).md` (Nia, in Downloads) — services arm strategy
