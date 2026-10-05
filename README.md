# ShipPilot

ShipPilot helps developers turn a finished software project into a launch-ready GTM plan.

**Live app:** [shippilot.app.space](https://shippilot.app.space)

## What it does

1. Create a project brief with the audience, problem, and launch goal.
2. Generate grounded positioning and launch assets from the saved brief.
3. Edit, save, and copy the generated content.
4. Define a GTM experiment with a hypothesis, channel, message, metric, and target.
5. Record its status, results, and learning.
6. Track launch readiness from saved state rather than a synthetic score.

The public landing page stays at `/` for signed-out and signed-in visitors. Signed-in users can open the private dashboard at `/home`.

## Why I built it

AI makes building software faster, but developers still need to decide who the product is for, how to position it, what to launch with, and what experiment to run next. ShipPilot brings those decisions into one focused workspace.

## DeepSpace integrations

### Authentication

Native DeepSpace authentication protects the private app workspace. The landing uses an authentication-only provider; protected pages use the existing provider boundary and authentication gate.

### Records

Projects, launch kits, and experiments persist through DeepSpace Records. Synchronized queries display saved data after navigation and refresh.

### Permissions

Server-enforced `own` permissions protect private records using the server-assigned creator identity. Query filters organize records; they are not the authorization boundary.

### Managed AI

DeepSpace AI generates structured positioning and launch assets using saved project context. The server forwards the authenticated caller's token, so generation uses that user's AI credits.

### Authenticated server actions

AI generation and validated experiment saves use authenticated server actions with explicit project ownership checks. Experiment updates also verify the experiment owner and project association.

## Architecture

React/Vite renders the frontend. A Hono application on a Cloudflare Worker mounts DeepSpace authentication, Records runtime routes, and authenticated actions. Collection definitions and shared validators live in `src/schemas/`, registered through `src/schemas.ts`.

The client uses synchronized Records queries and confirmed mutations for project creation/editing, launch-kit editing, and deletion. Server actions handle AI generation and validated experiment creation/update. Record content lives in `record.data`; creator identity and timestamps live in the Records envelope.

Each project can have one launch kit and multiple experiments, linked by immutable `projectId` fields. The launch-kit schema enforces uniqueness on `projectId`. Readiness derives from the persisted brief, kit, and experiment records. Local form drafts are not the source of truth.

## AI generation

Saved project data is the factual source of truth and is treated as untrusted content, not instructions. The prompt discourages unsupported product claims, invented platforms or metrics, and absolute security/performance guarantees. Proposed next actions are distinguished from existing facts.

Structured output is validated before persistence. Malformed generations do not overwrite an existing saved launch kit; requests for a project with an existing kit return that kit. The action also rechecks the brief before saving a newly generated result. Users can edit the saved content. These controls improve grounding but do not replace human review of generated claims.

## Security

Records enforce ownership server-side. Privileged actions verify project ownership before accessing related data or making model calls; authenticated identity alone does not authorize a supplied record ID.

Generic developer-billed integration execution is disabled: the generic execution endpoint returns a denial without forwarding upstream. Managed AI still runs through its authenticated, ownership-checked action. Secrets stay on the server; `.dev.vars`, environment variants, and local DeepSpace state are ignored by Git. A sanitized `.env.example` is allowed by the ignore rules.

## Tradeoffs

These are deliberate scope decisions for a focused five-day submission:

- Experiments are manually run and recorded; there is no automatic external analytics collection.
- There are no social posting APIs or team/collaboration features.
- Related-record project deletion is sequential, not atomic. Partial failures or concurrent writes can leave an incomplete cleanup.
- Duplicate AI requests are collapsed within one isolate. Separate isolates could still incur multiple model calls even though only one kit can persist.
- The known approximately 500 kB client bundle warning is not treated as a correctness issue.

## Testing

The latest implementation verification passed production build, TypeScript validation, unit tests, lint, and the full browser suite with zero skips on the successful run. One initial browser-context setup timeout passed on a full rerun. Documentation-only edits do not change those application results.

Unit coverage includes ownership checks, structured AI validation/failure handling, experiment validation, readiness, and deletion sequencing. Browser coverage includes project creation/editing/persistence, launch-kit editing/copying and failure recovery, experiments, deletion, navigation guards, and landing/protected-route authentication. Two authenticated test accounts exercise Records ownership isolation. Browser tests substitute the paid AI boundary; real AI generation and prompt grounding were also manually checked during development.

## Local development

Use a Node version accepted by `package.json`: Node 22.15+ on the 22 line, 24, or 26, with npm 11.6+.

```sh
npm ci
npm run login # if the DeepSpace CLI is not authenticated; complete browser login
npm run dev
```

Use the URL reported by the development server. Do not place credentials in commands or commit local secret files.

```sh
npm run build
npm run validate # TypeScript and unit tests
npm run lint
npm run test:e2e -- --port 5180
git diff --check
```

The E2E preflight requires two usable local DeepSpace test accounts and authenticates both before the suite. Missing or unusable account setup fails verification rather than silently skipping critical workflows. Use an available port; the test runner owns its server.

## Deployment

```sh
npm run deploy
```

This configured script runs `deepspace deploy`. For the default DeepSpace-source workflow, review and commit the intended changes before deploying; the release requires a clean worktree. Keep credentials in DeepSpace's secret management. Deployment is a separate operation from local verification.

## Known limitations / Next

Potential follow-up work includes automatic campaign metrics, external distribution integrations, collaboration, stronger multi-record transactional cleanup, and distributed AI request coordination. None is part of the current submission scope.
