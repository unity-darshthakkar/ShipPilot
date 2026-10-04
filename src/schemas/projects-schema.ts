import type { CollectionSchema } from 'deepspace/schema'
import { z } from 'zod'

export const launchGoals = ['Get beta users', 'Get waitlist signups', 'Get GitHub stars', 'Get early customers', 'Launch publicly'] as const
const optionalUrl = z.string().trim().max(2048).refine((value) => {
  if (!value) return true
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}, 'Enter a full http:// or https:// URL without credentials, or leave this blank.')

// Shared form/data type. Identity and timestamps belong to RecordData's envelope.
export const projectInput = z.object({
  name: z.string().trim().min(1, 'Enter a project name.').max(120),
  description: z.string().trim().min(1, 'Describe your project.').max(1000),
  targetAudience: z.string().trim().min(1, 'Describe your target audience.').max(1000),
  problem: z.string().trim().min(1, 'Describe the problem solved.').max(2000),
  launchGoal: z.enum(launchGoals, { error: 'Choose a launch goal.' }),
  websiteUrl: optionalUrl,
  repositoryUrl: optionalUrl,
})
export type Project = z.infer<typeof projectInput>

export const projectsSchema: CollectionSchema = {
  name: 'projects',
  columns: [
    { name: 'name', storage: 'text', interpretation: 'plain', required: true },
    { name: 'description', storage: 'text', interpretation: 'plain', required: true },
    { name: 'targetAudience', storage: 'text', interpretation: 'plain', required: true },
    { name: 'problem', storage: 'text', interpretation: 'plain', required: true },
    { name: 'launchGoal', storage: 'text', interpretation: { kind: 'select', options: [...launchGoals] }, required: true },
    { name: 'websiteUrl', storage: 'text', interpretation: { kind: 'url' } },
    { name: 'repositoryUrl', storage: 'text', interpretation: { kind: 'url' } },
  ],
  // 'own' uses server-assigned envelope.createdBy, never client-supplied ownership.
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'own', create: true, update: 'own', delete: 'own' },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: 'own', create: true, update: 'own', delete: 'own' },
  },
}
