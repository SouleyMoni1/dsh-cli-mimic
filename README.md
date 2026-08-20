# dsh-cli-mimic

在 DSH 中把模型请求伪装成 CLI 请求的全局代理插件，配置放在插件设置页，
不写入模型配置。

当前内置模拟画像：Codex CLI。后续会继续加入 Claude Code、OpenCode 等
CLI 画像，命名已经按通用 CLI 模拟预留。

## 做了什么

插件在本地启动一个 HTTP 代理，并注册一个“CLI 请求模拟”设置页。开启后，
DSH 里任何 provider/model 发出的模型请求都会被全局拦截，先经过本代理，
再按当前 CLI 画像改写外发请求。

当前 Codex CLI 画像会改写：

- `user-agent` -> `codex-tui/0.147.0 (Windows 10.0.19041; x86_64) WindowsTerminal (codex-tui; 0.147.0)`
- `originator` -> `codex_cli_rs`
- `oai-product-sku` -> `codex`
- 注入 `x-codex-installation-id`
- 注入 `x-codex-turn-metadata`
- 在请求体里注入 `client_metadata`
- 支持 zstd 压缩请求体：先解压、注入、再压缩
- 保留上游 SSE 响应流，透传给 DSH

设置页可配置：

- 全局开关
- 上游 base URL（留空 = 保留每个模型自己的地址）
- 凭证环境变量名与 Authorization 前缀
- User-Agent、originator、installation id
- 是否注入 `client_metadata`
- 额外请求头 JSON
- 额外请求体 JSON
- 本地代理端口

## 安装

包名：`dsh-cli-mimic`。

用 DSH 自带命令安装（推荐）：

```bash
dsh plugin --profile web add dsh-cli-mimic
```

用 npm 直接安装：

```bash
npm install dsh-cli-mimic
```

也可以直接从 Git 安装：

```bash
npm install github:SouleyMoni1/dsh-cli-mimic
```

卸载：

```bash
dsh plugin --profile web remove dsh-cli-mimic
```

## 构建与注入

当前 DSH checkout 是 npm 安装布局时，直接显式传入 `DSH_CHECKOUT`：

```bash
DSH_CHECKOUT=<checkout> bash scripts/build.sh
```

在 DSH 注入器环境内：

```text
dev_inject_plugin F:/EdenOS/AI/dsh-cli-mimic
```

## 使用

1. 在 DSH 设置页打开“CLI 请求模拟”。
2. 填写上游 base URL，例如 `https://sub2api.edenaios.com/v1`。
3. 填写凭证环境变量名，并在 DSH 凭证里配置对应 key。
4. 保存后，任意模型请求都会按当前 CLI 画像发出。

上游地址以 `/v1` 结尾时，当前 Codex 画像请求 `/v1/responses`；以 `/codex`
结尾时请求 `/codex/responses`。

插件也保留三个工具：

- `cli_mimic_status`：查看代理状态、转发/拦截计数、当前配置。
- `cli_mimic_configure`：与设置页同源，更新插件设置。
- `cli_mimic_probe`：用 DSH 现有 provider 发一次探针请求。

## 边界

“完全模拟”取决于目标网站具体检查什么。当前实现覆盖常见的 HTTP 头、请求体和
SSE 指纹；如果目标还要求 WebSocket 传输、真实可验签的 token、特定 CLI 的
专属 claims，或对 metadata 内部结构做严格校验，需要按目标接口补对应画像。

本插件仅用于你有权接入的兼容网关、自有部署或正当互操作场景，不要用于绕过
供应商的访问限制或违反服务条款。
