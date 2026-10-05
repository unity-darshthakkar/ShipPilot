# ShipPilot Phase 2: AI Launch Kit

Saved projects now generate one private, editable launch kit. No regeneration,
experiments, crawling, integrations beyond DeepSpace AI, or additional dependencies.

## Generation and billing

`POST /api/actions/build-launch-kit` takes only `{ projectId }`. The existing
action router verifies the bearer JWT. Because action tools bypass Records RBAC,
the action loads the project and compares its server-assigned `createdBy` to the
verified caller before reading a kit or making any paid request. It validates the
saved brief and never accepts duplicate project contents from the client.

The server uses `createDeepSpaceAI(env, 'openai', { authToken: callerJwt })`,
then AI SDK `generateText` with `Output.object({ schema: launchKitContent })`.
This goes through DeepSpace's native AI proxy; no provider keys or direct provider
calls are added. Model: `gpt-4.1-mini`, maximum 4,000 output tokens, 90-second
timeout, zero automatic retries. The signed-in caller pays from their DeepSpace
AI credits. This is independent of the starter's generic integration billing map.

The complete response is validated again before saving. Streaming is omitted so
partial, unvalidated content never appears as saved. The project is reloaded
before persistence to reject deletion, ownership changes, or a changed brief.

The system prompt separates untrusted project JSON from instructions, forbids
invented claims and hype, and does not grant tools or fetch URLs. Output renders
as React text, never HTML. Prompt instructions reduce injection risk but cannot
guarantee factual model output; users should review all claims before publishing.

## Records and editing

`launchKits` fields: `projectId`, `targetAudienceSummary`, `coreProblem`,
`valueProposition`, `oneLiner`, `keyMessages`, `launchPost`, `socialPost`,
`demoScript`, `launchChecklist`. Messages are exactly three strings; the checklist
has five to eight strings. These arrays use native JSON columns. Creator and
created/updated timestamps come from the Records envelope.

Only the ownership-checked action can create kits. Viewer/member/admin roles can
read, edit, or delete only their own kits. Client writable fields exclude
`projectId`; that association is immutable. `uniqueOn: ['projectId']` is the
database guarantee of at most one saved kit per project.

Overview readiness derives from the persisted, valid record. Positioning and
Launch Kit tabs display the saved content. All nine content fields can be edited;
explicit confirmed Records writes update only the fields in the selected section.
Drafts stay in place on save errors. Copy buttons use the browser clipboard API.
Changing the project brief does not silently change its previously generated kit.

The UI disables generation while pending and also uses a synchronous ref guard.
The server collapses concurrent calls for the same user/project within one worker
isolate. Repeated requests return an existing kit without regeneration. Inserts
use generated IDs, never an upsert that could replace content. The database
uniqueness constraint handles cross-isolate races without destructive overwrites.
Two simultaneous first requests in separate isolates can still incur two AI calls;
strict global billing deduplication would require durable generation coordination.

Generation failures do not delete or update saved content. Credit and rate-limit
failures have specific messages; malformed outputs and connectivity failures allow
retry. Logs include only the stage, error category and HTTP status, never prompts,
provider bodies, keys, or project content. Regeneration is intentionally deferred.

## Verification

Run `npm run validate`, `npm run lint`, `npm run build`, and
`npm run test:e2e -- --port 5180`. Validate includes TypeScript and Vitest.

Unit tests use the actual DeepSpace AI proxy adapter and AI SDK structured-output
parser, substituting only outbound HTTP. Action-tool fixtures cover denial before
AI, saved-project input, validation, credit failures, concurrent requests, changed
briefs, existing-kit preservation, and uniqueness-race handling.

Browser tests use real DeepSpace test-account authentication, the actual action,
and real Records/WebSocket permissions. An explicit `tests/vite.config.ts` binds a
local auxiliary service in place of the paid AI service. That service provides
valid or malformed completion responses. The ordinary development and production
configs never bind it. No frontend action or Records response is mocked.

Browser coverage includes malformed-output recovery, duplicate clicks, generation,
reload, validation errors, editing both sections, confirmed saves, reload after
edits, clipboard content, mobile width, immutable association/client creation
denial, anonymous denial, cross-user generation/read/update/delete denial, and
readiness derived from persisted data. Tests delete their own records.

No real paid model generation was performed during implementation.

## Manual check

1. Start the ordinary server with `npm run dev` (not the test Vite config).
2. Sign in with an account that has DeepSpace AI credits and open a saved project.
3. Build a launch kit from Positioning; verify its factual accuracy and usefulness.
4. Refresh, edit positioning and launch assets, save, refresh again, and copy text.
5. Verify actionable behavior if your account lacks AI access/credits.

No commit, push, or deploy is performed by this phase.

## Project deletion

The bottom of Overview has a restrained Delete Project control. Its modal names
the project, states that deletion is permanent, and requires a second explicit
confirmation. Cancel does not write. Generation in this workspace and duplicate
delete attempts are blocked while the confirmation/deletion flow is active.

Deletion uses `useMutations().removeConfirmed` directly: first the owner's saved
`launchKits` records filtered by `projectId`, then the project. Both collections
already enforce `delete: 'own'` on the server. No privileged action, schema change,
or client-supplied ownership is added. Only confirmed completion navigates home.
Future child collections belong in the explicit child-first deletion sequence in
`src/components/projects/delete-project-records.ts`.

The installed schema API has no automatic relational cascade or multi-collection
transaction. A failed kit deletion stops before deleting the project. A subsequent
project failure can leave the project without its kit; the modal reports this
partial/uncertain outcome and permits retry. A timeout can mean a deletion happened
without acknowledgment; refresh checks the persisted state.

Concurrency limitation: this sequence is not an atomic cascade. A generation in
another tab/device can create a kit between the related-record read/deletion and
project deletion, potentially leaving an orphan. The confirmation asks the user
to finish other generation first; this tab disables concurrent generation.
Eliminating that race requires server-side coordination of generation and deletion
or a platform relational cascade, beyond the unchanged schema/architecture here.
The normal confirmed flow removes both records and is covered through real Records
in the two-user browser suite; the concurrency limitation is not claimed as solved.

## Changed files

| Area | Files |
| --- | --- |
| Schema | `src/schemas/launch-kits-schema.ts`, `src/schemas.ts` |
| Action | `src/actions/build-launch-kit.ts`, `src/actions/index.ts` |
| Workspace | `src/components/projects/LaunchWorkspace.tsx`, `src/components/projects/ProjectLoadState.tsx`, `src/pages/(app)/(protected)/projects/[projectId].tsx` |
| Project deletion | `src/components/projects/DeleteProject.tsx`, `src/components/projects/delete-project-records.ts`, `src/components/projects/delete-project-records.test.ts`, `tests/projects.spec.ts` |
| Unit tests | `src/schemas/launch-kits-schema.test.ts`, `src/actions/build-launch-kit.test.ts` |
| Browser tests | `tests/launch-kits.spec.ts`, `tests/helpers/actions.ts`, `tests/helpers/records.ts` |
| Paid-boundary fixtures | `tests/fixtures/ai-worker.ts`, `tests/fixtures/launch-kit.ts` |
| Test server configuration | `tests/vite.config.ts`, `tests/playwright.config.ts`, `vite.config.ts` |
| Documentation | `PHASE2.md` |

`worker.ts`, `wrangler.toml`, authentication/providers, generic server routes,
`package.json`, and the lockfile remain unchanged.

Implementation references: [DeepSpace server AI](https://docs.deep.space/sdk-reference/worker/ai),
[server actions](https://docs.deep.space/guides/server-actions),
[schemas](https://docs.deep.space/sdk-reference/worker/schemas), and
[AI SDK structured output](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data).
Installed SDK declarations and the starter implementation were checked for exact signatures.
