export function Header({ online, language, onLanguageChange, t }) {
  const dotClass = online === null
    ? 'status-dot'
    : online
    ? 'status-dot online'
    : 'status-dot offline'

  const statusText = online === null
    ? t.header.backendChecking
    : online
    ? t.header.backendOnline
    : t.header.backendOffline

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-title">{t.header.title}</div>
          <div className="header-sub">{t.header.subtitle}</div>
        </div>
        <div className="header-right">
          <div className="lang-toggle">
            <button
              className={`lang-btn${language === 'en' ? ' active' : ''}`}
              onClick={() => onLanguageChange('en')}
            >EN</button>
            <button
              className={`lang-btn${language === 'zh' ? ' active' : ''}`}
              onClick={() => onLanguageChange('zh')}
            >中</button>
          </div>
          <div className="status-indicator">
            <span className={dotClass} />
            <span>{statusText}</span>
          </div>
          <span className="badge-runner">{t.header.localRunner}</span>
        </div>
      </div>
    </header>
  )
}
