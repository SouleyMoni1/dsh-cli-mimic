import { createServer } from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const port = Number(process.env.PORT || 4131)
const logFile = process.env.LOG_FILE || 'mock-upstream-last.json'

const server = createServer((req, res) => {
  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    mkdirSync(dirname(logFile), { recursive: true })
    writeFileSync(logFile, JSON.stringify({
      method: req.method,
      url: req.url,
      headers: req.headers,
      bodyText: body.toString('utf8'),
      bodyBase64: body.toString('base64'),
    }, null, 2), 'utf8')
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    res.write(`event: response.created\ndata: ${JSON.stringify({ type: 'response.created', response: { id: 'resp_mock', object: 'response', status: 'in_progress', model: 'gpt-5.4-codex' } })}\n\n`)
    res.write(`event: response.output_item.added\ndata: ${JSON.stringify({ type: 'response.output_item.added', output_index: 0, item: { type: 'message', id: 'msg_mock', role: 'assistant', content: [] } })}\n\n`)
    res.write(`event: response.output_text.delta\ndata: ${JSON.stringify({ type: 'response.output_text.delta', delta: 'ok', item_id: 'msg_mock', output_index: 0, sequence_number: 0 })}\n\n`)
    res.write(`event: response.output_item.done\ndata: ${JSON.stringify({ type: 'response.output_item.done', output_index: 0, item: { type: 'message', id: 'msg_mock', role: 'assistant', content: [{ type: 'output_text', text: 'ok', annotations: [] }] } })}\n\n`)
    res.end(`event: response.completed\ndata: ${JSON.stringify({ type: 'response.completed', response: { id: 'resp_mock', object: 'response', status: 'completed', model: 'gpt-5.4-codex', output: [{ type: 'message', id: 'msg_mock', role: 'assistant', content: [{ type: 'output_text', text: 'ok', annotations: [] }] }], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } } })}\n\n`)
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`mock codex upstream listening on http://127.0.0.1:${port}`)
})
