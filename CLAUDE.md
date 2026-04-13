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

## Work Rules

### Token Management (Server-Side)
- Every agent system prompt must use `cache_control: { type: 'ephemeral' }` on the system message
- Mark the last tool definition with `cache_control` so tool schemas are cached across iterations
- System prompts must stay under 200 words. No verbose examples -- use compressed rule lists
- `maxTokens` must be tuned per agent. Simple agents (invoice, insight) get lower caps (512-768)
- Tool results sent back to the model are capped at 2000 chars via `capResultSize()`
- DB queries in tools must use LIMIT clauses (max 5 rows) and SELECT only needed columns
- `get_past_proposals` returns titles/pricing only, never full proposal content
- Delegation responses truncated to 1500 chars before returning to Chief
- Agent logs store only input summary (500 chars) and output summary (500 chars), not full conversation
- Scope creep classifier skips messages under 20 chars or without scope-creep keywords
- All agent endpoints are gated by daily token budget (`token-budget.js`)
- `DAILY_TOKEN_BUDGET` env var controls per-user daily limit (default: 500,000 tokens)
- Cost estimates use `estimateCost()` in dispatcher and are included in `agent_complete` events
- When adding new tools, keep `input_schema` minimal -- every property adds to cached tool token count
- When adding new agents, follow the compressed prompt pattern in `agent-config.js`

## Design System

When building new screens or UI, follow the design system in `/reference/landing-design/`. Read the reference components before building anything visual.

### Core Aesthetic
- Dark-first: page bg `#060A14`, surface bg `#0B1120`, borders `#1E293B`
- Blue accent family: primary `#2563EB`, secondary `#1D4ED8`, light `#3B82F6`
- Text: headings `#E2E8F0`, body `#94A3B8`, muted `#475569`
- Font: Plus Jakarta Sans (400/500/600/700/800) -- import from Google Fonts
- Heading letter-spacing: `-0.02em` via inline style

### Layout Rules
- All sections use `.section-padding` (`py-24 md:py-28 lg:py-32`)
- Container max-width 1200px, centered, 1.5rem padding
- Section header: centered h2 + subtitle `max-w-xl mx-auto`, `mb-16` to content below
- Use `<span className="text-gradient-blue">` for keyword emphasis in headings
- Grids: 2-col (`gap-12`), 3-col (`gap-6`), asymmetric (`grid-cols-[1fr_2fr]`)

### Card Pattern
- `rounded-[16px]` bg `#0B1120` border `1px solid #1E293B`
- Padding `p-6` or `p-8`, apply `.card-shadow` utility class
- Hover: `hover:-translate-y-1 transition-all`

### Icon Box Pattern
- `w-12 h-12 rounded-lg flex items-center justify-center` bg `rgba(37,99,235,0.15)`
- Icon: `size={24} className="text-blue-primary"`, `mb-5` spacing to heading

### Animation Rules (Framer Motion)
- Standard entrance: `initial={{ opacity: 0, y: 20 }}` / `whileInView={{ opacity: 1, y: 0 }}` / `viewport={{ once: true }}` / `transition={{ duration: 0.5 }}`
- Stagger children: add `delay: 0.1` increments per element
- Hero/above-fold: use `animate` not `whileInView` (loads immediately)
- Split layouts: `x: -30` left side, `x: 30` right side
- CTA lift on hover: `hover:-translate-y-0.5`

### Button Styles
- Primary CTA: `bg-blue-primary hover:bg-blue-secondary text-white rounded-lg px-8 py-6 font-semibold glow-blue hover:-translate-y-0.5`
- Outline: `border-blue-primary/50 text-blue-primary hover:bg-blue-primary/10 rounded-lg`
- Nav pill CTA: `bg-white text-dark-base rounded-full px-5 py-2`

### Glass / Blur
- Navbar: `backdrop-blur-xl bg-white/[0.06] ring-1 ring-white/[0.08] rounded-full`
- Glass cards: `backdrop-blur-sm` with semi-transparent dark bg

### Gradients
- Hero bg: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(37,99,235,0.22) 0%, rgba(11,17,32,0.6) 50%, #060A14 100%)`
- CTA bg: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(37,99,235,0.18) 0%, #060A14 100%)`
- Text gradient: `.text-gradient-blue` utility (defined in `reference/landing-design/index.css`)

### Reference Files
- `reference/landing-design/tailwind.config.ts` -- full theme tokens, merge into project Tailwind config
- `reference/landing-design/index.css` -- CSS variables, utility classes (`.glow-blue`, `.card-shadow`, `.section-padding`, `.text-gradient-blue`, `.bg-hero-gradient`), merge into project CSS
- `reference/landing-design/HeroSection.tsx` -- hero layout, staggered load, primary CTA
- `reference/landing-design/FeatureStrip.tsx` -- 3-col card grid, icon box pattern
- `reference/landing-design/AlternatingFeatures.tsx` -- 2-col split, scroll timeline, glowing dots
- `reference/landing-design/ShowcaseSection.tsx` -- glass card, chat mockup, backdrop-blur
- `reference/landing-design/Navbar.tsx` -- glass pill nav, scroll-collapse, mobile menu
- `reference/landing-design/deps.md` -- required npm packages
