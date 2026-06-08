// Filler course data for the Plan page — realistic IIT Bombay courses
// across departments, course types, and difficulty levels. Grade stats are
// hand-tuned per course difficulty so the hover popover always has something
// meaningful to show.

export const FILLER_COURSES = [
  {
    id: 'mock-cs419',
    code: 'CS 419',
    name: 'Introduction to Machine Learning',
    instructor: 'Prof. Sunita Sarawagi',
    course_type: 'elective',
    credits: 6,
    department: 'Computer Science',
    slot: 'Slot 7',
    semester: 'Autumn 2026',
    total_seats: 120, filled_seats: 108,
    grade_stats: {
      distribution: { AA: 28, AB: 32, BB: 22, BC: 10, CC: 5, CD: 2, DD: 1, FR: 0 },
      avg_grade: 'A-', avg_gpa: 8.7, total_students: 248, pass_rate: 100,
    },
  },
  {
    id: 'mock-cs213',
    code: 'CS 213',
    name: 'Data Structures & Algorithms',
    instructor: 'Prof. Ajit A. Diwan',
    course_type: 'core',
    credits: 6,
    department: 'Computer Science',
    slot: 'Slot 3',
    semester: 'Autumn 2026',
    total_seats: 90, filled_seats: 88,
    grade_stats: {
      distribution: { AA: 15, AB: 22, BB: 26, BC: 18, CC: 12, CD: 4, DD: 2, FR: 1 },
      avg_grade: 'B+', avg_gpa: 7.4, total_students: 312, pass_rate: 99,
    },
  },
  {
    id: 'mock-cs663',
    code: 'CS 663',
    name: 'Digital Image Processing',
    instructor: 'Prof. Suyash P. Awate',
    course_type: 'elective',
    credits: 6,
    department: 'Computer Science',
    slot: 'Slot 4',
    semester: 'Autumn 2026',
    total_seats: 80, filled_seats: 64,
    grade_stats: {
      distribution: { AA: 32, AB: 30, BB: 20, BC: 10, CC: 5, CD: 2, DD: 1, FR: 0 },
      avg_grade: 'A',  avg_gpa: 8.9, total_students: 132, pass_rate: 100,
    },
  },
  {
    id: 'mock-cs736',
    code: 'CS 736',
    name: 'Advanced Algorithms',
    instructor: 'Prof. Sundar Vishwanathan',
    course_type: 'honors',
    credits: 6,
    department: 'Computer Science',
    slot: 'Slot 9',
    semester: 'Autumn 2026',
    total_seats: 50, filled_seats: 28,
    grade_stats: {
      distribution: { AA: 8, AB: 18, BB: 24, BC: 22, CC: 16, CD: 6, DD: 4, FR: 2 },
      avg_grade: 'B',  avg_gpa: 6.9, total_students: 86, pass_rate: 98,
    },
  },
  {
    id: 'mock-ee671',
    code: 'EE 671',
    name: 'Neural Networks',
    instructor: 'Prof. Amit Sethi',
    course_type: 'elective',
    credits: 6,
    department: 'Electrical Engineering',
    slot: 'Slot 6',
    semester: 'Autumn 2026',
    total_seats: 100, filled_seats: 95,
    grade_stats: {
      distribution: { AA: 24, AB: 28, BB: 24, BC: 14, CC: 6, CD: 2, DD: 1, FR: 1 },
      avg_grade: 'A-', avg_gpa: 8.4, total_students: 192, pass_rate: 99,
    },
  },
  {
    id: 'mock-ee658',
    code: 'EE 658',
    name: 'VLSI Design',
    instructor: 'Prof. Rajesh Zele',
    course_type: 'core',
    credits: 8,
    department: 'Electrical Engineering',
    slot: 'Slot 2',
    semester: 'Autumn 2026',
    total_seats: 70, filled_seats: 52,
    grade_stats: {
      distribution: { AA: 12, AB: 20, BB: 28, BC: 20, CC: 12, CD: 5, DD: 2, FR: 1 },
      avg_grade: 'B+', avg_gpa: 7.2, total_students: 108, pass_rate: 99,
    },
  },
  {
    id: 'mock-ma214',
    code: 'MA 214',
    name: 'Numerical Analysis',
    instructor: 'Prof. Akhil Ranjan',
    course_type: 'minor',
    credits: 6,
    department: 'Mathematics',
    slot: 'Slot 5',
    semester: 'Autumn 2026',
    total_seats: 90, filled_seats: 71,
    grade_stats: {
      distribution: { AA: 18, AB: 24, BB: 28, BC: 16, CC: 8, CD: 3, DD: 2, FR: 1 },
      avg_grade: 'B+', avg_gpa: 7.6, total_students: 156, pass_rate: 99,
    },
  },
  {
    id: 'mock-ma412',
    code: 'MA 412',
    name: 'Complex Analysis',
    instructor: 'Prof. Sandip Singh',
    course_type: 'honors',
    credits: 6,
    department: 'Mathematics',
    slot: 'Slot 8',
    semester: 'Autumn 2026',
    total_seats: 60, filled_seats: 31,
    grade_stats: {
      distribution: { AA: 6, AB: 16, BB: 24, BC: 22, CC: 18, CD: 8, DD: 4, FR: 2 },
      avg_grade: 'B', avg_gpa: 6.7, total_students: 64, pass_rate: 98,
    },
  },
  {
    id: 'mock-me333',
    code: 'ME 333',
    name: 'Heat Transfer',
    instructor: 'Prof. Atul Sharma',
    course_type: 'core',
    credits: 6,
    department: 'Mechanical Engineering',
    slot: 'Slot 4',
    semester: 'Autumn 2026',
    total_seats: 110, filled_seats: 98,
    grade_stats: {
      distribution: { AA: 14, AB: 22, BB: 26, BC: 18, CC: 12, CD: 5, DD: 2, FR: 1 },
      avg_grade: 'B+', avg_gpa: 7.3, total_students: 224, pass_rate: 99,
    },
  },
  {
    id: 'mock-hs207',
    code: 'HS 207',
    name: 'Philosophy & Logic',
    instructor: 'Prof. Anand Vaidya',
    course_type: 'institute_elective',
    credits: 4,
    department: 'Humanities & Social Sciences',
    slot: 'Slot 11',
    semester: 'Autumn 2026',
    total_seats: 100, filled_seats: 47,
    grade_stats: {
      distribution: { AA: 22, AB: 30, BB: 26, BC: 14, CC: 6, CD: 1, DD: 1, FR: 0 },
      avg_grade: 'A-', avg_gpa: 8.2, total_students: 184, pass_rate: 100,
    },
  },
  {
    id: 'mock-cs335',
    code: 'CS 335',
    name: 'Compilers',
    instructor: 'Prof. Uday Khedker',
    course_type: 'elective',
    credits: 6,
    department: 'Computer Science',
    slot: 'Slot 10',
    semester: 'Autumn 2026',
    total_seats: 75, filled_seats: 67,
    grade_stats: {
      distribution: { AA: 16, AB: 22, BB: 26, BC: 18, CC: 12, CD: 4, DD: 1, FR: 1 },
      avg_grade: 'B+', avg_gpa: 7.4, total_students: 142, pass_rate: 99,
    },
  },
  {
    id: 'mock-hs401',
    code: 'HS 401',
    name: 'Behavioural Economics',
    instructor: 'Prof. Pushpa L. Trivedi',
    course_type: 'institute_elective',
    credits: 6,
    department: 'Humanities & Social Sciences',
    slot: 'Slot 12',
    semester: 'Autumn 2026',
    total_seats: 80, filled_seats: 39,
    grade_stats: {
      distribution: { AA: 20, AB: 28, BB: 28, BC: 14, CC: 6, CD: 2, DD: 1, FR: 1 },
      avg_grade: 'A-', avg_gpa: 8.0, total_students: 96, pass_rate: 99,
    },
  },
];

// Derive a stable, plausible grade stat for an unknown course based on its id.
// Lets the grade-stats hover popover work on real API courses too.
export function deriveGradeStats(course) {
  if (course.grade_stats) return course.grade_stats;
  // Hash course id to a bucket (easy/medium/hard) → pick a template
  let h = 0;
  const s = String(course.id || course.code || '');
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
  const bucket = Math.abs(h) % 3;

  const templates = [
    { distribution: { AA: 26, AB: 30, BB: 22, BC: 12, CC: 6, CD: 2, DD: 1, FR: 1 }, avg_grade: 'A-', avg_gpa: 8.4 }, // easier
    { distribution: { AA: 16, AB: 22, BB: 28, BC: 18, CC: 10, CD: 4, DD: 1, FR: 1 }, avg_grade: 'B+', avg_gpa: 7.4 }, // medium
    { distribution: { AA: 10, AB: 18, BB: 26, BC: 22, CC: 14, CD: 6, DD: 3, FR: 1 }, avg_grade: 'B',  avg_gpa: 7.0 }, // harder
  ];
  const t = templates[bucket];
  const total = 50 + (Math.abs(h) % 250);
  const pass = 100 - t.distribution.FR;
  return { ...t, total_students: total, pass_rate: pass };
}
