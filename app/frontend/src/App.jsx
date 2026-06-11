import { useState, useEffect, useCallback } from 'react'
import { Header }             from './components/Header'
import { CreateJobForm }      from './components/CreateJobForm'
import { HowToUse }           from './components/HowToUse'
import { JobQueue }           from './components/JobQueue'
import { JobDetail }          from './components/JobDetail'
import { QueueControlPanel }  from './components/QueueControlPanel'
import { translations }       from './translations'
import * as api from './api'

export default function App() {
  const [backendOnline,       setBackendOnline]       = useState(null)
  const [backgrounds,         setBackgrounds]         = useState([])
  const [jobs,                setJobs]                = useState([])
  const [selectedJobId,       setSelectedJobId]       = useState(null)
  const [jobLog,              setJobLog]              = useState(null)
  const [banner,              setBanner]              = useState(null)
  const [isSubmitting,        setIsSubmitting]        = useState(false)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [queueStatus,         setQueueStatus]         = useState(null)
  const [language,            setLanguage]            = useState(
    () => localStorage.getItem('leovisa_language') || 'en'
  )

  const t           = translations[language]
  const selectedJob = jobs.find(j => j.job_id === selectedJobId) || null

  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    localStorage.setItem('leovisa_language', lang)
  }

  // ---- API helpers ----
  const checkHealth = useCallback(async () => {
    try   { await api.getHealth(); setBackendOnline(true) }
    catch { setBackendOnline(false) }
  }, [])

  const loadBackgrounds = useCallback(async () => {
    try   { setBackgrounds(await api.getBackgrounds()) }
    catch (e) { console.warn('backgrounds:', e) }
  }, [])

  const loadJobs = useCallback(async () => {
    try   { setJobs(await api.getJobs()) }
    catch (e) { console.warn('jobs:', e) }
  }, [])

  const loadQueueStatus = useCallback(async () => {
    try   { setQueueStatus(await api.getQueueStatus()) }
    catch (e) { console.warn('queue status:', e) }
  }, [])

  const loadJobLog = useCallback(async (jobId) => {
    try   { const d = await api.getJobLog(jobId); setJobLog(d.log) }
    catch (e) { console.warn('log:', e) }
  }, [])

  // ---- Polling ----
  useEffect(() => {
    checkHealth()
    const timer = setInterval(checkHealth, 30_000)
    return () => clearInterval(timer)
  }, [checkHealth])

  useEffect(() => { loadBackgrounds() }, [loadBackgrounds])

  useEffect(() => {
    loadJobs()
    loadQueueStatus()
    const timer = setInterval(() => { loadJobs(); loadQueueStatus() }, 5_000)
    return () => clearInterval(timer)
  }, [loadJobs, loadQueueStatus])

  useEffect(() => {
    if (!selectedJobId) { setJobLog(null); return }
    loadJobLog(selectedJobId)
    const job = jobs.find(j => j.job_id === selectedJobId)
    if (job?.status === 'running') {
      const timer = setInterval(() => loadJobLog(selectedJobId), 5_000)
      return () => clearInterval(timer)
    }
  }, [selectedJobId, jobs, loadJobLog])

  // ---- Banner helpers ----
  const showBanner = (type, text) => {
    setBanner({ type, text })
    if (type === 'success') setTimeout(() => setBanner(null), 5_000)
  }

  // ---- Background handlers ----
  const handleUploadBackground = async (file) => {
    setUploadingBackground(true)
    try {
      await api.uploadBackground(file)
      await loadBackgrounds()
      showBanner('success', t.backgrounds.uploadSuccess)
    } catch (e) {
      showBanner('error', `${t.backgrounds.uploadFail}: ${e.detail || e.message}`)
    } finally {
      setUploadingBackground(false)
    }
  }

  const handleDeleteBackground = async (bgId) => {
    if (!window.confirm(t.backgrounds.deleteConfirm)) return
    try {
      await api.deleteBackground(bgId)
      await loadBackgrounds()
    } catch (e) {
      showBanner('error', e.detail || t.backgrounds.deleteBuiltinError)
    }
  }

  // ---- Queue handlers ----
  const handleToggleAutoRun = async (enabled) => {
    try   { setQueueStatus(await api.setQueueAutoRun(enabled)) }
    catch (e) { console.warn('auto-run:', e) }
  }

  const handlePauseQueue = async () => {
    try   { setQueueStatus(await api.pauseQueue()) }
    catch (e) { console.warn('pause:', e) }
  }

  const handleResumeQueue = async () => {
    try   { setQueueStatus(await api.resumeQueue()); await loadJobs() }
    catch (e) { console.warn('resume:', e) }
  }

  const handleRunNext = async () => {
    try   { setQueueStatus(await api.runNextJob()); await loadJobs() }
    catch (e) { showBanner('error', e.detail || t.messages.anotherRunning) }
  }

  const handleToggleShutdown = async (enabled) => {
    try   { setQueueStatus(await api.setQueueShutdownOnComplete(enabled)) }
    catch (e) { console.warn('shutdown toggle:', e) }
  }

  // ---- Job handlers ----
  const handleCreateJob = async (formData, andRun) => {
    setIsSubmitting(true)
    setBanner(null)
    try {
      const job = await api.createJob(formData)
      if (andRun) {
        try {
          await api.runJob(job.job_id)
          showBanner('success', `${t.messages.jobStarted}: ${job.job_id}`)
        } catch (e) {
          if (e.status === 409) {
            // Another job is running — message depends on auto-run state
            const autoOn = queueStatus?.auto_run
            showBanner(
              autoOn ? 'success' : 'error',
              autoOn ? t.messages.jobQueuedAutoRun : t.messages.jobCreatedAutoRunOff,
            )
          } else {
            showBanner('error', `${t.messages.jobCreated}, but could not start: ${e.detail}`)
          }
        }
      } else {
        showBanner('success', `${t.messages.jobCreated}: ${job.job_id}`)
      }
      await loadJobs()
      setSelectedJobId(job.job_id)
    } catch (e) {
      showBanner('error', `${t.messages.failCreate}: ${e.detail || e.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRunJob = async (jobId) => {
    setBanner(null)
    try {
      await api.runJob(jobId)
      await loadJobs()
      setSelectedJobId(jobId)
      showBanner('success', `${t.messages.jobStarted}: ${jobId}`)
    } catch (e) {
      if (e.status === 409) showBanner('error', t.messages.anotherRunning)
      else if (e.status === 400) showBanner('error', e.detail || t.messages.failRun)
      else showBanner('error', `${t.messages.failRun}: ${e.detail || e.message}`)
    }
  }

  const handleCancelJob = async (jobId) => {
    setBanner(null)
    try {
      await api.cancelJob(jobId)
      await loadJobs()
      showBanner('success', `${t.messages.jobCancelled}: ${jobId}`)
    } catch (e) {
      if (e.status === 409) showBanner('error', t.messages.activeProcess)
      else showBanner('error', e.detail || t.messages.failCancel)
    }
  }

  const handleResetJob = async (jobId) => {
    setBanner(null)
    try {
      await api.resetJob(jobId)
      await loadJobs()
      showBanner('success', `${t.messages.jobReset}: ${jobId}`)
    } catch (e) {
      if (e.status === 409) showBanner('error', t.messages.activeProcess)
      else showBanner('error', e.detail || t.messages.failReset)
    }
  }

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm(
      `${t.messages.deleteConfirmTitle}\n${t.messages.deleteConfirmBody}`
    )) return
    setBanner(null)
    try {
      await api.deleteJob(jobId)
      if (selectedJobId === jobId) setSelectedJobId(null)
      await loadJobs()
      showBanner('success', `${t.messages.jobDeleted}: ${jobId}`)
    } catch (e) {
      if (e.status === 409) showBanner('error', t.messages.cannotDeleteRunning)
      else showBanner('error', e.detail || t.messages.failDelete)
    }
  }

  const handleSelectJob = (jobId) => {
    setSelectedJobId(prev => prev === jobId ? null : jobId)
  }

  return (
    <div>
      <Header
        online={backendOnline}
        language={language}
        onLanguageChange={handleLanguageChange}
        t={t}
      />

      {banner && (
        <div className="banner-wrap">
          <div className={`banner banner-${banner.type}`}>
            <span>{banner.text}</span>
            <button className="banner-close" onClick={() => setBanner(null)}>×</button>
          </div>
        </div>
      )}

      <main className="main">
        <div className="left-panel">
          <CreateJobForm
            backgrounds={backgrounds}
            onSubmit={handleCreateJob}
            isSubmitting={isSubmitting}
            onUploadBackground={handleUploadBackground}
            onDeleteBackground={handleDeleteBackground}
            uploadingBackground={uploadingBackground}
            t={t}
          />
          <HowToUse t={t} />
        </div>

        <div className="right-panel">
          <QueueControlPanel
            status={queueStatus}
            onToggleAutoRun={handleToggleAutoRun}
            onPause={handlePauseQueue}
            onResume={handleResumeQueue}
            onRunNext={handleRunNext}
            onToggleShutdown={handleToggleShutdown}
            t={t}
          />
          <JobQueue
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelect={handleSelectJob}
            onRun={handleRunJob}
            onCancel={handleCancelJob}
            onReset={handleResetJob}
            onDelete={handleDeleteJob}
            onRefresh={loadJobs}
            t={t}
          />
          {selectedJob ? (
            <JobDetail
              job={selectedJob}
              log={jobLog}
              onClose={() => setSelectedJobId(null)}
              onRefreshLog={() => loadJobLog(selectedJobId)}
              onCancel={handleCancelJob}
              onReset={handleResetJob}
              onDelete={handleDeleteJob}
              t={t}
            />
          ) : (
            <div className="detail-empty">
              <div className="detail-empty-icon">◻</div>
              <div className="detail-empty-text">{t.detail.emptyTitle}</div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
