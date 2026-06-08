import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DAYS, DEPT_COLORS } from '../utils/constants';
import { timeToMinutes } from '../utils/helpers';

const START_HOUR = 8;
const END_HOUR = 18;
const SLOT_HEIGHT = 40;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2; // 30-min slots

export default function TimetableGrid({ enrollments }) {
  const navigate = useNavigate();

  const blocks = useMemo(() => {
    const result = [];
    if (!enrollments) return result;

    enrollments.forEach(({ course }) => {
      let lectures = [];
      try {
        lectures = typeof course.lecture_hours === 'string'
          ? JSON.parse(course.lecture_hours)
          : course.lecture_hours || [];
      } catch { lectures = []; }

      lectures.forEach(lec => {
        const dayIndex = DAYS.indexOf(lec.day);
        if (dayIndex === -1) return;

        const startMin = timeToMinutes(lec.start);
        const endMin = timeToMinutes(lec.end);
        const startSlot = (startMin - START_HOUR * 60) / 30;
        const endSlot = (endMin - START_HOUR * 60) / 30;

        if (startSlot < 0 || endSlot > TOTAL_SLOTS) return;

        result.push({
          courseId: course.id,
          code: course.code,
          room: lec.room || '',
          time: `${lec.start}–${lec.end}`,
          dayIndex,
          startSlot,
          endSlot,
          color: DEPT_COLORS[course.department] || 'var(--primary-400)',
          courseName: course.name,
          instructor: course.instructor,
        });
      });
    });

    return result;
  }, [enrollments]);

  // Generate time labels
  const timeLabels = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    timeLabels.push(`${String(h).padStart(2, '0')}:00`);
    timeLabels.push(`${String(h).padStart(2, '0')}:30`);
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="empty-state">
        <p>No courses enrolled yet. Browse courses to enroll!</p>
      </div>
    );
  }

  return (
    <div className="timetable-wrapper">
      <div className="timetable-grid">
        {/* Header row */}
        <div className="tt-corner" />
        {DAYS.map(day => (
          <div key={day} className="tt-day-header">{day.slice(0, 3)}</div>
        ))}

        {/* Time slots */}
        {timeLabels.map((label, i) => (
          <div key={i} className="tt-time-row" style={{ gridRow: i + 2 }}>
            <div className="tt-time-label">{i % 2 === 0 ? label : ''}</div>
            {DAYS.map((_, dayIdx) => (
              <div key={dayIdx} className="tt-cell" />
            ))}
          </div>
        ))}

        {/* Course blocks */}
        {blocks.map((block, i) => (
          <div
            key={i}
            className="tt-block"
            style={{
              gridColumn: block.dayIndex + 2,
              gridRow: `${Math.floor(block.startSlot) + 2} / ${Math.floor(block.endSlot) + 2}`,
              backgroundColor: `${block.color}22`,
              borderLeft: `3px solid ${block.color}`,
              color: block.color,
            }}
            onClick={() => navigate(`/courses/${block.courseId}`)}
            title={`${block.code} — ${block.courseName}\n${block.time}\n${block.room}\n${block.instructor}`}
          >
            <span className="tt-block-code">{block.code}</span>
            <span className="tt-block-room">{block.room}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
