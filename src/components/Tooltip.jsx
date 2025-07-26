import './Tooltip.css';

export function Tooltip({ children, text }) {
  if (!text) {
    return children;
  }

  return (
    <div className="tooltip-container">
      {children}
      <span className="tooltip-text">{text}</span>
    </div>
  );
} 