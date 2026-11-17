# magpie-su8

[SU8 Codes](https://www.su8.codes) 的 [magpie](https://usemagpie.ai) 插件：用 SU8 的 API Key 登录，magpie 里的每个 Agent（Claude Code、Codex、OpenCode……）就能用这个 Key 能调用的模型，并在账号卡片上看到套餐额度和余额。

[English](#english)

## 安装

在 magpie 里：**插件 › Discover**，搜索 `magpie-su8` 安装。或者用命令行：

```sh
magpie plugin add magpie-su8
```

## 登录

在 magpie 里「添加 provider › 来自插件」选 SU8 Codes，粘贴 SU8 控制台「API Keys」页面里的 Key（`su8-…`）。或者：

```sh
magpie plugin login su8
```

模型名形如 `su8/claude-sonnet-5-5`、`su8/gpt-6.1-sol`。

## 能做什么

- **模型**：只列出这个 Key 能调用的模型，带上下文长度和思考档位（SU8 给出时）。`claude-` 开头的走 Anthropic Messages，`gpt-` 等 OpenAI 模型走 Responses，其余走 Chat Completions；Agent 用别的协议发来的请求由 magpie 转换。
- **用量**：账号卡片显示每个套餐的剩余额度（含结转）和钱包余额。这些数字只做展示，请求能不能用由 SU8 判定。
- **会话**：Agent 报了会话 ID 时，插件把它带给 SU8，同一段对话尽量留在同一条线路上，提示词缓存命中更高。

## 已知限制

- **不显示价格**：SU8 的模型列表不带价格，magpie 的用量页估不出花费。实际扣费以 SU8 控制台的调用记录为准。
- 如果你之前在 magpie 里手动加过一个 id 叫 `su8` 的供应商，插件会显示成 `su8-plugin`。删掉手动加的那个（`magpie provider rm su8`）即可恢复成 `su8`。

## 安全

- 插件没有遥测，没有运行时依赖，也不在本机写任何文件。Key 由 magpie 保存在 `~/.config/magpie/plugin-auth.json`（权限 600）。
- Key 只会发往 `https://www.su8.codes`，发往其他任何地址的请求都会被直接拒绝。
- magpie 会把插件声明的 Key 交给本机所有插件，所以插件对外只声明一个占位符，真正的 Key 只在发给 SU8 的那一刻填上。

## 开发

```sh
npm test    # node --test，用本地的假 SU8 服务，不联网
```

---

## English

A [magpie](https://usemagpie.ai) provider plugin for [SU8 Codes](https://www.su8.codes). Sign in with an SU8 API key; every agent magpie runs can then use the models that key may call, and the account card shows each plan's allowance and the wallet balance.

```sh
magpie plugin add magpie-su8
magpie plugin login su8        # paste an API key (su8-…) from the SU8 console
```

- **Models**: the key's own list, with context windows and reasoning levels where SU8 gives them. `claude-*` models are spoken to on Anthropic Messages, OpenAI models on Responses, the rest on Chat Completions; magpie translates other APIs.
- **Usage**: each plan's allowance left (carry-over included) and the wallet balance, shown only: SU8 decides whether a request is served.
- **Sessions**: when an agent names its session, the plugin passes it to SU8 so a conversation stays on one upstream and its prompt cache is read again.
- **No prices**: SU8's model list carries none, so magpie can't estimate cost. The SU8 console's request log is the authority.
- **Security**: no telemetry, no runtime dependencies, nothing written to disk. The key goes only to `https://www.su8.codes`; the loader hands magpie a placeholder, since magpie shows loader options to every plugin's `chat.headers` hook.

## License

MIT. The icon is SU8 Codes' own logo, loaded from su8.codes to mark the service this plugin connects to.
