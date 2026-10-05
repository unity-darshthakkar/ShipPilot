# ShipPilot Phase 3: GTM Experiments and Launch Readiness

Experiments are manual GTM tests. This phase adds create/edit/status/result/learning
and persisted readiness. No AI experiment generation, analytics, integrations,
individual experiment delete UI, or additional dependencies are included.

## Data and authorization

`experiments` contains immutable `projectId`, `hypothesis` (1–1500 characters),
`channel` (1–200), `message` (1–2000), `metric` (1–300), `target` (1–500), `status`,
and optional `result`/`learning` (up to 2000 each, default empty). Text is trimmed.
The Records envelope provides record ID, creator, and created/updated timestamps.
Status is exactly `Planned`, `Running`, or `Completed`; the form defaults to Planned.
Results and learning are allowed at every status.

Read and delete use server-enforced `own` permissions for viewer/member/admin,
based on server-assigned `createdBy`. Anonymous operations are denied. Direct
client creates and updates are denied so callers cannot bypass validation.

The installed SDK's select interpretation declares options but does not enforce
their membership as a validation constraint. Its create permission is a boolean,
not a check of a referenced project's owner. Consequently one narrow authenticated
action, `save-experiment`, validates all content with the shared Zod schema and
checks the saved project's `createdBy` against the verified caller. On update it
also checks the experiment's creator and that its immutable project association
matches that project. An arbitrary project/experiment ID never authorizes a save.
The action passes validated fields to native Records create/update tools and
returns their confirmed result. No client-selected create ID or privileged delete
action is introduced. It never accepts creator/timestamp fields from the client.

The action router remains unchanged. Its tools bypass Records RBAC, which is why
the explicit ownership checks in the action are required even for authenticated
callers. A submitted project ID is never treated as evidence of authorization.

## Queries and UI

The workspace subscribes to `experiments` filtered by `{ projectId }`, ordered by
`updatedAt` descending. Privacy comes from Records permissions, not that filter.
No `limit` is supplied: the installed WebSocket query path returns all authorized
matching rows. This differs from bounded AI tool queries. The small MVP list and
readiness therefore see learning on older records too; no first-page cutoff can
silently hide children from project cleanup.

The Experiments tab has explicit loading/error/empty states, a create form, saved
cards, and an edit form. Saves are explicit and disable duplicate submissions.
Success is shown only after the server confirms persistence. Failures keep the
draft. An unconfirmed create prevents another submission until the user checks
saved records, because retrying a create could duplicate a write whose response
was lost. Update retries send the same edited fields. No autosave is used.

## Readiness

Only saved project/query data is passed to the readiness helper:

- Project brief: required name, description, audience, problem, and launch goal
  pass validation.
- Positioning: a valid saved LaunchKit exists.
- Launch kit: saved launch post, social post, demo script, and checklist pass
  their existing validators.
- Experiment: at least one persisted experiment belongs to this project.
- Learning: at least one of those records has non-empty trimmed saved learning.

Loading/error states are shown rather than treating an incomplete query as false.
No AI score or percentage is added.

## Project deletion

The existing confirmation modal now names experiments as well as the launch kit.
Its experiment query filters by project ID and retains server-enforced ownership.
The sequential confirmed deletion order is all visible owner-authorized
experiments, saved launch kit(s), then project; dashboard navigation follows the
last acknowledgment. A failure stops the sequence and displays an error. Later
records remain intact; already accepted deletions cannot be rolled back.

This is deliberately non-atomic. Concurrent creates/saves/generation in another
tab/device can race the snapshot and leave related data, and a lost acknowledgment
can make the outcome uncertain. The modal asks users to finish other saves first
and reports partial removal on error. This phase does not introduce a transaction,
coordinator, or unsupported cascade syntax. The no-limit subscription favors the
small MVP dataset; large-scale paging/bulk coordination is not part of this phase.

## Tests and verification

Unit tests cover trimmed/required fields, optional notes, all allowed/rejected
statuses, rejected ownership fields, authenticated/owner-checked saves, immutable
project association, write failures, readiness, and experiment-first cleanup.
The cleanup test includes 55 experiments to detect a hard-coded page cutoff and
confirms that a rejected experiment deletion preserves later children and parent.

`tests/experiments.spec.ts` exercises real two-user authentication and Records:
create, duplicate-submit suppression, read/reload, edit hypothesis/status, saved
result/learning, readiness transitions, two-project filtering, cross-user read/
update/delete denial, forged status rejection, anonymous denial, and project
deletion with two experiments while another project's experiment remains intact.
Existing launch-kit browser tests still exercise kit cleanup. Only the existing
paid AI boundary is substituted; experiments have no AI calls or mocked persistence.

Verification commands: `npm run build`, `npm run validate` (TypeScript + unit
tests), `npm run lint`, `npm run test:e2e -- --port 5180`, `git diff --check`.

## Changed files

New:
- `src/schemas/experiments-schema.ts`
- `src/schemas/experiments-schema.test.ts`
- `src/actions/save-experiment.ts`
- `src/actions/save-experiment.test.ts`
- `src/components/projects/ExperimentForm.tsx`
- `src/components/projects/ExperimentsTab.tsx`
- `src/components/projects/launch-readiness.ts`
- `src/components/projects/launch-readiness.test.ts`
- `tests/experiments.spec.ts`
- `PHASE3.md`

Updated:
- `src/schemas.ts`
- `src/actions/index.ts`
- `src/components/projects/LaunchWorkspace.tsx`
- `src/pages/(app)/(protected)/projects/[projectId].tsx`
- `src/components/projects/DeleteProject.tsx`
- `src/components/projects/delete-project-records.ts`
- `src/components/projects/delete-project-records.test.ts`
- `tests/helpers/actions.ts`

## Manual check

1. Open a project and create a Planned experiment with hypothesis, channel,
   message, metric, and target. Refresh and check the saved card.
2. Edit its hypothesis, set Running, save, and refresh.
3. Add Result and Learning, set Completed, save, and refresh again.
4. Open Overview: Experiment should be Defined and Learning should be Recorded.
5. Check another project: its list/readiness should reflect only its own data.
6. Create a disposable project with experiments (and optionally a launch kit).
   Cancel deletion once, then confirm. Refresh the dashboard and verify it is gone.
   The browser test probes Records directly to verify child cleanup as well.

No automatic commit, deployment, polish, or subsequent feature phase is included.

References: [Records](https://docs.deep.space/sdk-reference/client/records),
[schemas](https://docs.deep.space/sdk-reference/worker/schemas), and
[permissions](https://docs.deep.space/concepts/permissions). Installed SDK types
and implementation were inspected for status coercion and no-limit query behavior.
