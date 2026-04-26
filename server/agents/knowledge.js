// Layer 3 — domain knowledge base for specialist agents.
// RAG-without-embeddings: keyed lookups, agent fetches just-in-time via the
// read_knowledge tool. Each entry capped at ~600 chars so a single fetch
// adds <1k tokens to the context.
//
// Edit these inline; no DB migration needed. Topics are namespaced by agent
// concern. Add new topics by adding a key + summary; agents discover them
// via list_knowledge_topics().

export const KNOWLEDGE = {
  // ── PRICING / PROPOSAL ─────────────────────────────────────────
  pricing_psychology: `Anchoring: always offer 2-3 tiers when budget allows; the top tier reframes the middle as reasonable, even if client picks middle. Specificity > generality — "Brand identity (logo, palette, type, 2 mark variants)" closes more than "Brand identity package". Charm pricing ($14,999) reads consumer-y in B2B; round to thousand. Risk bracket: estimate conservative AND ambitious internally, quote the conservative anchor so overruns become bonuses, not surprises. Decoy detection: mid-proposal "small additions" are scope tests — flag, don't absorb. Effective hourly anchor: most freelancers earn 0.6× their stated rate after admin/sales time, so price the gap.`,

  proposal_structure: `Standard freelance proposal sections in order: 1) Problem statement (1-2 sentences, client's words). 2) Approach (1 paragraph). 3) Deliverables (bulleted, specific). 4) Timeline with milestones. 5) Pricing breakdown. 6) Exclusions (what's NOT included). 7) Terms summary (payment schedule, revisions, IP). 8) Acceptance line. The exclusions section is the single highest-leverage scope-protection tool — every gap there becomes a future change order.`,

  // ── CONTRACT ────────────────────────────────────────────────────
  contract_landmines: `Auto-flag these high-severity clauses: (a) "Work for hire" without payment escrow — IP transfers before money does. (b) Unlimited revisions (cap at 2 rounds + hourly after). (c) IP assignment on signature instead of final payment — never sign. (d) Indemnification one-way (client only) — push for mutual. (e) Client-jurisdiction venue clauses — propose freelancer's home state OR neutral (Delaware). (f) "Best efforts" language — creates litigation exposure. (g) Exclusivity periods without retainer. (h) NDAs covering pre-existing IP — must carve out work created before engagement. (i) Late-fee absent (always include 1.5%/month past due).`,

  contract_protective_clauses: `Standard freelancer-protective clauses to include: 14-day termination with kill-fee (50% remaining contract value past discovery), 2 revision rounds at proposal stage then $/hr, IP transfers ONLY on final payment, mutual confidentiality, no liability for consequential damages, force majeure including illness/equipment failure, choice of law in freelancer's jurisdiction, late-payment 1.5%/month + collection costs.`,

  // ── SCOPE / SCOPE CREEP ────────────────────────────────────────
  scope_creep_phrases: `Soft-test phrases that disguise unpaid scope expansion: "while you're in there...", "this should be quick / shouldn't take long", "minor tweak / small addition", "what would it look like if..." (often wants a free draft), "the team was thinking..." (committee creep), "as we discussed verbally" (when no such agreement existed), "we're doing X anyway, can you just...", "one more thing", "real quick". Treat ALL as scope tests — respond with cost/timeline impact even if you'd ultimately do it free as goodwill.`,

  scope_creep_patterns: `Pattern: half-spec — client describes outcome without naming the surface ("make pricing page better"). Always flag and re-spec before quoting. Pattern: bundled ask — "X and Y" where X is in-scope and Y isn't; refuse to ride them together. Pattern: silent expansion — feature added in feedback comments without explicit request; surface the diff. Pattern: scope debt — a string of "small" asks that individually pass but collectively shift the ratio of paid:unpaid hours; track count, surface at threshold (3+).`,

  // ── INVOICE / COLLECTIONS ──────────────────────────────────────
  invoice_collections: `Cadence: issue invoices on Mondays — Friday invoices get lost in weekend mental queue. Net-15 collects ~9 days faster than Net-30 on small clients (<$5k); reserve Net-30 for established/enterprise. Specificity: line items must reference the milestone or deliverable explicitly — vague "project work" delays payment. Late-fee language: cite the contract clause in the invoice itself, not just a generic threat. Reminder cadence: day 7 friendly, day 14 firmer with contract clause cited, day 21 escalation note, day 30 collection-ready language.`,

  invoice_structure: `Standard invoice components: invoice number (sequential), client name + billing email, project reference, line items (description + qty + rate + line total), subtotal, tax if applicable, total, due date, payment instructions (preferred method first), late-fee clause reference, freelancer's business name + tax ID. One line per deliverable or milestone — never combine.`,

  // ── INSIGHT / FINANCIAL ────────────────────────────────────────
  finance_health_signals: `Watch-list signals: (a) Concentration risk — any single client >30% of last-90-days revenue = vulnerability. (b) Effective hourly drift — total revenue ÷ total hours (including admin/sales) should track stated rate; gap >35% means underpricing. (c) Collection-time creep — month-over-month avg collection days rising signals client cashflow trouble or weakening relationship. (d) Pipeline stagnation — proposal volume flat or declining + 30-day overdue rising = imminent revenue cliff. Flag each with the specific number, not generic advice.`
};

// Lightweight reverse index for agents to find available topics.
export function listKnowledgeTopics() {
  return Object.keys(KNOWLEDGE);
}

export function readKnowledge(topic) {
  if (typeof topic !== 'string') return null;
  return KNOWLEDGE[topic] || null;
}
