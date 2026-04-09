# BackOffice Agent — AI Agent System Design

## 1. Agent Configs

### Proposal Agent
- **Model:** Sonnet 4.6 (judgment: pricing strategy, scope framing)
- **Max iterations:** 4 | **Timeout:** 30s
- **Intent patterns:** `["write a proposal", "bid on this project", "client brief", "quote for", "pricing for", "send proposal"]`
- **System prompt keys:** You are a senior freelance business strategist. Given a client brief, extract requirements, estimate effort in hours, apply the user's rate card, and generate a structured proposal. Always itemize deliverables. Default to value-based pricing when project value is estimable. Never underprice — apply a complexity buffer of 15-25%.
- **Tools:** `getClientContext`, `getRateCard`, `getProposalTemplates`, `saveProposal`, `getHistoricalProjects`

### Invoice Agent
- **Model:** Haiku 4.5 (structured/templated output)
- **Max iterations:** 3 | **Timeout:** 15s
- **Intent patterns:** `["create invoice", "send invoice", "payment received", "who owes me", "outstanding invoices", "mark paid", "send reminder"]`
- **System prompt keys:** You generate and manage invoices. Use net-30 terms unless the client contract specifies otherwise. Always pull line items from the associated proposal or contract. When recording payments, calculate remaining balance. For reminders, escalate tone: friendly at 7 days, firm at 14, final notice at 30.
- **Tools:** `getInvoices`, `createInvoice`, `updateInvoiceStatus`, `getContractTerms`, `sendReminder`

### Contract Agent
- **Model:** Sonnet 4.6 (judgment: risk assessment, clause analysis)
- **Max iterations:** 5 | **Timeout:** 45s
- **Intent patterns:** `["generate contract", "review this contract", "risky clauses", "IP ownership", "terms and conditions", "NDA", "SOW"]`
- **System prompt keys:** You are a contract analyst for freelancers. When generating: use the user's template, populate from proposal data, ensure IP assignment is mutual-on-payment (not work-for-hire unless requested). When reviewing: flag unlimited liability, non-competes >6mo, IP grabs, payment terms >net-45, auto-renewal, and ambiguous scope language. Score risk 1-10. Always explain flags in plain English.
- **Tools:** `getContractTemplates`, `saveContract`, `getProposalData`, `flagRiskyClauses`, `getClientContracts`

### Scope Guardian
- **Model:** Sonnet 4.6 (judgment: behavioral intervention)
- **Max iterations:** 3 | **Timeout:** 10s
- **Intent patterns:** `["is this in scope", "client asked for extra", "scope creep", "change request", "they want me to also", "additional work"]`
- **System prompt keys:** You are a scope enforcement agent. Compare every incoming request against the contracted deliverables. If out of scope: name the specific contracted boundary, calculate the cost of the addition at the user's rate, and draft a polite client response that reframes as a paid change order. Tone: firm but warm — "happy to help, here's what that looks like." Never say "that's not my job" — always offer the path forward. This is the user's accountability partner.
- **Tools:** `getContractedScope`, `calculateChangeOrder`, `draftScopeResponse`, `logScopeEvent`

### Insight Agent
- **Model:** Haiku 4.5 (data aggregation, no complex judgment)
- **Max iterations:** 3 | **Timeout:** 15s
- **Intent patterns:** `["revenue this month", "how am I doing", "dashboard", "analytics", "top clients", "utilization", "celebrate", "milestone"]`
- **System prompt keys:** You analyze freelance business data. Report revenue, utilization rate (billable hours / available hours), average project value, and client concentration risk. When a milestone is hit (first $10k month, 100th invoice, etc.), celebrate it genuinely. Keep numbers honest — no vanity metrics. Format for quick scanning.
- **Tools:** `getRevenueData`, `getProjectMetrics`, `getClientAnalytics`, `getMilestones`

---

## 2. Tool Definitions

### Shared Pattern
All tools are DB operations returning JSON. Each follows: `{ success: boolean, data: T, error?: string }`.

### Proposal Agent Tools
```
getClientContext(clientId: string)
  → { name, email, history: Project[], avgProjectValue, paymentReliability }

getRateCard()
  → { hourlyRate, projectMinimum, rushMultiplier, complexityTiers: { simple, moderate, complex } }

getProposalTemplates(type?: "fixed" | "hourly" | "retainer")
  → { templates: { id, name, sections, defaultTerms }[] }

saveProposal(proposal: { clientId, title, lineItems: { description, hours, rate, amount }[], totalAmount, validUntil, notes })
  → { proposalId, status: "draft" }

getHistoricalProjects(filters?: { clientId?, type?, minValue? })
  → { projects: { title, actualHours, quotedHours, amount, clientSatisfaction }[] }
```

### Invoice Agent Tools
```
getInvoices(filters?: { clientId?, status?: "draft"|"sent"|"overdue"|"paid", dateRange? })
  → { invoices: { id, clientId, amount, status, dueDate, paidDate?, balance }[] }

createInvoice(invoice: { clientId, proposalId?, lineItems: { description, quantity, rate, amount }[], dueDate, terms })
  → { invoiceId, invoiceNumber, status: "draft" }

updateInvoiceStatus(invoiceId: string, update: { status, paidAmount?, paidDate?, notes? })
  → { invoiceId, newStatus, remainingBalance }

getContractTerms(clientId: string)
  → { paymentTerms, lateFeePercent, currency, invoiceRequirements }

sendReminder(invoiceId: string, escalationLevel: "friendly"|"firm"|"final")
  → { sent: boolean, messagePreview, nextEscalation }
```

### Contract Agent Tools
```
getContractTemplates(type: "sow" | "nda" | "msa" | "retainer")
  → { templates: { id, name, clauses: string[], variables: string[] }[] }

saveContract(contract: { clientId, type, clauses: { title, body }[], effectiveDate, endDate? })
  → { contractId, status: "draft" }

getProposalData(proposalId: string)
  → { title, lineItems, totalAmount, clientId, scope }

flagRiskyClauses(clauses: { title: string, body: string }[])
  → { flags: { clauseTitle, riskLevel: 1-10, issue, suggestion }[] }

getClientContracts(clientId: string)
  → { contracts: { id, type, status, effectiveDate, expiryDate, keyTerms }[] }
```

### Scope Guardian Tools
```
getContractedScope(clientId: string, projectId?: string)
  → { deliverables: string[], exclusions: string[], changeOrderProcess, originalQuote }

calculateChangeOrder(addition: string, estimatedHours: number)
  → { cost, newTotal, percentIncrease, rateApplied }

draftScopeResponse(context: { request: string, inScope: boolean, changeOrderCost?: number })
  → { clientMessage: string, internalNote: string }

logScopeEvent(event: { clientId, projectId, request, disposition: "in_scope"|"change_order"|"declined", amount? })
  → { eventId, totalScopeEvents, totalChangeOrderValue }
```

### Insight Agent Tools
```
getRevenueData(period: "week"|"month"|"quarter"|"year"|"custom", dateRange?: { start, end })
  → { total, byClient: { name, amount }[], byProject, trend, vsLastPeriod }

getProjectMetrics()
  → { activeProjects, avgProjectValue, utilizationRate, avgHoursOverQuoted, onTimeDeliveryRate }

getClientAnalytics()
  → { totalClients, topByRevenue: Client[], concentrationRisk, avgLifetimeValue, churnRate }

getMilestones()
  → { achieved: { type, value, date }[], upcoming: { type, target, current, percentComplete }[] }
```

---

## 3. Dispatcher Design

### Routing
```typescript
type AgentConfig = {
  name: string;
  intentPatterns: string[];
  model: "haiku-4.5" | "sonnet-4.6";
  tools: ToolDef[];
  systemPrompt: string;
  maxIterations: number;
  timeout: number;
};

// Score each agent's intent patterns against the user query
// using embedding similarity OR keyword TF-IDF (hackathon: keyword)
function routeRequest(query: string, agents: AgentConfig[]): AgentConfig {
  return agents
    .map(a => ({ agent: a, score: scoreIntent(query, a.intentPatterns) }))
    .sort((a, b) => b.score - a.score)[0].agent;
}
```

### Multi-Agent Workflows

**Workflow 1: New Client Onboarding**
```
Trigger: "new client" or "onboard [name]"
Steps:
  1. Proposal Agent → generate proposal from brief        [parallel-ready]
  2. Contract Agent → generate SOW from proposal           [depends on 1]
  3. Invoice Agent  → create deposit invoice from contract [depends on 2]
  4. Insight Agent  → log new client milestone             [depends on 1]
```

**Workflow 2: Scope Check (real-time)**
```
Trigger: "client asked for X" or "is this in scope"
Steps:
  1. Scope Guardian → check against contracted scope       [immediate]
  2. IF out of scope:
     a. Scope Guardian → calculate change order + draft response
     b. Invoice Agent  → prepare change order invoice      [depends on 2a]
```

**Workflow 3: Month-End Reconciliation**
```
Trigger: "month end" or "reconcile" or cron on 1st of month
Steps:
  1. Invoice Agent  → get all outstanding invoices         [parallel]
  2. Insight Agent  → generate revenue dashboard           [parallel]
  3. Invoice Agent  → send reminders for overdue           [depends on 1]
  4. Insight Agent  → check milestones, celebrate wins     [depends on 2]
```

**Workflow 4: Contract Review Pipeline**
```
Trigger: "review this contract" (with pasted/uploaded text)
Steps:
  1. Contract Agent → flag risky clauses                   [immediate]
  2. Scope Guardian → extract scope boundaries for monitoring [depends on 1]
  3. Proposal Agent → compare pricing against rate card    [parallel with 2]
```

### Dispatcher Implementation Pattern
```typescript
async function dispatch(workflow: Step[], context: WorkflowContext) {
  const completed = new Map<string, any>();
  const pending = [...workflow];

  while (pending.length > 0) {
    // Find steps whose dependencies are all satisfied
    const ready = pending.filter(s =>
      s.dependsOn.every(dep => completed.has(dep))
    );
    // Execute ready steps in parallel
    const results = await Promise.all(
      ready.map(s => executeAgent(s.agent, s.input(completed, context)))
    );
    // Move to completed
    ready.forEach((s, i) => {
      completed.set(s.id, results[i]);
      pending.splice(pending.indexOf(s), 1);
    });
  }
  return synthesizeResponse(completed);
}
```

---

## 4. Cost Analysis

| Agent | Model | Avg Input Tokens | Avg Output Tokens | Cost/Call |
|-------|-------|-----------------|-------------------|-----------|
| Proposal | Sonnet 4.6 | ~2,000 | ~1,500 | ~$0.021 |
| Invoice | Haiku 4.5 | ~800 | ~500 | ~$0.001 |
| Contract | Sonnet 4.6 | ~3,000 | ~2,000 | ~$0.030 |
| Scope Guardian | Sonnet 4.6 | ~1,200 | ~800 | ~$0.012 |
| Insight | Haiku 4.5 | ~1,000 | ~800 | ~$0.002 |

**Pricing assumptions:** Sonnet 4.6 at ~$3/1M input, $15/1M output. Haiku 4.5 at ~$0.25/1M input, $1.25/1M output. Includes tool_use round-trips (avg 2 per call).

**Monthly cost at scale (100 freelancers, 20 interactions/day each):**
- Weighted avg cost/interaction: ~$0.013 (60% Haiku calls, 40% Sonnet calls)
- 60,000 interactions/month = ~$780/month AI cost
- At $49/user/month = $4,900 revenue → **84% gross margin on AI costs**

**Key optimizations:**
- Haiku for Invoice + Insight (high-frequency, low-judgment) saves ~70% vs running all on Sonnet
- Prompt caching on system prompts (repeat per user) cuts input costs ~90% on cached portion
- Scope Guardian is cheap per-call ($0.012) — designed for frequent, fast checks

---

## 5. Prompt Engineering Notes

### Proposal Agent
- **Identity framing:** "Senior freelance business strategist" — not "AI assistant." Produces confident, opinionated proposals.
- **Anti-underpricing bias:** Explicit instruction to never round down, apply complexity buffers. Freelancers' #1 failure mode.
- **Historical grounding:** Tool access to past projects prevents quoting in a vacuum.

### Invoice Agent
- **Escalation ladder:** Three-tier reminder tone is hardcoded into the prompt, not left to model discretion. Consistency matters for client relationships.
- **Link to source of truth:** Always pulls line items from proposal/contract — never invents them.

### Contract Agent
- **Specific risk flags:** Named patterns (IP grabs, unlimited liability, >net-45) rather than "flag anything risky." Vague instructions produce vague results.
- **Plain English requirement:** Forces the model to explain legal concepts accessibly. The user isn't a lawyer.
- **Risk scoring rubric:** 1-10 scale with anchors prevents score clustering.

### Scope Guardian (THE MOAT)
- **Behavioral intervention pattern:** Borrowed from ADHD budget app — the agent doesn't just inform, it intervenes with a ready-made response. Reduces the activation energy to say "no."
- **Never negative framing:** "Happy to help, here's what that looks like" — not "that's out of scope." Preserves client relationships while holding boundaries.
- **Accountability partner identity:** This agent is on the freelancer's side, not neutral. It's protecting their revenue.

### Insight Agent
- **No vanity metrics:** Explicit instruction to keep numbers honest. Utilization rate, not "tasks completed."
- **Celebration triggers:** Milestone detection is specified (first $10k month, etc.) — creates emotional investment in the tool.

### Cross-Cutting Principles
- Every system prompt starts with a role identity (not "you are an AI").
- Every agent has a "never" instruction (guardrail) specific to its failure mode.
- Tools return structured data; the agent's job is judgment and synthesis, not data fetching.
- No agent can modify another agent's data directly — all writes go through that agent's own tools.
