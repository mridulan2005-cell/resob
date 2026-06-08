import { useEffect, useRef, useState } from 'react';

export default function StatsCard({ icon: Icon, value, label, color }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isNumber = typeof value === 'number';

  useEffect(() => {
    if (!isNumber) {
      setDisplayValue(value);
      return;
    }
    const duration = 800;
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, isNumber]);

  return (
    <div className="glass-card stats-card" style={{ padding: 'var(--sp-5)' }}>
      <div className="stats-card-icon" style={{ color: color || 'var(--primary-400)' }}>
        {Icon && <Icon size={24} />}
      </div>
      <div className="stats-card-content">
        <span className="stats-card-value">{isNumber ? displayValue : value}</span>
        <span className="stats-card-label">{label}</span>
      </div>
    </div>
  );
}
