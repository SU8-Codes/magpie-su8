import { test } from "node:test"
import assert from "node:assert/strict"
import * as plugin from "../index.mjs"
import { KEY, startFake } from "./fake-su8.mjs"

const I = plugin._internal
const signedIn = async () => ({ type: "api", key: KEY })

async function withFake(opts, run) {
  const fake = await startFake(opts)
  try {
    await run(fake)
  } finally {
    await fake.close()
  }
}

test("the module exports one function, the plugin", () => {
  const fns = Object.entries(plugin).filter(([, v]) => typeof v === "function")
  assert.deepEqual(fns.map(([k]) => k), ["Su8CodesPlugin"])
})

test("each model goes out on the API it speaks", () => {
  assert.equal(I.npmOf("claude-opus-5-5"), "@ai-sdk/anthropic")
  assert.equal(I.npmOf("gpt-6.1-sol"), "@ai-sdk/openai")
  assert.equal(I.npmOf("deepseek-v4-pro"), "@ai-sdk/openai-compatible")
  assert.equal(I.npmOf("glm-5.3"), "@ai-sdk/openai-compatible")
  // magpie draws only with a model on an OpenAI-compatible base
  assert.equal(I.npmOf("gpt-image-2"), "@ai-sdk/openai-compatible")
})

test("the models are the key's own, with what SU8 says of each", async () => {
  await withFake({}, async (fake) => {
    const models = await I.listModels(fake.origin, KEY)
    assert.deepEqual(Object.keys(models), ["claude-sonnet-5-5", "gpt-6.1-sol", "deepseek-v4-pro", "gpt-image-2"])
    const sonnet = models["claude-sonnet-5-5"]
    assert.equal(sonnet.api.npm, "@ai-sdk/anthropic")
    assert.equal(sonnet.api.url, `${fake.origin}/v1`)
    assert.equal(sonnet.limit.context, 200000)
    assert.deepEqual(Object.keys(sonnet.variants), ["low", "high", "max"])
    assert.equal(sonnet.capabilities.reasoning, true)
    assert.deepEqual(sonnet.capabilities.input, { text: true, image: true })
    // image input not said: left unsaid, so magpie keeps what it knows of the model
    assert.deepEqual(models["gpt-6.1-sol"].capabilities.input, { text: true })
    // no levels said: none made up
    assert.deepEqual(models["deepseek-v4-pro"].variants, {})
    assert.equal(models["deepseek-v4-pro"].limit.context, 0)
    assert.deepEqual(models["gpt-image-2"].capabilities.output, { text: false, image: true })
    // no price claimed: SU8's list carries none
    assert.equal(sonnet.cost.input, 0)
    assert.match(fake.seen[0].url, /^\/v1\/models\?client_version=/)
    assert.equal(fake.seen[0].headers.authorization, `Bearer ${KEY}`)
  })
})

test("a refused key marks the account; any other failure throws for magpie to keep its list", async () => {
  await withFake({}, async (fake) => {
    await assert.rejects(I.listModels(fake.origin, "su8-wrong"), (e) => e.signIn === "expired")
  })
  await withFake({ models: [] }, async (fake) => {
    await assert.rejects(I.listModels(fake.origin, KEY), (e) => e.signIn === undefined && /no models/.test(e.message))
  })
  await assert.rejects(I.listModels("http://127.0.0.1:9", KEY), (e) => e.signIn === undefined && /Couldn't reach SU8/.test(e.message))
})

test("usage shows each plan and the wallet, for display only", async () => {
  const usage = {
    isValid: true,
    balance: 12.5,
    subscriptions: [
      { planName: "Pro", todayLimit: 50, remaining: 40, isValid: true, expiresAt: "2026-12-31T16:00:00Z" },
      { planName: "Lite", todayLimit: 0, remaining: 0, isValid: true },
    ],
  }
  await withFake({ usage }, async (fake) => {
    const u = await I.usageOf(fake.origin, KEY)
    assert.equal(u.balance, "$12.50")
    assert.equal(u.plan, "2 plans")
    assert.equal(u.until, "2026-12-31T16:00:00Z")
    assert.deepEqual(u.windows[0], { name: "Pro", display: "$40.00 left · $50.00 a day", aside: true, used: 20 })
    assert.equal(u.windows[1].used, undefined)
    // never routing's: a plan used up doesn't stop a key SU8 would still serve
    assert.ok(u.windows.every((w) => w.aside === true))
  })
})

test("a key with no plan shows its wallet, even at zero", () => {
  assert.deepEqual(I.usageFrom({ isValid: true, balance: 0, subscriptions: [] }), { windows: [], balance: "$0.00", plan: "Pay as you go" })
})

test("usage says why a key can't be used, and a refused key asks for a new sign-in", async () => {
  await withFake({ usage: { isValid: false, invalidMessage: "key quota exceeded", subscriptions: [] } }, async (fake) => {
    assert.match((await I.usageOf(fake.origin, KEY)).error, /key quota exceeded/)
  })
  await withFake({}, async (fake) => {
    assert.equal((await I.usageOf(fake.origin, "su8-wrong")).signIn, "expired")
  })
})

test("a request carries the key and names the agent's session as SU8 reads it", async () => {
  await withFake({}, async (fake) => {
    const res = await I.fetchFor(fake.origin, KEY)(`${fake.origin}/v1/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${I.PLACEHOLDER}`, "x-api-key": I.PLACEHOLDER, "x-magpie-session": "conv-1", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", messages: [] }),
    })
    assert.equal(res.status, 200)
    const sent = fake.seen.at(-1)
    assert.equal(sent.headers.authorization, `Bearer ${KEY}`)
    assert.equal(sent.headers["x-api-key"], undefined)
    assert.equal(sent.headers[I.SESSION_HEADER], "conv-1")
  })
})

test("the loader gives magpie a placeholder, and its fetch sends the key nowhere but SU8", async () => {
  const hooks = await plugin.Su8CodesPlugin()
  const o = await hooks.auth.loader(signedIn)
  assert.equal(o.baseURL, "https://www.su8.codes/v1")
  assert.equal(o.apiKey, I.PLACEHOLDER)
  assert.notEqual(o.apiKey, KEY)
  await assert.rejects(o.fetch("https://evil.example/v1/messages", { method: "POST", body: "{}" }), /refusing to send the API key/)
  // the bare domain answers every request with a redirect that drops the key
  await assert.rejects(o.fetch("https://su8.codes/v1/messages", { method: "POST", body: "{}" }), /refusing to send the API key/)
})

test("the five lines, asked before the key and kept on the account", async () => {
  assert.deepEqual(
    Object.values(I.LINES).map((l) => l.origin),
    ["https://www.su8.codes", "https://cn2.su8.codes", "https://hk.su8.codes", "https://jp.su8.codes", "https://us2.su8.codes"],
  )
  const hooks = await plugin.Su8CodesPlugin()
  const [method] = hooks.auth.methods
  // an api method with questions and no authorize of its own: magpie still asks the key itself
  assert.equal(method.type, "api")
  assert.equal(method.authorize, undefined)
  assert.equal(method.prompts[0].type, "select")
  assert.deepEqual(method.prompts[0].options.map((o) => o.value), ["main", "cn2", "hk", "jp", "us2"])
  for (const [line, { origin }] of Object.entries(I.LINES)) {
    const auth = { type: "api", key: KEY, metadata: { line } }
    const o = await hooks.auth.loader(async () => auth)
    assert.equal(o.baseURL, `${origin}/v1`)
    // a key on one line is never sent to another
    for (const other of Object.values(I.LINES)) {
      if (other.origin !== origin) await assert.rejects(o.fetch(`${other.origin}/v1/messages`, { method: "POST", body: "{}" }), /refusing to send the API key/)
    }
  }
})

test("an account signed in before lines existed stays on the main line; an unknown line is refused", async () => {
  assert.equal(I.originOf({ type: "api", key: KEY }), "https://www.su8.codes")
  assert.throws(() => I.originOf({ type: "api", key: KEY, metadata: { line: "https://evil.example" } }), /Unknown SU8 line/)
  const hooks = await plugin.Su8CodesPlugin()
  const bad = async () => ({ type: "api", key: KEY, metadata: { line: "xx" } })
  await assert.rejects(hooks.auth.loader(bad), /Unknown SU8 line/)
  await assert.rejects(hooks.provider.models({ models: {} }, { auth: await bad() }), /Unknown SU8 line/)
  assert.match((await hooks.auth.usage(bad)).error, /Unknown SU8 line/)
})

test("no sign-in: no loader, the given list, and usage says so", async () => {
  const hooks = await plugin.Su8CodesPlugin()
  assert.deepEqual(await hooks.auth.loader(async () => undefined), {})
  const given = { a: {} }
  assert.equal(await hooks.provider.models({ models: given }, {}), given)
  assert.match((await hooks.auth.usage(async () => undefined)).error, /Not signed in/)
})
