# BackOffice Agent

AI-powered back-office platform for freelancers and agencies. Five specialized agents handle proposals, invoices, contracts, scope management, and business insights.

## Stack

- **Backend:** Express 5 + PostgreSQL (raw `pg`, no ORM)
- **AI:** Anthropic Claude SDK (`@anthropic-ai/sdk`) with tool_use
- **Frontend:** React 19 + Vite
- **Auth:** JWT + bcrypt
- **Validation:** Zod at API boundaries
- **Deploy:** Railway (combined service — Express serves built React)

## Code Rules

- Semicolons always. Single quotes. `const` only — no `let` unless mutation required.
- Kebab-case file names: `scope-guardian.js`, `agent-config.js`
- Early returns. No deep nesting. Guard clauses first.
- No ORM. Parameterized queries only: `db.query('SELECT * FROM x WHERE id = $1', [id])`
- Zod schemas named with `Schema` suffix: `createClientSchema`, `generateProposalSchema`
- JSON error responses: `{ error: 'message' }` — never expose stack traces
- No `console.log` in production code. Use structured logger.
- JSONB for flexible document content (proposals, invoices, contracts)
- SSE for agent streaming (`text/event-stream`), not WebSockets

## Agent Architecture

- 5 agents: Proposal (Sonnet), Invoice (Haiku), Contract (Sonnet), Scope Guardian (Sonnet), Insight (Haiku)
- Dispatcher routes by intent keywords, manages workflows with task dependencies
- Each agent: system prompt + 3-6 tools (database operations). Zero tool overlap between agents.
- Tools return `{ success, data }` or `{ success: false, error }` — agents provide judgment, tools provide data

## Security

- Anthropic key server-side only — frontend never touches it
- JWT in Authorization header, bcrypt cost 12
- Rate limiting: 5/min auth, 10/min agent calls, 30/min general
- Zod validation on all API inputs before processing
- User ownership check on every resource access: `WHERE user_id = $1`
- No `dangerouslySetInnerHTML`. No raw SQL from user input.
- No m-dashes

## File Structure

```
server/
  index.js              — Express app, middleware, static serving
  db.js                 — pg Pool + query helper
  migrate.js            — Run schema.sql
  middleware/
    auth.js             — JWT verify → req.user
    validate.js         — Zod middleware factory
  routes/
    auth.js             — register, login
    clients.js          — CRUD
    projects.js         — CRUD
    agents.js           — 5 agent trigger endpoints (SSE)
  agents/
    dispatcher.js       — Intent routing + workflow orchestration
    agent-config.js     — All 5 agent configs (prompts, tools, models)
    tools.js            — Tool implementations (DB operations)
  schemas/
    index.js            — All Zod schemas
src/
  App.jsx               — Single-file React app
  main.jsx              — Entry
  index.css             — Styles
```

## Commands

```bash
npm run dev           # Start both server + client
npm run dev:server    # Server only (port 3000)
npm run dev:client    # Vite dev server (port 5173)
npm run build         # Build React for production
npm run db:migrate    # Run schema.sql
```
