# BackOffice Agent

AI-powered back-office platform for freelancers and agencies. Five specialized agents handle proposals, invoices, contracts, scope management, and business insights -- replacing 5+ tools with one intelligent system.

> Stop losing $11,400/year to scope creep. BackOffice Agent is your AI operations team.

## Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| **Proposal Agent** | Sonnet | Generates context-aware proposals with pricing, timeline, deliverables |
| **Invoice Agent** | Haiku | Creates, tracks, and chases invoices |
| **Contract Agent** | Sonnet | Drafts contracts, reviews incoming ones, flags risky clauses |
| **Scope Guardian** | Sonnet | Real-time scope creep intervention with change order generation |
| **Insight Agent** | Haiku | Revenue analytics, overdue tracking, milestone celebrations |

## Architecture

```
Express API + React Frontend (Railway)
    |
    v
Agent Dispatcher (intent routing + workflow orchestration)
    |
    +-- Proposal Agent (Sonnet) -- 5 tools
    +-- Invoice Agent (Haiku)   -- 4 tools
    +-- Contract Agent (Sonnet) -- 4 tools
    +-- Scope Guardian (Sonnet) -- 3 tools
    +-- Insight Agent (Haiku)   -- 3 tools
    |
    v
PostgreSQL (8 tables, JSONB documents)
```

## Quick Start

```bash
# Install
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and ANTHROPIC_API_KEY

# Create database tables
npm run db:migrate

# Run development servers
npm run dev
```

## Tech Stack

- **Backend:** Express 5, PostgreSQL, Zod, JWT + bcrypt
- **AI:** Anthropic Claude SDK with tool_use (Haiku 4.5 + Sonnet 4.6)
- **Frontend:** React 19, Vite
- **Deploy:** Railway (combined service)

## Business Case

- **Market:** $40.5B invoice processing market, 73M US freelancers, zero agentic competitors
- **Moat:** Scope Guardian behavioral intervention (ported from production ADHD intervention system)
- **Unit Economics:** ~$0.013/interaction, 78-82% gross margin at $55 ARPU

---

Built for [AI Agents Hackathon #31](https://luma.com/88o1d1d7) -- April 11-12, 2026
