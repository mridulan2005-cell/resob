import { formatDate, countdownText, countdownColor, daysUntil } from '../utils/helpers';

export default function ExamTimeline({ enrollments }) {
  // Collect all exams from enrolled courses
  const exams = [];
  if (enrollments) {
    enrollments.forEach(({ course }) => {
      if (course.midsem_date) {
        exams.push({
          courseId: course.id,
          code: course.code,
          name: course.name,
          type: 'Midsem',
          date: course.midsem_date,
          time: course.midsem_time || '',
        });
      }
      if (course.exam_date) {
        exams.push({
          courseId: course.id,
          code: course.code,
          name: course.name,
          type: 'Endsem',
          date: course.exam_date,
          time: course.exam_time || '',
        });
      }
    });
  }

  // Sort chronologically
  exams.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (exams.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
        <p>No upcoming exams</p>
      </div>
    );
  }

  return (
    <div className="exam-timeline">
      {exams.map((exam, i) => {
        const days = daysUntil(exam.date);
        const isPast = days !== null && days < 0;
        const color = countdownColor(exam.date);

        return (
          <div
            key={i}
            className={`exam-timeline-item ${isPast ? 'past' : ''}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="exam-dot" style={{ borderColor: isPast ? 'var(--text-muted)' : color }} />
            <div className="exam-line" />
            <div className="exam-content">
              <div className="exam-date">{formatDate(exam.date)}</div>
              <div className="exam-details">
                <strong>{exam.code}</strong> — {exam.type}
                {exam.time && <span className="exam-time">{exam.time}</span>}
              </div>
              {!isPast && (
                <span
                  className={`exam-countdown ${days <= 3 ? 'pulse' : ''}`}
                  style={{ color }}
                >
                  {countdownText(exam.date)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
