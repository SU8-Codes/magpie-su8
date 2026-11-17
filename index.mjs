// SU8 Codes as a magpie provider: sign in with an SU8 API key, use the models
// that key may call, and see its plan allowance and balance on the account card.
//
// Only Su8CodesPlugin is exported as a function: magpie runs every exported
// function as a plugin, so helpers live on _internal at the end.

const PROVIDER = "su8"
// the lines a key may be used on: the same service and account, reached through different networks
const LINES = {
  main: { origin: "https://www.su8.codes", label: "Main", hint: "Default", labels: { zh: "主站" }, hints: { zh: "默认" } },
  cn2: { origin: "https://cn2.su8.codes", label: "CN2", hint: "For mainland China", labels: { zh: "CN2" }, hints: { zh: "中国大陆网络" } },
  hk: { origin: "https://hk.su8.codes", label: "Hong Kong", hint: "", labels: { zh: "香港" } },
  jp: { origin: "https://jp.su8.codes", label: "Japan", hint: "", labels: { zh: "日本" } },
  us2: { origin: "https://us2.su8.codes", label: "United States", hint: "", labels: { zh: "美国" } },
}
const DEFAULT_LINE = "main"
const ICON = "https://www.su8.codes/favicon.svg"
const TIMEOUT_MS = 15_000
const MESSAGES = "@ai-sdk/anthropic"
const RESPONSES = "@ai-sdk/openai"
const CHAT = "@ai-sdk/openai-compatible"
// magpie shows the loader's apiKey to every plugin's chat.headers hook, so the
// key itself is set in fetch, and only for SU8's origin.
const PLACEHOLDER = "su8-key-set-per-request"
const SESSION_HEADER = "x-session-id"
const LEVELS = ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"]
// with a client_version the list comes in Codex's shape, which carries context windows and levels
const MODELS_PATH = "/v1/models?client_version=0.0.0"
const USAGE_PATH = "/api/v1/ccs/usage"

class Refused extends Error {
  signIn = "expired"
}

function keyOf(auth) {
  return auth?.type === "api" && typeof auth.key === "string" && auth.key.trim() ? auth.key.trim() : undefined
}

/** the line an account signed in on; one signed in before lines existed is on the main line. */
function originOf(auth) {
  const line = auth?.metadata?.line ?? DEFAULT_LINE
  const known = LINES[line]
  if (!known) throw new Error(`Unknown SU8 line "${line}". Sign in to SU8 again and pick a line from the list.`)
  return known.origin
}

/** a model that only draws. */
function drawsOnly(id) {
  return /(^|[-_])image([-_]|$)/i.test(String(id))
}

/** the API a model is spoken to on; magpie translates the others to it. */
function npmOf(id) {
  const s = String(id).toLowerCase()
  // magpie draws only with a model on an OpenAI-compatible base
  if (drawsOnly(s)) return CHAT
  if (s.startsWith("claude-")) return MESSAGES
  if (/^(gpt-|o\d|codex-)/.test(s)) return RESPONSES
  return CHAT
}

async function ask(url, key) {
  let res
  try {
    res = await fetch(url, {
      headers: { authorization: `Bearer ${key}`, accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    throw new Error(`Couldn't reach SU8 at ${new URL(url).origin} (${e?.message ?? e}). Check your connection or proxy.`)
  }
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = undefined
  }
  if (res.status === 401) {
    throw new Refused("SU8 refused this API key: it may be disabled, expired or deleted. Check it on the API keys page of the SU8 console, then sign in again.")
  }
  if (!res.ok) throw new Error(`SU8 answered HTTP ${res.status}: ${String(body?.error?.message ?? (text.trim().slice(0, 200) || res.statusText))}`)
  if (body === undefined) throw new Error(`SU8 answered something that isn't JSON at ${new URL(url).pathname}.`)
  return body
}

function levelsOf(entry) {
  const said = Array.isArray(entry?.supported_reasoning_levels) ? entry.supported_reasoning_levels : []
  const efforts = new Set(said.map((x) => String(x?.effort ?? x).toLowerCase()))
  return LEVELS.filter((l) => efforts.has(l))
}

function modelOf(entry, url) {
  const id = String(entry.slug)
  const levels = levelsOf(entry)
  const image = Array.isArray(entry.input_modalities) && entry.input_modalities.includes("image")
  const context = Number.isInteger(entry.context_window) && entry.context_window > 0 ? entry.context_window : 0
  const draws = drawsOnly(id)
  return {
    id,
    providerID: PROVIDER,
    name: typeof entry.display_name === "string" && entry.display_name ? entry.display_name : id,
    api: { id, url, npm: npmOf(id) },
    status: "active",
    headers: {},
    options: {},
    cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    limit: { context, output: 0 },
    capabilities: {
      temperature: true,
      reasoning: levels.length > 0,
      attachment: image,
      toolcall: !draws,
      // image input only where SU8 says so; elsewhere magpie keeps what it knows of the model
      input: image ? { text: true, image: true } : { text: true },
      output: { text: !draws, image: draws },
      interleaved: false,
    },
    release_date: "",
    variants: Object.fromEntries(levels.map((l) => [l, {}])),
  }
}

/** the models the key may call; a throw keeps magpie's last list and tells the user why. */
async function listModels(origin, key) {
  const body = await ask(`${origin}${MODELS_PATH}`, key)
  const entries = Array.isArray(body?.models) ? body.models : []
  const url = `${origin}/v1`
  const models = Object.fromEntries(
    entries.filter((e) => typeof e?.slug === "string" && e.slug !== "").map((e) => [e.slug, modelOf(e, url)]),
  )
  if (Object.keys(models).length === 0) {
    throw new Error("SU8 lists no models for this API key. Check on the SU8 console that the key has models it may call and a plan or balance it may use.")
  }
  return models
}

function dollars(n) {
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`
}

/** a key's plans and wallet, as the account card shows them. */
function usageFrom(body) {
  if (body?.isValid === false) {
    const why = String(body.invalidMessage ?? "").trim()
    return { error: `SU8 says this key can't be used now${why ? ` (${why})` : ""}. See the API keys page of the SU8 console.`, windows: [] }
  }
  const plans = (Array.isArray(body?.subscriptions) ? body.subscriptions : []).filter((s) => s && s.isValid !== false)
  // shown only (aside): SU8 itself decides whether a request is served
  const windows = plans.map((s) => {
    const limit = Number(s.todayLimit) || 0
    const left = Number(s.remaining) || 0
    const window = { name: String(s.planName || s.packageCode || "Plan"), display: `${dollars(left)} left · ${dollars(limit)} a day`, aside: true }
    if (limit > 0) window.used = Math.round(Math.max(0, 1 - left / limit) * 1000) / 10
    return window
  })
  const out = { windows }
  const balance = Number(body?.balance)
  if (Number.isFinite(balance) && (balance !== 0 || plans.length === 0)) out.balance = dollars(balance)
  if (plans.length === 1) out.plan = String(plans[0].planName || plans[0].packageCode || "Plan")
  else if (plans.length > 1) out.plan = `${plans.length} plans`
  else out.plan = "Pay as you go"
  const until = plans.map((s) => s.expiresAt).filter(Boolean).sort()[0]
  if (until) out.until = until
  return out
}

async function usageOf(origin, key) {
  if (!key) return { error: "Not signed in to SU8. Sign in with an API key from the SU8 console.", windows: [] }
  try {
    return usageFrom(await ask(`${origin}${USAGE_PATH}`, key))
  } catch (e) {
    if (e instanceof Refused) return { error: e.message, signIn: e.signIn, windows: [] }
    return { error: e?.message ?? String(e), windows: [] }
  }
}

/** one account's fetch: the key goes only to SU8, with the agent's session named as SU8 reads it. */
function fetchFor(origin, key) {
  return async (input, init) => {
    const target = new URL(input instanceof Request ? input.url : String(input))
    if (target.origin !== origin) throw new Error(`SU8 plugin: refusing to send the API key to ${target.origin}`)
    const headers = new Headers(input instanceof Request ? input.headers : undefined)
    for (const [k, v] of new Headers(init?.headers ?? {})) headers.set(k, v)
    headers.delete("x-api-key")
    headers.delete("x-goog-api-key")
    headers.set("authorization", `Bearer ${key}`)
    const session = headers.get("x-magpie-session")
    if (session && !headers.has(SESSION_HEADER)) headers.set(SESSION_HEADER, session)
    return fetch(input, { ...init, headers })
  }
}

// asked before the key; magpie keeps the choice as the account's metadata.line
const LINE_PROMPT = {
  type: "select",
  key: "line",
  message: "Line",
  messages: { zh: "线路" },
  options: Object.entries(LINES).map(([value, l]) => ({ value, label: l.label, labels: l.labels, hint: l.hint, ...(l.hints ? { hints: l.hints } : {}) })),
}

export async function Su8CodesPlugin() {
  return {
    config: async (cfg) => {
      cfg.provider ??= {}
      cfg.provider[PROVIDER] ??= { name: "SU8 Codes", npm: CHAT, api: `${LINES[DEFAULT_LINE].origin}/v1`, models: {} }
    },
    auth: {
      provider: PROVIDER,
      icon: ICON,
      methods: [{ type: "api", label: "SU8 API key", labels: { zh: "SU8 API Key" }, placeholder: "su8-…", prompts: [LINE_PROMPT] }],
      loader: async (getAuth) => {
        const auth = await getAuth()
        const key = keyOf(auth)
        if (!key) return {}
        const origin = originOf(auth)
        return { baseURL: `${origin}/v1`, apiKey: PLACEHOLDER, fetch: fetchFor(origin, key) }
      },
      usage: async (getAuth) => {
        const auth = await getAuth()
        try {
          return await usageOf(originOf(auth), keyOf(auth))
        } catch (e) {
          return { error: e?.message ?? String(e), windows: [] }
        }
      },
    },
    provider: {
      id: PROVIDER,
      models: async (provider, { auth } = {}) => {
        const key = keyOf(auth)
        return key ? listModels(originOf(auth), key) : provider.models
      },
    },
  }
}

// for tests: an object, not a function, so magpie never runs it as a plugin
export const _internal = { LINES, DEFAULT_LINE, LINE_PROMPT, PLACEHOLDER, SESSION_HEADER, originOf, npmOf, drawsOnly, levelsOf, modelOf, listModels, usageFrom, usageOf, fetchFor }
