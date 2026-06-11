import { useState } from 'react'
import * as api from '../api'

const DEFAULT_MODEL = 'qwen2.5:7b'

const BLANK_RESULT = {
  title:          '',
  subtitle:       '',
  keywords:       [],
  clean_script:   '',
  subtitle_lines: [],
  opening_hook:   '',
}

export function AIScriptAssistant({ onApply, t }) {
  const [expanded,     setExpanded]     = useState(false)
  const [rawScript,    setRawScript]    = useState('')
  const [model,        setModel]        = useState(DEFAULT_MODEL)
  const [loading,      setLoading]      = useState(false)
  const [result,       setResult]       = useState(null)
  const [editResult,   setEditResult]   = useState(BLANK_RESULT)
  const [error,        setError]        = useState(null)
  const [applied,      setApplied]      = useState(false)
  const [copied,       setCopied]       = useState(false)

  const setField = (key, value) =>
    setEditResult(r => ({ ...r, [key]: value }))

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
      const msg = e.detail || e.message || t.ai.genericError
      if (msg.toLowerCase().includes('ollama') && msg.toLowerCase().includes('not running')) {
        setError(t.ai.ollamaError)
      } else if (msg.toLowerCase().includes('model not found')) {
        setError(t.ai.modelError)
      } else {
        setError(`${t.ai.genericError}: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    const keywords = editResult.keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)
    onApply({
      title:    editResult.title,
      subtitle: editResult.subtitle,
      keywords: keywords,
      script:   editResult.clean_script,
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
          {/* Model + Raw Script */}
          <div className="ai-input-row">
            <label className="ai-field-label">{t.ai.modelLabel}</label>
            <input
              className="form-input ai-model-input"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={DEFAULT_MODEL}
            />
          </div>

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

          {error && (
            <div className="ai-error">{error}</div>
          )}

          {result && (
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
