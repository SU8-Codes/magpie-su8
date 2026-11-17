<div align="center">

<img src="https://www.su8.codes/favicon.svg" width="88" height="88" alt="SU8 Codes">

# SU8 Codes for magpie

**在 magpie 里用 SU8：粘贴一个 Key，所有 Agent 都能用上 SU8 的模型。**

[![test](https://github.com/SU8-Codes/magpie-su8/actions/workflows/test.yml/badge.svg)](https://github.com/SU8-Codes/magpie-su8/actions/workflows/test.yml)
[![license](https://img.shields.io/badge/license-MIT-111827)](LICENSE)

中文 · [English](#english)

</div>

---

[magpie](https://usemagpie.ai) 能把 Claude Code、Codex、OpenCode 等编程 Agent 统一接到你自己的模型来源上。装上这个插件后，你的 SU8 账号就是 magpie 里的一个供应商：

- 🔑 **一个 Key 就能用**：粘贴 SU8 的 API Key 即可，不用手动填接口地址和协议。
- 🧠 **模型自动同步**：列出这个 Key 能用的模型，带上下文长度和思考档位。
- 💰 **额度一眼看清**：账号卡片显示套餐今天还剩多少、钱包余额多少。
- 🌏 **五条线路可选**：主站、CN2、香港、日本、美国，挑网络最快的一条。
- ⚡ **长对话更省**：同一段对话尽量走同一条通道，缓存命中更高。

## 三步开始

### 1. 安装插件

在 magpie 里打开 **插件 › 发现**，搜索 `magpie-su8`，点安装。

也可以用命令行：

```sh
magpie plugin add magpie-su8
```

或者直接从 GitHub 安装最新版：`magpie plugin add github:SU8-Codes/magpie-su8`

### 2. 准备一个 Key

登录 [SU8 控制台](https://www.su8.codes/console/keys)，在 **密钥管理** 里新建或复制一个 API Key（以 `su8-` 开头）。

### 3. 登录

在 magpie 的 **供应商** 页面点 **添加供应商**，在 **来自插件** 里选 **SU8 Codes**：先选线路，再粘贴 Key。

也可以用命令行：

```sh
magpie plugin login su8
```

登录后，SU8 的模型就会出现在 magpie 的模型列表里，名字形如：

```text
su8/claude-sonnet-5-5
su8/gpt-6.1-sol
```

## 选择线路

五条线路连的是同一个 SU8 账号，额度、余额、Key 都通用，只是网络入口不同。哪条在你那里最快就用哪条。

| 线路 | 地址 | 说明 |
| --- | --- | --- |
| 主站（默认） | `www.su8.codes` | 大多数用户直接用这条 |
| CN2 | `cn2.su8.codes` | 中国大陆网络优化 |
| 香港 | `hk.su8.codes` | 海外节点，选离你近的 |
| 日本 | `jp.su8.codes` | 海外节点，选离你近的 |
| 美国 | `us2.su8.codes` | 海外节点，选离你近的 |

**想换线路？** 用同一个 Key 重新登录一次，选新的线路就行。magpie 会替换原来的登录，不会多出一个账号。

## 用量和余额

账号卡片上会显示：

- **每个套餐**：今天还剩多少额度（含前一天结转的部分）。
- **钱包余额**：按量付费可用的余额。

这些数字只用来展示，请求能不能用以 SU8 为准。每次调用的明细和费用，请到 SU8 控制台的 [调用记录](https://www.su8.codes/console/usage) 查看。

## 常见问题

<details>
<summary><b>登录后提示 Key 被拒绝</b></summary>

Key 可能被停用、已过期或已删除。到 SU8 控制台的 [密钥管理](https://www.su8.codes/console/keys) 检查这个 Key，确认可用后重新登录：`magpie plugin login su8`。
</details>

<details>
<summary><b>模型列表是空的，或者少了某个模型</b></summary>

插件只列出这个 Key 能调用的模型。请在 SU8 控制台确认：Key 绑定了你要的模型，并且有可用的套餐或余额。
</details>

<details>
<summary><b>请求很慢或者连不上</b></summary>

换一条线路试试：用同一个 Key 重新登录，选另一条线路。如果你的 magpie 设置了代理，也确认代理能访问对应的线路地址。
</details>

<details>
<summary><b>供应商显示成 <code>su8-plugin</code></b></summary>

说明你之前在 magpie 里手动添加过一个 id 叫 `su8` 的供应商。删掉手动添加的那个（`magpie provider rm su8`），插件就会恢复成 `su8`。
</details>

<details>
<summary><b>magpie 的用量页为什么算不出花了多少钱</b></summary>

SU8 的模型列表不带价格，所以 magpie 没法自己估算费用。实际扣费以 SU8 控制台的 [调用记录](https://www.su8.codes/console/usage) 为准。
</details>

## 安全与隐私

- **Key 只发给 SU8**：只会发往你选择的那条 SU8 线路，发往其他任何地址的请求都会被插件直接拒绝。
- **不暴露给其他插件**：magpie 会把插件声明的 Key 交给本机所有插件看，所以本插件对外只声明一个占位符，真正的 Key 只在发往 SU8 的那一刻才填上。
- **不收集任何数据**：没有统计上报，没有第三方依赖，也不在你的电脑上写任何文件。
- **Key 存在哪**：和 magpie 里其他登录信息一样，由 magpie 保存在它的配置目录（`~/.config/magpie/plugin-auth.json`）。

## 需要帮助

- SU8 控制台的 [帮助与支持](https://www.su8.codes/console/support)
- 插件问题：在本仓库提 [Issue](https://github.com/SU8-Codes/magpie-su8/issues)

---

## English

<div align="center">

**Use SU8 in magpie: paste one key, and every agent can use SU8's models.**

</div>

[magpie](https://usemagpie.ai) connects coding agents such as Claude Code, Codex and OpenCode to the model sources you choose. With this plugin your SU8 account becomes a magpie provider:

- 🔑 **One key is all it takes**: no base URLs or protocols to fill in.
- 🧠 **Models stay in sync**: the models your key can use, with context windows and reasoning levels.
- 💰 **Allowance at a glance**: each plan's allowance left today and your wallet balance, on the account card.
- 🌏 **Five lines**: Main, CN2, Hong Kong, Japan and United States. Pick the fastest for you.
- ⚡ **Long conversations cost less**: a conversation stays on one upstream, so its prompt cache is reused.

### Get started

```sh
magpie plugin add magpie-su8     # or: Plugins › Discover, search "magpie-su8"
magpie plugin login su8          # pick a line, then paste an API key (su8-…)
```

To install the latest version straight from GitHub: `magpie plugin add github:SU8-Codes/magpie-su8`

Get a key from the **API keys** page of the [SU8 console](https://www.su8.codes/console/keys). Models are then named like `su8/claude-sonnet-5-5`.

### Lines

All five lines reach the same SU8 account, with the same keys, plans and balance. Only the network route differs.

| Line | Address | Notes |
| --- | --- | --- |
| Main (default) | `www.su8.codes` | Right for most users |
| CN2 | `cn2.su8.codes` | Tuned for mainland China networks |
| Hong Kong | `hk.su8.codes` | Overseas: pick the one nearest you |
| Japan | `jp.su8.codes` | Overseas: pick the one nearest you |
| United States | `us2.su8.codes` | Overseas: pick the one nearest you |

To switch lines, sign in again with the same key and pick another line. magpie replaces the old sign-in instead of adding a second account.

### Good to know

- Allowance and balance are shown for your information; SU8 decides whether a request is served. See each call and its cost under **Usage** in the [SU8 console](https://www.su8.codes/console/usage).
- SU8's model list carries no prices, so magpie can't estimate cost itself.
- If the provider shows as `su8-plugin`, you added a custom provider with the id `su8` earlier. Remove it (`magpie provider rm su8`) and the plugin becomes `su8`.

### Security and privacy

- Your key is sent only to the SU8 line you picked; the plugin refuses to send it anywhere else.
- magpie shows a plugin's declared key to every installed plugin, so this plugin declares a placeholder and sets the real key only on requests to SU8.
- No telemetry, no runtime dependencies, nothing written to your disk. magpie keeps the key with its other sign-ins, in `~/.config/magpie/plugin-auth.json`.

### Help

[Help & support](https://www.su8.codes/console/support) in the SU8 console, or open an [issue](https://github.com/SU8-Codes/magpie-su8/issues) for the plugin.

---

<div align="center">

MIT License · The logo belongs to SU8 Codes

</div>
