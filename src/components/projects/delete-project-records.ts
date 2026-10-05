// Explicit, confirmed child-first deletion. Each callback is the SDK's
// removeConfirmed and independently enforces the collection's server-side 'own'
// permission. Add future child collections here before the project deletion.
// This is not a transaction: a failed parent deletion cannot restore deleted kits.
export async function deleteProjectRecords(
  projectId: string,
  launchKitIds: readonly string[],
  removeLaunchKit: (id: string) => Promise<void>,
  removeProject: (id: string) => Promise<void>,
) {
  for (const id of launchKitIds) await removeLaunchKit(id)
  await removeProject(projectId)
}
