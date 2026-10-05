import { validContent } from './launch-kit'

// Paid service boundary only. Never handles app auth, actions, or Records.
export default {
  async fetch(request: Request) {
    if (new URL(request.url).pathname !== '/api/proxy/openai/v1/chat/completions') return new Response('Unsupported test service route', { status: 502 })
    const body = await request.json() as { messages: { role: string; content: string }[] }
    const project = JSON.parse(body.messages.find(message => message.role === 'user')!.content) as { description: string }
    // An upstream latency simulation gives the browser time to inspect pending UI.
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (project.description === 'AI_TEST_CREDITS') return Response.json({ error: { message: 'Insufficient credits', type: 'insufficient_credits' } }, { status: 402 })
    const content = project.description === 'AI_TEST_MALFORMED' ? { oneLiner: 'Incomplete response' } : validContent
    return Response.json({ id: 'test-completion', object: 'chat.completion', created: 1, model: 'gpt-4.1-mini',
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(content) } }],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    })
  },
}
