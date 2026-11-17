// A stand-in for SU8's API, answering only the shapes the plugin reads.
import http from "node:http"

export const KEY = "su8-test-key-not-real"

export const MODELS = [
  {
    slug: "claude-sonnet-5-5",
    display_name: "Claude Sonnet 5.5",
    context_window: 200000,
    input_modalities: ["text", "image"],
    supported_reasoning_levels: [{ effort: "low" }, { effort: "high" }, { effort: "max" }],
  },
  {
    slug: "gpt-6.1-sol",
    display_name: "GPT-6.1 Sol",
    context_window: 400000,
    input_modalities: ["text"],
    supported_reasoning_levels: [{ effort: "none" }, { effort: "medium" }, { effort: "xhigh" }],
  },
  { slug: "deepseek-v4-pro", display_name: "DeepSeek V4 Pro", input_modalities: ["text"], supported_reasoning_levels: [] },
  { slug: "gpt-image-2", display_name: "GPT Image 2", input_modalities: ["text", "image"], supported_reasoning_levels: [] },
]

export function startFake({ usage, models = MODELS, port = 0 } = {}) {
  const seen = []
  const server = http.createServer((req, res) => {
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, headers: req.headers, body })
      const json = (status, v) => {
        res.writeHead(status, { "content-type": "application/json" })
        res.end(JSON.stringify(v))
      }
      if (req.headers.authorization !== `Bearer ${KEY}`) return json(401, { error: { message: "unauthorized" } })
      if (req.url.startsWith("/v1/models")) return json(200, { models })
      if (req.url === "/api/v1/ccs/usage") return json(200, usage ?? { isValid: true, balance: 12.5, subscriptions: [] })
      if (req.url === "/v1/messages") {
        return json(200, { id: "msg_1", type: "message", role: "assistant", model: "claude-sonnet-5-5", content: [{ type: "text", text: "hi" }], stop_reason: "end_turn", usage: { input_tokens: 3, output_tokens: 1 } })
      }
      json(404, { error: { message: `not found: ${req.url}` } })
    })
  })
  return new Promise((ok) =>
    server.listen(port, "127.0.0.1", () => ok({ origin: `http://127.0.0.1:${server.address().port}`, seen, close: () => new Promise((done) => server.close(done)) })),
  )
}
