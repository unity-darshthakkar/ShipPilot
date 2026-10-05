import { z } from 'zod'
import type { CollectionSchema, RolePermissions } from 'deepspace/schema'

export const experimentStatuses = ['Planned', 'Running', 'Completed'] as const
export const experimentContent = z.strictObject({
  hypothesis: z.string().trim().min(1, 'Enter a hypothesis.').max(1500),
  channel: z.string().trim().min(1, 'Enter a channel.').max(200),
  message: z.string().trim().min(1, 'Describe the message or approach.').max(2000),
  metric: z.string().trim().min(1, 'Enter a metric.').max(300),
  target: z.string().trim().min(1, 'Enter a target.').max(500),
  status: z.enum(experimentStatuses),
  result: z.string().trim().max(2000).optional().default(''),
  learning: z.string().trim().max(2000).optional().default(''),
})
export const experimentInput = experimentContent.extend({ projectId: z.string().trim().min(1).max(200) })
export type ExperimentContent = z.infer<typeof experimentContent>
export type Experiment = z.infer<typeof experimentInput>

// Saves go through the action to validate text/status and project ownership.
// Reads and child-first project cleanup retain normal server-enforced RBAC.
const owner: RolePermissions = { read: 'own', create: false, update: false, delete: 'own' }
export const experimentsSchema: CollectionSchema = {
  name: 'experiments',
  columns: [
    { name: 'projectId', storage: 'text', interpretation: 'plain', immutable: true, required: true },
    ...['hypothesis', 'channel', 'message', 'metric', 'target'].map(name => ({ name, storage: 'text' as const, interpretation: 'plain', required: true })),
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: [...experimentStatuses] }, required: true, default: 'Planned' },
    { name: 'result', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'learning', storage: 'text', interpretation: 'plain', default: '' },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: owner, member: owner, admin: owner,
  },
}
