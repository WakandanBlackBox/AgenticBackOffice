# BackOffice Agent - Production App Technical Audit

**URL:** https://agenticbackoffice-production.up.railway.app/  
**Audited:** 2026-04-12  
**Deploy Target:** Railway (single service -- Express serves built React)  
**Auth:** JWT + bcrypt (logged in as Alex Rivera / demo@backoffice.ai)

---

## App Shell & Layout

- Dark theme with icon-based sidebar (left) and top header bar
- Sidebar contains: BackOffice logo, 7 nav items, user profile section with sign-out
- Top header: page title, search bar, notification bell, user avatar (initials)
- Consistent layout across all views -- sidebar persists, content area swaps

## Navigation Structure

| # | Nav Item | Route |
|---|----------|-------|
| 1 | Dashboard | `/` (default) |
| 2 | Projects | `/projects` |
| 3 | Clients | `/clients` |
| 4 | Milestone Board | `/milestones` |
| 5 | AI Chat | `/chat` |
| 6 | Getting Started | `/getting-started` |
| 7 | Activity Log | `/activity` |

---

## Page-by-Page Breakdown

### 1. Dashboard

**KPI Cards (4 across):**

| Metric | Value | Subtext |
|--------|-------|---------|
| Pipeline Value | $75,000 | 6 active projects |
| Total Clients | 4 | -- |
| Revenue (30d) | $7,500 | -- |
| Outstanding | $16,000 | 1 overdue |

**Active Projects list:** 6 projects displayed as rows with project name, client name, and budget amount.

**Upcoming Milestones panel:** Right-side card, currently shows "No upcoming milestones" (all existing milestones are already approved).

### 2. Projects

- **Count:** 9 total projects displayed in a responsive card grid (4 columns)
- **Card contents:** Project name, client name (or "No client"), budget, status badge
- **Status badges:** Active (blue), Cancelled (red), Completed (green)
- **Actions:** 3-dot menu on each card (edit/delete/status controls)
- **Create:** "+ New Project" button (top-right)

**Sample data:**

| Project | Client | Budget | Status |
|---------|--------|--------|--------|
| Project Wakanda | Acme Design | $10,000 | Active |
| Test Milestone Project (x3) | No client | $10,000 | Mixed |
| Website Redesign | Acme Design | $8,000 | Active |
| Acme Q1 Marketing Site | Sarah Chen | $6,000 | Completed |
| Acme Brand Redesign | Sarah Chen | $15,000 | Active |
| StartupX MVP Dashboard | Marcus Johnson | $24,000 | Active |
| DesignHub Website Refresh | Priya Patel | $8,000 | Active |

### 3. Project Detail

Accessed by clicking a project card. Contains:

**Header section:**
- Project name (large heading)
- Client name
- Status badge + Edit / Delete buttons
- Budget amount (right-aligned)
- Status dropdown (Active / On Hold / Completed / Cancelled)

**AI Agent Action Buttons (5):**

| Button | Agent | Purpose |
|--------|-------|---------|
| Generate Proposal | Proposal Agent (Sonnet) | Create project proposals |
| Create Invoice | Invoice Agent (Haiku) | Generate invoices |
| Draft Contract | Contract Agent (Sonnet) | Draft contracts |
| Check Scope | Scope Guardian (Sonnet) | Detect scope creep |
| Open Chat | Chief Agent | Free-form AI conversation |

**Milestones section:**
- Progress bar with "X of Y approved" counter and percentage
- Individual milestones listed with name, amount, approval status
- "Approval Needed" badges for milestones pending client action
- Buttons: Refresh, + Add, Share with Client

**Payment Summary sidebar (right):**
- Total, Paid, Remaining amounts
- Visual progress bar

**Tabbed history section (bottom):**

| Tab | Description |
|-----|-------------|
| Proposals (0) | AI-generated proposals |
| Invoices (0) | Generated invoices |
| Contracts (0) | Drafted contracts |
| Scope Events (0) | Scope creep detections |
| Milestones (3) | Milestone records |

### 4. Clients

- **Count:** 4 total clients in card grid (3 columns)
- **Card contents:** Avatar (initials), name, email, company, notes
- **Create:** "+ Add Client" button (top-right)

**Client data:**

| Name | Email | Company | Notes |
|------|-------|---------|-------|
| Acme Design | acme@test.com | acme | -- |
| Priya Patel | priya@designhub.co | DesignHub | Agency partner, recurring work |
| Marcus Johnson | marcus@startupx.io | StartupX | Startup, watch for scope creep |
| Sarah Chen | sarah@acmecorp.com | Acme Corp | Enterprise client, fast payer |

### 5. Milestone Board

Kanban-style board with 4 columns:

| Column | Count | Color |
|--------|-------|-------|
| Pending | 0 | White |
| In Progress | 0 | Blue |
| Awaiting Approval | 0 | Yellow |
| Approved | 3 | Green |

Milestone cards show: name, project name, dollar amount.

Current milestones (all in Approved column, Project Wakanda):
- Discovery -- $2,000
- Design -- $3,000
- Development -- $5,000

### 6. AI Chat

- Project selector dropdown (top-left): "All projects" with per-project filtering
- Center prompt: "Ask your AI back-office team anything" with subtitle about Chief Agent routing
- Quick-prompt suggestion chips: "How am I doing?", "Overdue invoices?", "Pipeline status"
- Chat input at bottom with Send button
- SSE streaming for real-time agent responses

### 7. Getting Started

Onboarding knowledge base with 3 expandable accordion sections:

1. **Set Your Rate** -- guidance on freelancer pricing
2. **Land Your First Client** -- client acquisition tips
3. **Protect Your Work** -- contracts and scope protection

### 8. Activity Log

**Summary KPI Cards (4 across):**

| Metric | Value |
|--------|-------|
| Total Calls | 50 |
| Total Tokens | 365,802 |
| Total Time | 853.1s |
| Est. Cost | $0.14 |

**Agent Usage Breakdown (color-coded badges):**

| Agent | Calls | Color |
|-------|-------|-------|
| Chief Agent | 9 | Red |
| Proposal Agent | 11 | Yellow |
| Invoice Agent | 13 | Green |
| Contract Agent | 12 | Blue |
| Scope Guardian | 5 | Purple |

**Log entries:** Expandable rows showing:
- Agent badge (color-coded)
- Project name
- Duration (seconds)
- Token count
- Cost estimate
- Relative timestamp

**Export:** "Export Logs" button (top-right) for JSON export.

---

## Architecture Summary

### Agent System
- **5 specialized agents** + Chief dispatcher
- Each agent has its own system prompt and 3-6 tools (zero tool overlap)
- Chief Agent routes by intent keywords
- Models: Sonnet for complex tasks (Proposal, Contract, Scope Guardian), Haiku for simpler tasks (Invoice, Insight)

### Client Trust Layer
- Milestone-based approval workflow
- Shareable client portal (via share tokens)
- Progress tracking with visual indicators
- Payment summary tied to milestone completion

### Observability
- Every agent call logged with duration, tokens, and cost
- Per-agent usage breakdown
- JSON export capability
- Estimated cost uses `estimateCost()` utility

### Token Management
- Prompt caching (`cache_control: { type: 'ephemeral' }`) on system prompts
- Daily token budget gating (`DAILY_TOKEN_BUDGET` env var, default 500k)
- Tool result capping at 2,000 chars
- Scope creep classifier skips short messages (<20 chars)

---

## Notable Observations

1. **Demo data is well-seeded** -- realistic client names, companies, budgets, and notes make the app feel production-ready
2. **Cost efficiency is remarkable** -- 50 agent calls for $0.14 total demonstrates effective prompt caching
3. **All milestones are approved** -- the "Upcoming Milestones" dashboard card shows empty because no milestones are in pending/in-progress state
4. **Test data exists** -- 3 "Test Milestone Project" entries suggest development testing artifacts that should be cleaned before demo
5. **No proposals/invoices/contracts generated yet** for Project Wakanda despite being the most complete project -- the tabbed section shows (0) for all document types
6. **Milestone Board only shows Project Wakanda milestones** -- other projects have no milestones configured yet
