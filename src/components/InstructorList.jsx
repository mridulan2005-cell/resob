import { useMemo, useState } from 'react';
import { User } from 'lucide-react';
import { parseInstructors, groupInstructors } from '../utils/helpers';

// Inline +N expand pattern (Linear / GitHub / Notion).
// • Names are deduplicated by grouping; each unique name carries its divisions.
// • By default we show the first 2 unique names. The remainder is hidden behind "+N more".
// • Each name's division list shows the first 4 pills inline; the rest collapse into a
//   compact "+N" button local to that row, which expands inline.
const VISIBLE_NAMES     = 2;
const VISIBLE_DIVISIONS = 4;

export default function InstructorList({ value, label = 'Instructors' }) {
  const grouped = useMemo(() => groupInstructors(parseInstructors(value)), [value]);
  const [expandedNames, setExpandedNames] = useState(false);

  if (grouped.length === 0) {
    return (
      <div className="instr-block">
        <div className="instr-label">{label}</div>
        <div className="instr-empty">TBA</div>
      </div>
    );
  }

  const visible = expandedNames ? grouped : grouped.slice(0, VISIBLE_NAMES);
  const hidden  = grouped.length - VISIBLE_NAMES;

  return (
    <div className="instr-block">
      <div className="instr-label">{label}</div>
      <ul className="instr-list">
        {visible.map((inst, i) => (
          <InstructorRow key={`${inst.name}-${i}`} inst={inst} />
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          className="instr-more"
          onClick={() => setExpandedNames(e => !e)}
          aria-expanded={expandedNames}
        >
          {expandedNames ? 'Show less' : `+${hidden} more`}
        </button>
      )}
    </div>
  );
}

function InstructorRow({ inst }) {
  const [showAllDivs, setShowAllDivs] = useState(false);
  const divs = inst.divisions || [];
  const visible = showAllDivs ? divs : divs.slice(0, VISIBLE_DIVISIONS);
  const more = divs.length - VISIBLE_DIVISIONS;

  return (
    <li className="instr-item">
      <span className="instr-icon" aria-hidden><User size={14} /></span>
      <div className="instr-row">
        <span className="instr-name">{inst.name}</span>
        {divs.length > 0 && (
          <span className="instr-divs" aria-label={`Divisions: ${divs.join(', ')}`}>
            {visible.map(d => <span key={d} className="instr-div">{d}</span>)}
            {more > 0 && !showAllDivs && (
              <button
                type="button"
                className="instr-divs-more"
                onClick={() => setShowAllDivs(true)}
                aria-label={`Show ${more} more divisions`}
              >
                +{more}
              </button>
            )}
            {showAllDivs && divs.length > VISIBLE_DIVISIONS && (
              <button
                type="button"
                className="instr-divs-more"
                onClick={() => setShowAllDivs(false)}
              >
                less
              </button>
            )}
          </span>
        )}
      </div>
    </li>
  );
}
