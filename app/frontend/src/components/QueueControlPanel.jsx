export function QueueControlPanel({
  status,
  onToggleAutoRun,
  onPause,
  onResume,
  onRunNext,
  onToggleShutdown,
  t,
}) {
  // Always render a shell — never invisible
  if (!status) {
    return (
      <div className="qcp">
        <div className="qcp-header">
          <span className="qcp-title">{t.queue.controlPanel}</span>
          <span className="qcp-status-badge qcp-s-idle">…</span>
        </div>
        <div className="qcp-offline-hint">
          {t.header.backendChecking}
        </div>
      </div>
    )
  }

  const qs = status.status   // 'idle' | 'running' | 'paused' | 'completed'

  const statusLabel = {
    idle:      t.queue.idleStatus,
    running:   t.queue.running,
    paused:    t.queue.pausedStatus,
    completed: t.queue.completedStatus,
    error:     t.queue.failedStatus,
  }[qs] ?? qs

  return (
    <div className="qcp">
      <div className="qcp-header">
        <span className="qcp-title">{t.queue.controlPanel}</span>
        <span className={`qcp-status-badge qcp-s-${qs}`}>{statusLabel}</span>
      </div>

      {/* Auto-run toggle */}
      <div className="qcp-autorun-row">
        <label className="qcp-toggle-label">
          <input
            type="checkbox"
            checked={!!status.auto_run}
            onChange={e => onToggleAutoRun(e.target.checked)}
          />
          <span className="qcp-toggle-text">{t.queue.autoRun}</span>
        </label>
        {status.auto_run && (
          <span className="qcp-autorun-hint">{t.queue.autoRunEnabled}</span>
        )}
      </div>

      {/* Counts */}
      <div className="qcp-counts">
        {status.running_count  > 0 && (
          <span className="qcp-count c-running">{status.running_count} {t.queue.running}</span>
        )}
        {status.pending_count  > 0 && (
          <span className="qcp-count c-pending">{status.pending_count} {t.queue.pending}</span>
        )}
        {status.finished_count > 0 && (
          <span className="qcp-count c-finished">{status.finished_count} {t.queue.completedStatus}</span>
        )}
        {status.failed_count   > 0 && (
          <span className="qcp-count c-failed">{status.failed_count} {t.queue.failedStatus}</span>
        )}
        {(status.pending_count === 0 && status.running_count === 0 &&
          status.finished_count === 0 && status.failed_count === 0) && (
          <span className="qcp-count c-pending">{t.queue.noJobs}</span>
        )}
      </div>

      {/* Current running job */}
      {status.current_job_id && (
        <div className="qcp-current">
          <span className="qcp-current-label">{t.queue.currentJob}:</span>
          <span className="qcp-current-title">
            {status.current_job_title || status.current_job_id}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="qcp-actions">
        {!status.paused ? (
          <button className="btn btn-ghost btn-xs" onClick={onPause}>
            {t.queue.pauseQueue}
          </button>
        ) : (
          <button className="btn btn-primary btn-xs" onClick={onResume}>
            {t.queue.resumeQueue}
          </button>
        )}
        <button
          className="btn btn-ghost btn-xs"
          onClick={onRunNext}
          disabled={status.running_count > 0 || status.pending_count === 0}
        >
          {t.queue.runNext}
        </button>
        <label className="qcp-toggle-label qcp-shutdown-toggle">
          <input
            type="checkbox"
            checked={!!status.shutdown_after_complete}
            onChange={e => onToggleShutdown(e.target.checked)}
          />
          <span className="qcp-toggle-text">{t.queue.stopAfterComplete}</span>
        </label>
      </div>
    </div>
  )
}
