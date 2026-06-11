import { useState } from 'react'
import * as api from '../api'

const DEFAULT_MODEL = 'qwen2.5:7b'

export function AIScriptAssistant({ onApply, t }) {
  const [expanded,   setExpanded]   = useState(false)
  const [rawScript,  setRawScript]  = useState('')
  const [model,      setModel]      = useState(DEFAULT_MODEL)
  const [loading,    setLoading]    = useState(false)
  const [testing,    setTesting]    = useState(false)
  const [healthInfo, setHealthInfo] = useState(null)   // {ok, message, available_models}
  const [result,     setResult]     = useState(null)
  const [editResult, setEditResult] = useState(null)
  const [error,      setError]      = useState(null)
  const [applied,    setApplied]    = useState(false)
  const [copied,     setCopied]     = useState(false)

  const setField = (key, val) =>
    setEditResult(r => ({ ...r, [key]: val }))

  // ── Error parsing ─────────────────────────────────────────────────────────

  const parseError = (e) => {
    // detail can be a string or a structured {code, message, model} object
    const detail = e.detail
    const status = e.status

    if (detail && typeof detail === 'object') {
      const code = detail.code
      if (code === 'OLLAMA_NOT_RUNNING') return t.ai.ollamaError
      if (code === 'MODEL_NOT_FOUND') {
        return `${t.ai.modelError} ${detail.model || model}`
      }
      return `${t.ai.genericError}: ${detail.message || JSON.stringify(detail)}`
    }

    const msg = typeof detail === 'string' ? detail : (e.message || '')
    const lc  = msg.toLowerCase()

    if (status === 503 || lc.includes('not running') || lc.includes('ollama'))
      return t.ai.ollamaError
    if (status === 404 || lc.includes('not found'))
      return `${t.ai.modelError} ${model}`
    return `${t.ai.genericError}: ${msg || status}`
  }

  // ── Test connection ───────────────────────────────────────────────────────

  const handleTest = async () => {
    setTesting(true)
    setHealthInfo(null)
    try {
      const res = await api.checkScriptHealth(model)
      setHealthInfo(res)
    } catch (e) {
      setHealthInfo({
        ok: false,
        ollama_running: false,
        model_found: false,
        user_message: parseError(e),
        available_models: [],
      })
    } finally {
      setTesting(false)
    }
  }

  // ── Format ────────────────────────────────────────────────────────────────

  const handleFormat = async () => {
    if (!rawScript.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setApplied(false)
    try {
      const r = await api.formatScript({ raw_text: rawScript, model })
      setResult(r)
      setEditResult({
        title:          r.title          || '',
        subtitle:       r.subtitle       || '',
        keywords:       (r.keywords || []).join(', '),
        clean_script:   r.clean_script   || '',
        subtitle_lines: (r.subtitle_lines || []).join('\n'),
        opening_hook:   r.opening_hook   || '',
      })
    } catch (e) {
      setError(parseError(e))
    } finally {
      setLoading(false)
    }
  }

  // ── Apply ─────────────────────────────────────────────────────────────────

  const handleApply = () => {
    const keywords = editResult.keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)
    onApply({
      title:         editResult.title,
      subtitle:      editResult.subtitle,
      keywords,
      script:        editResult.clean_script,
      subtitle_lines: editResult.subtitle_lines.split('\n').map(s => s.trim()).filter(Boolean),
      opening_hook:   editResult.opening_hook,
      script_source:  'ollama',
      script_model:   model,
    })
    setApplied(true)
    setTimeout(() => setApplied(false), 3000)
  }

  const handleCopySubtitles = () => {
    navigator.clipboard.writeText(editResult.subtitle_lines).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Health info display ───────────────────────────────────────────────────

  const renderHealthInfo = () => {
    if (!healthInfo) return null
    const msg = healthInfo.user_message_zh || healthInfo.user_message || ''
    const ok  = healthInfo.ok

    return (
      <div className={`ai-health${ok ? ' ai-health-ok' : ' ai-health-fail'}`}>
        {ok ? '✓ ' : '✕ '}{msg}
        {!ok && healthInfo.available_models?.length > 0 && (
          <div className="ai-health-models">
            {t.ai.availableModels} {healthInfo.available_models.join(', ')}
          </div>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`ai-assistant${expanded ? ' ai-expanded' : ''}`}>
      <button
        className="ai-toggle-btn"
        onClick={() => setExpanded(v => !v)}
        type="button"
      >
        <span className="ai-toggle-icon">{expanded ? '▼' : '▶'}</span>
        {t.ai.title}
      </button>

      {expanded && (
        <div className="ai-body">
          {/* Model row + Test button */}
          <div className="ai-model-row">
            <div className="ai-model-group">
              <label className="ai-field-label">{t.ai.modelLabel}</label>
              <input
                className="form-input ai-model-input"
                value={model}
                onChange={e => { setModel(e.target.value); setHealthInfo(null) }}
                placeholder={DEFAULT_MODEL}
              />
            </div>
            <button
              className="btn btn-ghost btn-sm ai-test-btn"
              onClick={handleTest}
              disabled={testing}
              type="button"
            >
              {testing ? t.ai.testing : t.ai.testConnection}
            </button>
          </div>

          {renderHealthInfo()}

          {/* Raw script */}
          <div className="ai-input-row">
            <label className="ai-field-label">{t.ai.rawScript}</label>
            <textarea
              className="form-textarea ai-raw-textarea"
              value={rawScript}
              onChange={e => setRawScript(e.target.value)}
              placeholder={t.ai.rawScriptPlaceholder}
              rows={6}
            />
          </div>

          <div className="ai-format-row">
            <button
              className="btn btn-accent btn-sm"
              onClick={handleFormat}
              disabled={loading || !rawScript.trim()}
              type="button"
            >
              {loading ? t.ai.formatting : t.ai.formatWithAi}
            </button>
            {loading && <span className="ai-loading-dots">…</span>}
          </div>

          {error && <div className="ai-error">{error}</div>}

          {result && editResult && (
            <div className="ai-results">
              <div className="ai-results-title">— {t.ai.title} —</div>

              <AiField label={t.form.title} value={editResult.title}
                onChange={v => setField('title', v)} />
              <AiField label={t.form.subtitle} value={editResult.subtitle}
                onChange={v => setField('subtitle', v)} />
              <AiField label={t.form.keywords} value={editResult.keywords}
                onChange={v => setField('keywords', v)} />
              <AiField label={t.ai.openingHook} value={editResult.opening_hook}
                onChange={v => setField('opening_hook', v)} />
              <AiField label={t.ai.cleanScript} value={editResult.clean_script}
                onChange={v => setField('clean_script', v)} rows={5} />

              <div className="ai-field">
                <div className="ai-field-header">
                  <span className="ai-field-label">{t.ai.subtitleLines}</span>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={handleCopySubtitles}
                    type="button"
                  >
                    {copied ? t.ai.copied : t.ai.copySubtitles}
                  </button>
                </div>
                <textarea
                  className="form-textarea ai-subtitle-textarea"
                  value={editResult.subtitle_lines}
                  onChange={e => setField('subtitle_lines', e.target.value)}
                  rows={8}
                />
              </div>

              <div className="ai-apply-row">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleApply}
                  type="button"
                >
                  {applied ? t.ai.applied : t.ai.applyToForm}
                </button>
              </div>
            </div>
          )}

          {!result && !error && !loading && (
            <div className="ai-hint">{t.ai.noResult}</div>
          )}
        </div>
      )}
    </div>
  )
}

function AiField({ label, value, onChange, rows }) {
  return (
    <div className="ai-field">
      <label className="ai-field-label">{label}</label>
      {rows ? (
        <textarea
          className="form-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
        />
      ) : (
        <input
          className="form-input"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
