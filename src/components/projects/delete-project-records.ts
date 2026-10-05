// Explicit, confirmed child-first deletion. Each callback is the SDK's
// removeConfirmed and independently enforces the collection's server-side 'own'
// permission. This is not a transaction: later failures cannot restore children.
export async function deleteProjectRecords(
  projectId: string,
  launchKitIds: readonly string[],
  removeLaunchKit: (id: string) => Promise<void>,
  removeProject: (id: string) => Promise<void>,
  experimentIds: readonly string[],
  removeExperiment: (id: string) => Promise<void>,
) {
  for (const id of experimentIds) await removeExperiment(id)
  for (const id of launchKitIds) await removeLaunchKit(id)
  await removeProject(projectId)
}
