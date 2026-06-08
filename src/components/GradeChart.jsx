import { useEffect, useRef, useState } from 'react';
import { GRADE_ORDER, GRADE_COLORS } from '../utils/constants';

export default function GradeChart({ grades, semester }) {
  const [animated, setAnimated] = useState(false);
  const chartRef = useRef(null);

  // Filter by semester if provided
  const filteredGrades = semester
    ? grades.filter(g => g.semester === semester)
    : grades;

  // Build grade counts
  const gradeCounts = {};
  GRADE_ORDER.forEach(g => { gradeCounts[g] = 0; });
  filteredGrades.forEach(g => {
    if (gradeCounts.hasOwnProperty(g.grade)) {
      gradeCounts[g.grade] += g.count;
    }
  });

  const maxCount = Math.max(...Object.values(gradeCounts), 1);
  const totalStudents = Object.values(gradeCounts).reduce((a, b) => a + b, 0);
  const passCount = totalStudents - (gradeCounts['FR'] || 0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
      { threshold: 0.3 }
    );
    if (chartRef.current) observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  if (!grades || grades.length === 0) {
    return (
      <div className="empty-state">
        <p>No grade data available for this course.</p>
      </div>
    );
  }

  return (
    <div className="grade-chart-container" ref={chartRef}>
      <div className="grade-chart">
        {GRADE_ORDER.map((grade, i) => {
          const count = gradeCounts[grade];
          const heightPct = (count / maxCount) * 100;
          const pct = totalStudents > 0 ? ((count / totalStudents) * 100).toFixed(1) : 0;

          return (
            <div key={grade} className="grade-bar-group" title={`${grade}: ${count} students (${pct}%)`}>
              <div className="grade-bar-wrapper">
                <div
                  className="grade-bar"
                  style={{
                    height: animated ? `${heightPct}%` : '0%',
                    background: `linear-gradient(to top, ${GRADE_COLORS[grade]}CC, ${GRADE_COLORS[grade]})`,
                    transitionDelay: `${i * 60}ms`,
                  }}
                >
                  <span className="grade-bar-tooltip">
                    {count} ({pct}%)
                  </span>
                </div>
              </div>
              <span className="grade-bar-label">{grade}</span>
            </div>
          );
        })}
      </div>

      <div className="grade-stats-row">
        <div className="grade-stat">
          <span className="grade-stat-value">{totalStudents}</span>
          <span className="grade-stat-label">Total Students</span>
        </div>
        <div className="grade-stat">
          <span className="grade-stat-value">
            {totalStudents > 0 ? `${((passCount / totalStudents) * 100).toFixed(0)}%` : '—'}
          </span>
          <span className="grade-stat-label">Pass Rate</span>
        </div>
        <div className="grade-stat">
          <span className="grade-stat-value">{gradeCounts['AA'] || 0}</span>
          <span className="grade-stat-label">AA Grade</span>
        </div>
      </div>
    </div>
  );
}
