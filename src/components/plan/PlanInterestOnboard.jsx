import { useEffect, useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { INTEREST_DOMAINS } from '../../utils/constants';

/* Plan onboarding — first-time user picks interests.
   Pattern: Airbnb "Recommended for you" tiles + Notion onboarding
   modal. Multi-select grid; large visual tiles with emoji landmarks
   to lower scanning cost (recognition > recall). Skippable.

   Emoji is intentional over abstract glyphs — Airbnb's amenity icons
   are also semi-illustrative for the same reason: they read faster
   than monochrome line icons at small sizes. */

export const INTEREST_ICONS = {
  'AI/ML':                '🤖',
  'Data Science':         '📊',
  'Systems & Networks':   '🌐',
  'Theory & Algorithms':  '🧮',
  'Robotics & Control':   '🦾',
  'Hardware & VLSI':      '🔌',
  'Signal & Comms':       '📡',
  'Design & HCI':         '🎨',
  'Pure Math':            '∑',
  'Management':           '📋',
  'Finance & Economics':  '💹',
  'Entrepreneurship':     '🚀',
};

export default function PlanInterestOnboard({ initial = [], onSave, onSkip }) {
  const [picked, setPicked] = useState(initial);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onSkip?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onSkip]);

  const toggle = (v) => {
    setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  };

  return (
    <div className="modal-overlay" onClick={onSkip}>
      <div
        className="modal-content plan-onboard-v2"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="plan-onboard-title"
      >
        <header className="plan-onboard-v2-head">
          <span className="plan-onboard-v2-eyebrow">
            <Sparkles size={11} /> Personalize Plan
          </span>
          <h2 id="plan-onboard-title">What are you interested in?</h2>
          <p>Pick a few areas — we'll surface courses you'll love.</p>
          <button
            type="button"
            className="plan-onboard-v2-close"
            onClick={onSkip}
            aria-label="Skip"
          >
            <X size={18} />
          </button>
        </header>

        <div className="plan-onboard-v2-grid" role="listbox" aria-multiselectable="true">
          {INTEREST_DOMAINS.map(({ value }) => {
            const on = picked.includes(value);
            return (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={on}
                className={`plan-onboard-tile ${on ? 'on' : ''}`}
                onClick={() => toggle(value)}
              >
                <span className="plan-onboard-tile-icon" aria-hidden>
                  {INTEREST_ICONS[value] || '✨'}
                </span>
                <span className="plan-onboard-tile-label">{value}</span>
                {on && (
                  <span className="plan-onboard-tile-check" aria-hidden>
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <footer className="plan-onboard-v2-foot">
          <button type="button" className="btn btn-secondary" onClick={onSkip}>
            Skip for now
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onSave(picked)}
            disabled={picked.length === 0}
          >
            {picked.length > 0 ? `Save · ${picked.length} picked` : 'Pick at least one'}
          </button>
        </footer>
      </div>
    </div>
  );
}
