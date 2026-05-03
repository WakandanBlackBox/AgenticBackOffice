# BackOffice Agent

AI-powered back-office platform for freelancers and agencies. Five specialized agents handle proposals, invoices, contracts, scope management, and business insights.

## Stack

- **Backend:** Express 5 + PostgreSQL (raw `pg`, no ORM)
- **AI:** Anthropic Claude SDK (`@anthropic-ai/sdk`) with tool_use
- **Frontend:** React 19 + Vite
- **Auth:** JWT + bcrypt
- **Validation:** Zod at API boundaries
- **Deploy:** Railway (combined service — Express serves built React)

## Effort Level

- Default effort is `high` (set in user settings). This is correct for most coding tasks.
- Use `/effort max` for planning, architecture decisions, complex debugging, and code review -- anywhere reasoning quality matters more than speed.
- Do not use max for routine edits, simple bug fixes, or straightforward CRUD work.

## Workflow

For non-trivial features (anything touching >1 file or >1 area):

1. **Plan mode first.** Enter plan mode (Shift+Tab) before writing code. Force codebase exploration via Explore subagent before proposing structure.
2. **End every plan with unresolved questions.** A short, numbered list. If there are none, say so explicitly. No questions = high risk of wrong assumptions.
3. **Multi-phase if work spans >1 phase.** If the plan has more than one phase, it MUST be a multi-phase plan with discrete checkpoints. Each phase ends with a review pause.
4. **Persist multi-phase plans as GitHub issues.** Before starting phase 1, run `gh issue create` with the full plan in the body. Update the issue (check off items) after each phase. This survives context resets — when context fills, clear it and resume with `gh issue view <n>`.
5. **Stage between phases.** After each phase, `git add` the phase's changes (don't commit yet) so the next phase's diff is clean. Commit at natural breakpoints, not every phase.
6. **Branch prefix `bt/`.** AI-authored branches use `bt/<short-description>` (e.g., `bt/diff-cli`, `bt/fix-pipeline-bigint`).
7. **External edits → tell Claude.** If the user edits files outside Claude (formatter, manual change), tell Claude `pull <file> into your context` before continuing.
8. **Plan output is telegraphic.** Plan bodies use sentence fragments, drop articles ("the", "a"), and skip hedge words. Example: `add diff CLI; flexible match; overwrite ok` not `This adds a diff CLI command that supports flexible matching and will overwrite existing files`. The "Why" lines and unresolved questions stay in normal prose. Applies to plans only — chat replies, commits, and code comments unchanged.

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

- 5 specialist agents + Chief orchestrator. All currently use Haiku (`claude-haiku-4-5-20251001`) -- Sonnet disabled during hackathon (see `agent-config.js` MODELS)
- Dispatcher routes by intent keywords, multi-domain queries go to Chief
- Each agent: system prompt + 3-6 tools (database operations). Zero tool overlap between agents.
- Tools return `{ success, data }` or `{ success: false, error }` -- agents provide judgment, tools provide data
- Chief delegates via `delegate_to_agent` meta-tool with max depth 2
- Pre-built workflows: `onboardingWorkflow` (proposal -> contract + invoice) and `scopeCheckWorkflow`

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
  index.js              -- Express app, middleware, static serving
  db.js                 -- pg Pool + query helper
  schema.sql            -- Full database schema
  migrate.js            -- Run schema.sql
  seed.js               -- Idempotent demo data (demo@backoffice.ai)
  middleware/
    auth.js             -- JWT verify -> req.user
    validate.js         -- Zod middleware factory
  routes/
    auth.js             -- register, login
    clients.js          -- CRUD
    projects.js         -- CRUD
    agents.js           -- 5 agent trigger endpoints (SSE) + chat router
    documents.js        -- Document retrieval
    dashboard.js        -- Aggregated KPIs, pipeline, milestones
    milestones.js       -- Milestone CRUD + approval flow + share tokens
    client-portal.js    -- Public portal (no auth, token-gated)
  agents/
    dispatcher.js       -- Intent routing + workflow orchestration
    agent-config.js     -- All agent configs (prompts, tools, models)
    tools.js            -- Tool implementations (DB operations)
    delegate.js         -- Chief -> sub-agent delegation meta-tool
    token-budget.js     -- Daily per-user token budget gating
  schemas/
    index.js            -- All Zod schemas
src/
  App.jsx               -- Main app (all views, reducer, chat streaming)
  LandingView.jsx       -- Marketing landing page
  main.jsx              -- Entry
  index.css             -- Styles
  components/ui/        -- shadcn/ui primitives (button, card, badge, input, textarea, separator)
  lib/utils.js          -- cn() helper
```

## Commands

```bash
npm run dev           # Start both server + client
npm run dev:server    # Server only (port 3000)
npm run dev:client    # Vite dev server (port 5173)
npm run build         # Build React for production
npm run db:migrate    # Run schema.sql (idempotent: ALTER TABLE ... ADD COLUMN IF NOT EXISTS for evolutions)
npm run db:seed       # Seed demo data (idempotent)
npm start             # Production start (no env-file flag — Railway provides env)
```

No `lint`, `test`, or `lint:fix` scripts — ESLint, Vitest, lint-staged, husky, and GitHub Actions are NOT installed. `npm run build` is currently the only validation gate. Prefer adding scripts when the tooling is actually wired up rather than referencing them aspirationally.

## Environment Setup

```bash
cp .env.example .env  # Fill in DATABASE_URL, ANTHROPIC_API_KEY, JWT_SECRET
npm install
npm run db:migrate
npm run db:seed       # Creates demo user: demo@backoffice.ai / demo1234
npm run dev
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

## Linting / Testing / CI

**Currently NOT set up** — flagged as tech debt:
- No ESLint config, no `lint` / `lint:fix` scripts. Code style (semicolons, single quotes, const-only) is enforced by convention only.
- No Vitest, no `test` script, no test files anywhere in the repo. Zero coverage.
- No GitHub Actions workflow, no CI. PRs are not gated.
- No `lint-staged` / `husky` pre-commit hooks.

Railway auto-deploys from `main` on push. The only validation gate today is `npm run build` succeeding.

When wiring these up, do it in this order: (1) ESLint flat config + `lint` script, (2) Vitest + first test on agent tools, (3) GitHub Actions running both, (4) branch protection. Don't document scripts in this file before they exist.

## Zod patterns (validation gotchas)

When writing or modifying schemas in `server/schemas/index.js`:

- **Optional fields the client may send as `null`** — use `.nullish()` not `.optional()`. `.optional()` accepts only `undefined`; `.nullish()` accepts both. The chat endpoint's `project_id` 400'd silently for "All projects" requests until this was fixed (commit on feat/agent-specialization).
- **PATCH routes** — never interpolate Zod-validated field names directly into SQL. Use a column allowlist. Today's `documents.js` PATCH routes are fragile this way; flagged in tech debt below.
- **Cents** — always `z.number().int().nonnegative()`. Don't use `.positive()` (rejects 0, breaks zero-budget seeds).
- **UUIDs from URL params** — the route validates separately; don't double-validate in the body schema unless it's a different resource.
- **Dates** — `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` for YYYY-MM-DD; pg coerces correctly. Don't use `z.date()` — Zod won't parse a string into one without `.coerce.date()`.
- **Enums that match a DB CHECK constraint** — keep them in lockstep. If the schema list and the SQL CHECK list drift, the API accepts values the DB rejects → 500s on insert.
- **`.passthrough()` is dangerous** — silent attribute sneak-through. Default to strict objects; only relax when there's a real reason.

When in doubt, mirror an existing schema in the file rather than inventing a new pattern.

## Known Issues / Tech Debt

- `rejectUnauthorized: false` in `db.js` -- needs to be `true` for production SSL
- PATCH routes interpolate Zod-validated field names into SQL -- works but fragile, should use column allowlists
- No pagination on list endpoints (clients, projects, invoices)
- No security headers (helmet not installed)
- JWT stored in localStorage -- vulnerable to XSS, should be HttpOnly cookie
- No token refresh -- 7-day expiry, silent logout
- Frontend is a 2,174-line monolith (`App.jsx`) -- needs component extraction
- SSE streaming has no reconnection/retry on disconnect
- `react` and `react-dom` are in devDependencies instead of dependencies
- No `DELETE /projects/:id` route despite frontend UI supporting it
- Agent config says Sonnet in comments but all agents use Haiku

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
