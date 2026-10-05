import { fileURLToPath } from 'node:url'
import { createAppConfig } from '../vite.config.ts'

// Explicit test config only. Production/default dev never bind this service.
export default createAppConfig({
  config: config => ({ services: [...(config.services ?? []).filter(service => service.binding !== 'API_WORKER'), { binding: 'API_WORKER', service: 'shippilot-test-ai' }] }),
  auxiliaryWorkers: [{
    devOnly: true,
    config: {
      name: 'shippilot-test-ai',
      main: fileURLToPath(new URL('./fixtures/ai-worker.ts', import.meta.url)),
      compatibility_date: '2026-06-01',
    },
  }],
})
