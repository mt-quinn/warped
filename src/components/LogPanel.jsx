import { memo, useEffect, useRef } from 'preact/compat';
import './LogPanel.css';

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export const LogPanel = memo(({ log }) => {
  const logEntriesRef = useRef(null);

  useEffect(() => {
    if (logEntriesRef.current) {
      logEntriesRef.current.scrollTop = logEntriesRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <div className="log-panel">
      <h2>System Log</h2>
      <div className="log-entries" ref={logEntriesRef}>
        {log.map(entry => (
          <div key={entry.id} className={`log-entry ${entry.type}`}>
            <span className="timestamp">{formatTime(entry.timestamp)}</span>
            <span className="message">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}); 