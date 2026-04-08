# AI Agents Hackathon #31

**Event:** OSS4AI AI Agents Hackathon #31
**Dates:** April 11-12, 2026 (36 hours, 9 AM - 9 PM PST)
**Format:** Virtual | Teams of 1-3 | Free entry
**Prize:** Up to $50k in investments; 1st place interviews for $30k from Gravitational Ventures + Beta Fund AI Explorer program
**Judging:** AI Consortium leaders, 1-4 rating scale

## Project: NeuroAgent TC

AI-powered transaction coordination agents for real estate professionals — built for neurodivergent workflows.

### Core Concept

4 cooperating AI agents that automate the transaction coordination workflow:

1. **Contract Intake Agent** — Extracts parties, dates, prices, contingencies from uploaded PDFs
2. **Deadline Guardian Agent** — Monitors active transactions, calculates business days, sends proactive alerts
3. **Communication Agent** — Drafts milestone emails to all parties (buyers, sellers, agents, lenders, title)
4. **Compliance Agent** — Checks documents against brokerage checklists, flags missing items

### Architecture

```
┌─────────────────────────────────────┐
│         Orchestrator Agent          │
│   (Routes tasks, maintains state)   │
└──────────┬──────────────────────────┘
           │
    ┌──────┼──────────┬───────────────┐
    ▼      ▼          ▼               ▼
┌────────┐┌─────────┐┌────────────┐┌──────────┐
│Contract││Deadline ││Communication││Compliance│
│Intake  ││Guardian ││  Agent     ││  Agent   │
│Agent   ││Agent    ││            ││          │
└────────┘└─────────┘└────────────┘└──────────┘
```

### Existing Assets

Built on top of three existing projects:

- **Transaction Coordinator (TDM)** — Production real estate app with Claude PDF extraction, deadline tracking, PostgreSQL, AWS S3, compliance checklists
- **ADHD Budget MCP** — Multi-agent dispatcher pattern (6 agents), MCP protocol, task orchestration with dependencies and priorities
- **Flow State** — ADHD/neurodivergent market expertise, marketing infrastructure

### Business Case

- **TAM:** 6M US transactions/year x $350 avg TC fee = $2.1B
- **Wedge:** Solo agents and small brokerages who can't afford a TC
- **Moat:** State-specific compliance rules + business day logic
- **Revenue:** SaaS — $49/mo per agent, $199/mo per brokerage

### 36-Hour Build Plan

| Phase | Hours | Focus |
|-------|-------|-------|
| Foundation | 0-4 | Fork TDM, extract agent-dispatcher pattern from ADHD Budget MCP |
| Core Agents | 4-16 | Wire up 4 agents with Claude tool_use, ReAct orchestration |
| Demo Polish | 16-28 | Dashboard, agent reasoning visibility, end-to-end demo flow |
| Pitch | 28-36 | Pitch deck, business case, recorded demo |

### Tech Stack

- **Backend:** Node.js / Express / PostgreSQL
- **AI:** Anthropic Claude SDK (tool_use, PDF extraction)
- **Agent Pattern:** Dispatcher orchestration (ported from Python ADHD Budget MCP)
- **Frontend:** React 19 / Vite
- **Storage:** AWS S3 (document uploads)
- **Email:** SendGrid
- **Auth:** JWT + bcrypt

### Key Whitepaper Insights Applied

From **"A Practical Guide to Building Agents"** (OpenAI):
- Agent = Model + Tools + Instructions
- Use most capable model first, optimize later
- Three tool types: Data, Action, Orchestration

From **"Agents" whitepaper** (Google):
- ReAct orchestration loop for agent reasoning
- Extensions bridge agents to external APIs
- Cognitive architecture: observe → reason → act → adjust

From **"Identifying and Scaling AI Use Cases"** (OpenAI):
- Target workflows with complex decision-making, unstructured data, hard-to-maintain rules
- Six primitives: content creation, research, coding, data analysis, automation, ideation
- Real estate TC work hits all three pain points: repetitive tasks, skill bottlenecks, navigating ambiguity
