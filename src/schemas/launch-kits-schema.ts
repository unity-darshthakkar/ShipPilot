import { z } from 'zod'
import type { CollectionSchema, RolePermissions } from 'deepspace/schema'

const text = (max: number) => z.string().trim().min(1).max(max)
export const launchKitContent = z.strictObject({
  targetAudienceSummary: text(1200),
  coreProblem: text(1200),
  valueProposition: text(1200),
  oneLiner: text(300),
  keyMessages: z.array(text(500)).length(3),
  launchPost: text(5000),
  socialPost: text(1200),
  demoScript: text(4000),
  launchChecklist: z.array(text(500)).min(5).max(8),
})
export const launchKitInput = launchKitContent.extend({ projectId: text(200) })
export type LaunchKitContent = z.infer<typeof launchKitContent>
export type LaunchKit = z.infer<typeof launchKitInput>

const ownerPermissions: RolePermissions = {
  read: 'own', create: false, update: 'own', delete: 'own',
  writableFields: Object.keys(launchKitContent.shape),
}
export const launchKitsSchema: CollectionSchema = {
  name: 'launchKits',
  uniqueOn: ['projectId'],
  columns: [
    { name: 'projectId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    ...Object.keys(launchKitContent.shape).map(name => ({
      name, storage: 'text' as const, required: true,
      interpretation: ['keyMessages', 'launchChecklist'].includes(name) ? { kind: 'json' as const } : 'plain',
    })),
  ],
  // Only the ownership-checked server action creates kits. Envelope.createdBy
  // is server assigned; clients may edit content, never move a kit to a project.
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: ownerPermissions, member: ownerPermissions, admin: ownerPermissions,
  },
}
