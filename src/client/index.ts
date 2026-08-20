/**
 * dsh-cli-mimic — client settings page.
 *
 * Registers a "CLI 请求模拟" section in the DSH settings panel. The page
 * edits the same `cli-mimic` settings namespace the host plugin reads, so
 * saved values apply immediately.
 */
import { createElement, useEffect, useState } from 'react'

type AnyContext = any

export const inject = ['slots', 'connection']

const NS = 'cli-mimic'
const h = createElement

const inputStyle: Record<string, string> = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--dsw-alias-border-strong, #d0d7de)',
  background: 'var(--dsw-alias-bg-input, #ffffff)',
  color: 'var(--dsw-alias-text-primary, #1f2328)',
  fontSize: '13px',
  fontFamily: 'inherit',
}

const labelStyle: Record<string, string> = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--dsw-alias-label-primary, #24292f)',
}

const rowStyle: Record<string, string> = {
  marginBottom: '14px',
}

const cardStyle: Record<string, string> = {
  maxWidth: '760px',
  padding: '18px',
  borderRadius: '8px',
  border: '1px solid var(--dsw-alias-border-default, #d8dee4)',
  background: 'var(--dsw-alias-bg-surface, #ffffff)',
}

const toggleRowStyle: Record<string, string> = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '16px',
}

function field(label: string, value: string, onChange: (next: string) => void, textarea = false) {
  const props = {
    style: inputStyle,
    value,
    onChange: (event: any) => onChange(event.target.value),
  }
  return h('div', { style: rowStyle },
    h('label', { style: labelStyle }, label),
    textarea ? h('textarea', { ...props, rows: 4, style: { ...inputStyle, fontFamily: 'monospace', resize: 'vertical' } }) : h('input', { ...props, type: 'text' }),
  )
}

function SettingsPage(props: any) {
  const { api } = props
  const [phase, setPhase] = useState('loading')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  const [form, setForm] = useState({
    enabled: false,
    port: 4123,
    host: '127.0.0.1',
    upstreamBaseUrl: '',
    apiKeyEnv: '',
    authorizationPrefix: 'Bearer',
    userAgent: 'codex-tui/0.147.0 (Windows 10.0.19041; x86_64) WindowsTerminal (codex-tui; 0.147.0)',
    originator: 'codex_cli_rs',
    installationId: '',
    addClientMetadata: true,
    extraHeadersJson: '{}',
    extraBodyJson: '{}',
  })

  const load = async () => {
    setPhase('loading')
    setError('')
    try {
      if (!api) throw new Error('settings api unavailable')
      const response = await api.settings.describe({})
      if (!response.result.ok) throw new Error(response.result.error.message)
      const view = response.result.value.namespaces.find((entry: any) => entry.ns === NS)
      if (view) {
        setRevision(view.revision)
        setForm((prev) => ({ ...prev, ...(view.value ?? {}) }))
      }
      setPhase('ready')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setPhase('error')
    }
  }

  useEffect(() => {
    void load()
  }, [api])

  const set = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      if (!api) throw new Error('settings api unavailable')
      const response = await api.settings.update({
        ns: NS,
        patch: form,
        expectedRevision: revision,
      })
      if (!response.result.ok) throw new Error(response.result.error.message)
      setRevision(response.result.value.revision)
      setSavedAt(Date.now())
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSaving(false)
    }
  }

  if (phase === 'loading') {
    return h('div', { style: { color: 'var(--dsw-alias-label-tertiary, #6e7781)', fontSize: 13 } }, '加载中…')
  }
  if (phase === 'error') {
    return h('div', { style: { color: 'var(--dsw-alias-state-error-primary, #cf222e)', fontSize: 13 } }, error)
  }

  return h('div', { style: cardStyle },
    h('div', { style: toggleRowStyle },
      h('input', {
        type: 'checkbox',
        checked: form.enabled,
        onChange: (event: any) => set('enabled', event.target.checked),
        style: { width: 16, height: 16 },
      }),
      h('label', { style: { fontSize: 14, fontWeight: 700, color: 'var(--dsw-alias-text-primary, #1f2328)' } }, '全局开启 CLI 请求模拟'),
    ),
    field('上游 base URL（留空 = 保留每个模型自己的地址）', form.upstreamBaseUrl, (v) => set('upstreamBaseUrl', v)),
    field('凭证环境变量名', form.apiKeyEnv, (v) => set('apiKeyEnv', v)),
    field('Authorization 前缀', form.authorizationPrefix, (v) => set('authorizationPrefix', v)),
    field('User-Agent', form.userAgent, (v) => set('userAgent', v)),
    field('originator', form.originator, (v) => set('originator', v)),
    field('installation id（留空自动生成）', form.installationId, (v) => set('installationId', v)),
    field('本地代理端口', String(form.port), (v) => set('port', Number(v) || 4123)),
    h('div', { style: toggleRowStyle },
      h('input', {
        type: 'checkbox',
        checked: form.addClientMetadata,
        onChange: (event: any) => set('addClientMetadata', event.target.checked),
        style: { width: 16, height: 16 },
      }),
      h('label', { style: { fontSize: 13, color: 'var(--dsw-alias-text-primary, #1f2328)' } }, '注入 client_metadata'),
    ),
    field('额外请求头 JSON', form.extraHeadersJson, (v) => set('extraHeadersJson', v), true),
    field('额外请求体 JSON', form.extraBodyJson, (v) => set('extraBodyJson', v), true),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 } },
      h('button', {
        type: 'button',
        disabled: saving,
        onClick: () => void save(),
        style: {
          padding: '8px 16px',
          borderRadius: '6px',
          border: '1px solid var(--dsw-alias-border-strong, #d0d7de)',
          background: 'var(--dsw-alias-bg-accent, #0969da)',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        },
      }, saving ? '保存中…' : '保存'),
      savedAt > 0 ? h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary, #6e7781)' } }, '已保存') : null,
      error ? h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary, #cf222e)' } }, error) : null,
    ),
  )
}

export function apply(ctx: AnyContext): void {
  const connection = ctx.get('connection')
  ctx.effect(() => ctx.slots.inject('settings.section', () =>
    ctx.slots.register({
      name: 'settings.section',
      id: 'cli-mimic',
      order: 40,
      label: () => 'CLI 请求模拟',
      inject: () => ({ api: connection?.api }),
    }, SettingsPage),
  ), 'cli-mimic: settings page')
}
