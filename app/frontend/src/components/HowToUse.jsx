export function HowToUse({ t }) {
  return (
    <div className="card how-to-use-card">
      <div className="card-title">{t.howToUse.title}</div>
      <p className="how-subtitle">{t.howToUse.subtitle}</p>
      <ol className="steps-list">
        {t.howToUse.steps.map(s => (
          <li key={s.num} className="step-item">
            <span className="step-num">{s.num}</span>
            <div className="step-body">
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
