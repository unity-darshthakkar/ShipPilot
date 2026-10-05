import { z } from 'zod'
import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { experimentContent, type Experiment } from '../schemas/experiments-schema'

const request = z.strictObject({
  projectId: z.string().trim().min(1).max(200),
  experimentId: z.string().min(1).max(200).optional(),
  content: experimentContent,
})

export const saveExperiment: ActionHandler<Env> = async ({ userId, callerJwt, params, tools }) => {
  if (!userId || !callerJwt) return { success: false, code: 'unauthorized', error: 'Sign in to save an experiment.' }
  const parsed = request.safeParse(params)
  if (!parsed.success) return { success: false, code: 'invalid_experiment', error: 'Complete the required fields and choose Planned, Running, or Completed.' }
  const { projectId, experimentId, content } = parsed.data
  try {
    // ActionTools bypass RBAC: parent ID alone never authorizes a write.
    const project = await tools.get('projects', projectId)
    if (!project.success || project.data.record.createdBy !== userId) {
      return { success: false, code: 'project_unavailable', error: "This project doesn't exist or you don't have access to it." }
    }
    if (experimentId) {
      const experiment = await tools.get<Experiment>('experiments', experimentId)
      if (!experiment.success || experiment.data.record.createdBy !== userId || experiment.data.record.data.projectId !== projectId) {
        return { success: false, code: 'experiment_unavailable', error: "This experiment doesn't exist or you don't have access to it in this project." }
      }
      const saved = await tools.update<Experiment>('experiments', experimentId, content)
      return saved.success ? saved : { success: false, code: 'save_failed', error: 'Could not save the experiment. Your draft has been kept; please retry.' }
    }
    // No client-selected ID/upsert on create. Creator identity is assigned by Records.
    const saved = await tools.create<Experiment>('experiments', { projectId, ...content })
    return saved.success ? saved : { success: false, code: 'save_failed', error: 'Could not create the experiment. Your draft has been kept; please retry.' }
  } catch {
    // The write may have reached Records: never suggest blindly retrying a create.
    return { success: false, code: 'save_uncertain', error: 'The save could not be confirmed. Check the saved experiments before submitting again; your draft is still here.' }
  }
}
