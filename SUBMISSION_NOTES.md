# ShipPilot submission notes

## What I built

ShipPilot helps developers turn a finished software project into a launch-ready GTM plan. Users save a project brief, generate and edit positioning and launch assets, and define a small GTM experiment. They record results and learning manually, while launch readiness reflects saved records.

## DeepSpace integrations used

- **Authentication:** native login and protected pages provide a private workspace.
- **Records:** projects, launch kits, and experiments persist and synchronize across navigation and refresh.
- **Permissions:** server-enforced owner rules isolate private records between users.
- **Managed AI:** server-side generation uses saved project context and the authenticated user's AI credits.
- **Authenticated server actions:** explicit ownership checks protect AI generation and validated experiment saves.

## Main tradeoff

I kept experiments manual and excluded external analytics and social posting APIs. The five-day scope focuses on whether developers can move from a clear brief to usable launch assets, run a small test, and capture what they learned. It avoids adding platform connections and measurement infrastructure before validating that core GTM-learning workflow.

## What the coding agent did

Under my direction, the coding agent helped inspect the starter, implement the scoped workflow, write and run tests, make targeted refactors, polish the existing UI, and fix audit findings. I set the phase boundaries, reviewed outcomes, and requested adjustments based on real generation results. The agent did not independently decide the product scope.

## What I verified myself

The recorded manual confirmations include DeepSpace authentication/account setup, real AI launch-kit generation with the saved DebugHalo project, and review of factual grounding before and after prompt revisions. I identified unsupported assumptions in generated copy and checked the revised prompt in a subsequent real AI test.

Before copying a first-person verification claim into the portal, confirm the remaining manual browser checks: OAuth return flow; project creation, editing, and refresh persistence; experiment status/results/learning and readiness; project deletion; and the landing-page Dashboard flow. These flows have automated browser coverage, but this development record does not separately establish personal completion of every manual check.

## Known limitations

Experiments and metrics are entered manually. There are no external analytics, social posting, or team features. Related-record deletion is non-atomic and can be incomplete after failures or concurrent writes. Separate Worker isolates can make duplicate paid AI calls, although only one launch kit can persist per project. The known bundle-size warning remains.
