import { projectInput } from '@/schemas/projects-schema'
import { launchKitContent, launchKitInput } from '@/schemas/launch-kits-schema'

const brief = projectInput.pick({ name: true, description: true, targetAudience: true, problem: true, launchGoal: true })
const assets = launchKitContent.pick({ launchPost: true, socialPost: true, demoScript: true, launchChecklist: true }).strip()

// Call only with persisted query records, never an in-progress form draft.
export function launchReadiness(project: unknown, kit: unknown, experiments: readonly { learning?: unknown }[]) {
  return {
    brief: brief.safeParse(project).success,
    positioning: launchKitInput.safeParse(kit).success,
    assets: assets.safeParse(kit).success,
    experiment: experiments.length > 0,
    learning: experiments.some(item => typeof item.learning === 'string' && item.learning.trim().length > 0),
  }
}
