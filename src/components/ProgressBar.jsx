export function ProgressBar({ current, max, label }) {
  const percentage = Math.min((current / max) * 100, 100);

  return (
    <div class="progress-bar-container">
      {label && <div class="progress-bar-label">{label}</div>}
      <div class="progress-bar">
        <div class="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
} 