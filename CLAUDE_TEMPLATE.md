# Project Name

<!-- One-line description of what this project does. -->

## Stack

<!-- List every major technology. Keep it scannable. -->
- **Backend:**
- **Frontend:**
- **Database:**
- **Auth:**
- **Validation:**
- **Deploy:**

## Code Rules

<!-- Project-wide style and convention rules. Be specific -- these are enforced by linting and code review. -->
- Semicolons always. Single quotes. `const` only -- no `let` unless mutation required.
- Kebab-case file names: `user-service.js`, `auth-middleware.js`
- Early returns. No deep nesting. Guard clauses first.
- JSON error responses: `{ error: 'message' }` -- never expose stack traces
- No `console.log` in production code. Use structured logger.

## Architecture

<!-- High-level description of how the system is organized. Mention key patterns (MVC, event-driven, agent-based, etc). -->

## Security

<!-- Non-negotiable security rules. Every contributor must follow these. -->
- API keys server-side only -- frontend never touches them
- Parameterized queries only -- no string interpolation in SQL
- Validate all API inputs before processing
- User ownership check on every resource access
- No `dangerouslySetInnerHTML`. No raw user input in SQL.

## File Structure

<!-- Keep this up to date. Annotate what each file/directory does. -->
```
server/
  index.js              -- App entry, middleware, static serving
  db.js                 -- Database connection + query helpers
src/
  App.jsx               -- Main application
  main.jsx              -- Entry point
```

## Commands

```bash
npm run dev             # Start development server
npm run build           # Production build
npm run lint            # ESLint check
npm run lint:fix        # ESLint auto-fix
npm test                # Run test suite
```

## Environment Setup

```bash
cp .env.example .env    # Fill in required values
npm install
npm run dev
```

## Linting

- ESLint flat config (`eslint.config.js`) with Prettier for formatting
- Rules enforce code style defined above: semicolons, single quotes, const-only, no unused vars
- `lint-staged` + `husky` pre-commit hook runs lint on staged files
- Run `npm run lint` before committing. CI will block PRs that fail lint.

## CI/CD

- **GitHub Actions** runs on every PR and push to main
- CI pipeline: `npm ci` -> `npm run lint` -> `npm run build` -> `npm test`
- Branch protection: require CI to pass before merge
<!-- Add deployment details: auto-deploy from main, staging environment, etc. -->

## Testing

<!-- Describe test strategy per layer. -->
- Test runner: Vitest
- Test files: `*.test.js` colocated with source, or in `__tests__/` directories
- Backend: test API routes with supertest, mock DB for unit tests
- Frontend: component tests with React Testing Library
- Run `npm test` locally, CI runs tests on every PR

## Known Issues / Tech Debt

<!-- Track issues here so future contributors (and Claude) don't rediscover them. Remove items as they're fixed. -->
- <!-- Issue 1 -->
- <!-- Issue 2 -->

## Design System

<!-- Optional. Include if the project has UI. Document colors, spacing, component patterns, typography. -->
<!-- Reference files, Figma links, or design tokens go here. -->
