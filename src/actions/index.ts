import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { buildLaunchKit } from './build-launch-kit'
import { saveExperiment } from './save-experiment'

export const actions: Record<string, ActionHandler<Env>> = { 'build-launch-kit': buildLaunchKit, 'save-experiment': saveExperiment }
