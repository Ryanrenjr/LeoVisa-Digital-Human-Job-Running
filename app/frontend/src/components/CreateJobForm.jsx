import { useState } from 'react'
import { BackgroundPicker }    from './BackgroundPicker'
import { AIScriptAssistant }   from './AIScriptAssistant'

const INITIAL = {
  title: '',
  subtitle: '',
  keywords: '',
  script: '',
  background_id: '',
  output_type: 'clean_video',
  shutdown_after_done: false,
  // AI-generated extras (sent with job create but not shown as form fields)
  subtitle_lines: null,
  opening_hook: null,
  script_source: null,
  script_model: null,
}

export function CreateJobForm({
  backgrounds,
  onSubmit,
  isSubmitting,
  onUploadBackground,
  onDeleteBackground,
  uploadingBackground,
  t,
}) {
  const [fields, setFields] = useState(INITIAL)
  const [errors, setErrors] = useState({})

  const set = (key, value) => {
    setFields(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }))
  }

  const validate = () => {
    const e = {}
    if (!fields.title.trim())  e.title  = t.form.required
    if (!fields.script.trim()) e.script = t.form.required
    if (fields.output_type === 'clean_video' && !fields.background_id)
      e.background_id = t.form.required
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (andRun) => {
    if (!validate()) return
    const keywords = fields.keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)
    onSubmit({ ...fields, keywords }, andRun)
  }

  const inputProps = (key) => ({
    className: 'form-input',
    value: fields[key],
    onChange: e => set(key, e.target.value),
  })

  const handleDeleteBackground = (bgId) => {
    if (fields.background_id === bgId) set('background_id', '')
    onDeleteBackground(bgId)
  }

  const handleAiApply = (result) => {
    setFields(f => ({
      ...f,
      title:         result.title    || f.title,
      subtitle:      result.subtitle || f.subtitle,
      keywords:      Array.isArray(result.keywords)
                       ? result.keywords.join(', ')
                       : (result.keywords || f.keywords),
      script:        result.script   || f.script,
      subtitle_lines: result.subtitle_lines || null,
      opening_hook:   result.opening_hook   || null,
      script_source:  result.script_source  || null,
      script_model:   result.script_model   || null,
    }))
    // Clear any validation errors that were blocking
    setErrors({})
  }

  return (
    <div className="card">
      <div className="card-title">{t.form.cardTitle}</div>

      {/* AI Script Assistant — collapsible, optional */}
      <AIScriptAssistant onApply={handleAiApply} t={t} />

      <div className="form-group">
        <label className="form-label">{t.form.title} <span className="req">*</span></label>
        <input {...inputProps('title')} placeholder={t.form.titlePlaceholder} />
        {errors.title && <div className="form-error">{errors.title}</div>}
      </div>

      <div className="form-group">
        <label className="form-label">{t.form.subtitle}</label>
        <input {...inputProps('subtitle')} placeholder={t.form.subtitlePlaceholder} />
      </div>

      <div className="form-group">
        <label className="form-label">{t.form.keywords}</label>
        <input {...inputProps('keywords')} placeholder={t.form.keywordsPlaceholder} />
        <div className="form-hint">{t.form.keywordsHint}</div>
      </div>

      <div className="form-group">
        <label className="form-label">{t.form.script} <span className="req">*</span></label>
        <textarea
          className="form-textarea"
          value={fields.script}
          onChange={e => set('script', e.target.value)}
          placeholder={t.form.scriptPlaceholder}
        />
        {errors.script && <div className="form-error">{errors.script}</div>}
      </div>

      {/* ── Background picker (clean_video only) ── */}
      {fields.output_type === 'clean_video' && (
        <div className="form-group">
          <label className="form-label">{t.form.background} <span className="req">*</span></label>
          <BackgroundPicker
            backgrounds={backgrounds}
            selectedId={fields.background_id}
            onSelect={id => set('background_id', id)}
            onDelete={handleDeleteBackground}
            onUpload={onUploadBackground}
            uploading={uploadingBackground}
            t={t}
          />
          {errors.background_id && <div className="form-error">{errors.background_id}</div>}
        </div>
      )}

      {/* ── Voice (read-only) ── */}
      <div className="form-group">
        <label className="form-label">{t.form.voice}</label>
        <div className="form-voice-display">{t.form.voiceDefault}</div>
      </div>

      <div className="form-group">
        <label className="form-label">{t.form.outputType}</label>
        <div className="output-type-toggle">
          <button
            type="button"
            className={`output-type-btn${fields.output_type === 'clean_video' ? ' active' : ''}`}
            onClick={() => set('output_type', 'clean_video')}
          >
            {t.form.outputTypeVideo}
          </button>
          <button
            type="button"
            className={`output-type-btn${fields.output_type === 'voice_only' ? ' active' : ''}`}
            onClick={() => set('output_type', 'voice_only')}
          >
            {t.form.outputTypeVoice}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={fields.shutdown_after_done}
            onChange={e => set('shutdown_after_done', e.target.checked)}
          />
          <span className="checkbox-text">{t.form.shutdownAfterDone}</span>
          <span className="checkbox-warn"> {t.form.shutdownWarn}</span>
        </label>
      </div>

      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={() => submit(false)}
          disabled={isSubmitting}
        >
          {isSubmitting ? t.form.creating : t.form.createJob}
        </button>
        <button
          className="btn btn-accent"
          onClick={() => submit(true)}
          disabled={isSubmitting}
        >
          {isSubmitting ? t.form.working : t.form.createAndRun}
        </button>
      </div>
    </div>
  )
}
