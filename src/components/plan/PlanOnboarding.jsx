import { useState } from 'react';
import { ChevronRight, Sparkles, Target } from 'lucide-react';
import { INTEREST_DOMAINS } from '../../utils/constants';

const CREDIT_MARKS = [
  { val: 12, label: 'Light' },
  { val: 24, label: 'Normal' },
  { val: 36, label: 'Heavy' },
];

export default function PlanOnboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState([]);
  const [targetCredits, setTargetCredits] = useState(24);

  const toggleInterest = (domain) =>
    setInterests(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );

  const finish = () => onComplete({ interests, targetCredits });

  return (
    <div className="modal-overlay">
      <div className="modal-content plan-onboard-modal">
        {/* Step pips */}
        <div className="plan-onboard-pips">
          <span className={`plan-onboard-pip ${step >= 0 ? 'active' : ''}`} />
          <span className={`plan-onboard-pip ${step >= 1 ? 'active' : ''}`} />
        </div>

        {step === 0 ? (
          <>
            <div className="plan-onboard-head">
              <div className="plan-onboard-icon"><Sparkles size={22} /></div>
              <h2>What are you interested in?</h2>
              <p>We'll surface courses from these areas first. You can always change this later.</p>
            </div>
            <div className="plan-onboard-chips">
              {INTEREST_DOMAINS.map(({ value }) => (
                <button
                  key={value}
                  type="button"
                  className={`plan-onboard-chip ${interests.includes(value) ? 'on' : ''}`}
                  onClick={() => toggleInterest(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="plan-onboard-head">
              <div className="plan-onboard-icon"><Target size={22} /></div>
              <h2>How many credits are you targeting?</h2>
              <p>We'll flag if you're over- or under-loading. You can adjust this on the planner too.</p>
            </div>
            <div className="plan-onboard-credits-wrap">
              <span className="plan-onboard-credits-val">{targetCredits} <small>credits</small></span>
              <input
                type="range"
                min={12} max={40} step={2}
                value={targetCredits}
                onChange={e => setTargetCredits(Number(e.target.value))}
                className="plan-onboard-slider"
              />
              <div className="plan-onboard-marks">
                {CREDIT_MARKS.map(m => (
                  <span
                    key={m.val}
                    className={`plan-onboard-mark ${targetCredits === m.val ? 'active' : ''}`}
                    onClick={() => setTargetCredits(m.val)}
                    style={{ cursor: 'pointer' }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="plan-onboard-footer">
          <button type="button" className="btn btn-ghost" onClick={finish}>
            Skip for now
          </button>
          {step === 0 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep(1)}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish}>
              <Sparkles size={15} /> Start planning
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
