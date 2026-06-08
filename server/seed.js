const db = require('./db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

console.log('🌱 Seeding ResoBin database...\n');

// Clear existing data
db.exec('DELETE FROM votes; DELETE FROM resources; DELETE FROM enrollments; DELETE FROM grade_distribution; DELETE FROM courses; DELETE FROM users;');

// ─── Users ───
const password = bcrypt.hashSync('password123', 12);
const users = [
  { id: uuidv4(), name: 'Arjun Mehta', email: 'arjun@iitb.ac.in', roll_number: '210010042', department: 'Computer Science', year: 2 },
  { id: uuidv4(), name: 'Priya Sharma', email: 'priya@iitb.ac.in', roll_number: '210020015', department: 'Electrical Engineering', year: 3 },
  { id: uuidv4(), name: 'Rohit Kumar', email: 'rohit@iitb.ac.in', roll_number: '210030078', department: 'Mechanical Engineering', year: 2 },
];

const insertUser = db.prepare('INSERT INTO users (id, name, email, password, roll_number, department, year) VALUES (?,?,?,?,?,?,?)');
users.forEach(u => insertUser.run(u.id, u.name, u.email, password, u.roll_number, u.department, u.year));
console.log(`✅ Seeded ${users.length} users (password: password123)`);

// ─── Courses ───
const courses = [
  {
    id: uuidv4(), code: 'CS 101', name: 'Computer Programming & Utilization', department: 'Computer Science',
    credits: 6, l_t_p: '2-1-0', slot: 'Slot 1', semester: 'Spring 2026', course_type: 'core',
    description: 'Introduction to computer programming using C/C++. Topics include data types, control flow, functions, arrays, pointers, structures, file handling, and basic algorithmic problem solving. Lab sessions for hands-on practice.',
    prerequisites: 'None', instructor: 'Prof. Supratik Chakraborty',
    lecture_hours: JSON.stringify([
      { day: 'Monday', start: '09:30', end: '10:25', room: 'LH 101' },
      { day: 'Wednesday', start: '09:30', end: '10:25', room: 'LH 101' },
      { day: 'Friday', start: '09:30', end: '10:25', room: 'LH 101' },
    ]),
    exam_date: '2026-04-15', exam_time: '09:00-12:00', midsem_date: '2026-02-18', midsem_time: '14:00-16:00',
    total_seats: 150, filled_seats: 132,
  },
  {
    id: uuidv4(), code: 'CS 213', name: 'Data Structures & Algorithms', department: 'Computer Science',
    credits: 6, l_t_p: '3-1-0', slot: 'Slot 5', semester: 'Spring 2026', course_type: 'core',
    description: 'Study of fundamental data structures (arrays, linked lists, trees, graphs, hash tables) and algorithmic paradigms (divide-and-conquer, dynamic programming, greedy algorithms). Complexity analysis and NP-completeness.',
    prerequisites: 'CS 101',
    instructor: [
      'D1, D3: Ashutosh Kumar Gupta',
      'D2, D4: Ajit Diwan',
      'P1, P2, P3, P4: Ashutosh Kumar Gupta',
      'P5, P6: Ajit Diwan',
      'P13, P14, P15, P16: Ashutosh Kumar Gupta',
      'T1, T2: Anjali Mehta',
    ].join('\n'),
    lecture_hours: JSON.stringify([
      { day: 'Monday', start: '14:00', end: '14:55', room: 'LH 301' },
      { day: 'Wednesday', start: '14:00', end: '14:55', room: 'LH 301' },
      { day: 'Friday', start: '14:00', end: '14:55', room: 'LH 301' },
    ]),
    exam_date: '2026-04-17', exam_time: '09:00-12:00', midsem_date: '2026-02-19', midsem_time: '09:00-11:00',
    total_seats: 120, filled_seats: 98,
  },
  {
    id: uuidv4(), code: 'CS 228', name: 'Logic for Computer Science', department: 'Computer Science',
    credits: 6, l_t_p: '3-1-0', slot: 'Slot 3', semester: 'Spring 2026', course_type: 'core',
    description: 'Propositional and predicate logic, proof systems, model theory, temporal logic, and applications to formal verification and automated reasoning.',
    prerequisites: 'CS 101', instructor: 'Prof. S. Akshay',
    lecture_hours: JSON.stringify([
      { day: 'Monday', start: '11:05', end: '12:00', room: 'LH 202' },
      { day: 'Wednesday', start: '11:05', end: '12:00', room: 'LH 202' },
      { day: 'Friday', start: '11:05', end: '12:00', room: 'LH 202' },
    ]),
    exam_date: '2026-04-18', exam_time: '14:00-17:00', midsem_date: '2026-02-20', midsem_time: '14:00-16:00',
    total_seats: 100, filled_seats: 87,
  },
  {
    id: uuidv4(), code: 'CS 337', name: 'Artificial Intelligence & Machine Learning', department: 'Computer Science',
    credits: 6, l_t_p: '3-0-0', slot: 'Slot 9', semester: 'Spring 2026', course_type: 'elective',
    description: 'Introduction to AI and ML covering search algorithms, knowledge representation, neural networks, supervised and unsupervised learning, reinforcement learning, and modern deep learning architectures.',
    prerequisites: 'CS 213, MA 106', instructor: 'Prof. Ganesh Ramakrishnan',
    lecture_hours: JSON.stringify([
      { day: 'Tuesday', start: '09:30', end: '10:55', room: 'LH 302' },
      { day: 'Thursday', start: '09:30', end: '10:55', room: 'LH 302' },
    ]),
    exam_date: '2026-04-20', exam_time: '09:00-12:00', midsem_date: '2026-02-17', midsem_time: '09:00-11:00',
    total_seats: 60, filled_seats: 45,
  },
  {
    id: uuidv4(), code: 'CS 663', name: 'Digital Image Processing', department: 'Computer Science',
    credits: 6, l_t_p: '3-0-0', slot: 'Slot 12', semester: 'Spring 2026', course_type: 'elective',
    description: 'Image formation, sampling, quantization, enhancement, filtering, Fourier domain processing, restoration, segmentation, and feature extraction.',
    prerequisites: 'MA 106', instructor: 'Prof. Ajit Rajwade',
    lecture_hours: JSON.stringify([
      { day: 'Tuesday', start: '14:00', end: '15:25', room: 'LH 105' },
      { day: 'Thursday', start: '14:00', end: '15:25', room: 'LH 105' },
    ]),
    exam_date: '2026-04-22', exam_time: '14:00-17:00', midsem_date: '2026-02-22', midsem_time: '14:00-16:00',
    total_seats: 50, filled_seats: 38,
  },
  {
    id: uuidv4(), code: 'CS 747', name: 'Foundations of Intelligent & Learning Agents', department: 'Computer Science',
    credits: 6, l_t_p: '3-0-0', slot: 'Slot 15', semester: 'Spring 2026', course_type: 'honors',
    description: 'Advanced course on multi-armed bandits, Markov decision processes, reinforcement learning theory, exploration-exploitation tradeoffs, and planning under uncertainty.',
    prerequisites: 'CS 337', instructor: 'Prof. Shivaram Kalyanakrishnan',
    lecture_hours: JSON.stringify([
      { day: 'Monday', start: '16:00', end: '17:25', room: 'SIC 301' },
      { day: 'Wednesday', start: '16:00', end: '17:25', room: 'SIC 301' },
    ]),
    exam_date: '2026-04-13', exam_time: '09:00-12:00', midsem_date: '2026-02-16', midsem_time: '09:00-11:00',
    total_seats: 40, filled_seats: 28,
  },
  {
    id: uuidv4(), code: 'EE 114', name: 'Power Engineering', department: 'Electrical Engineering',
    credits: 6, l_t_p: '3-1-0', slot: 'Slot 2', semester: 'Spring 2026', course_type: 'core',
    description: 'Fundamentals of power systems including generation, transmission, distribution, transformers, synchronous machines, and power electronics.',
    prerequisites: 'None', instructor: 'Prof. Mukul Chandorkar',
    lecture_hours: JSON.stringify([
      { day: 'Monday', start: '10:35', end: '11:30', room: 'LH 201' },
      { day: 'Wednesday', start: '10:35', end: '11:30', room: 'LH 201' },
      { day: 'Friday', start: '10:35', end: '11:30', room: 'LH 201' },
    ]),
    exam_date: '2026-04-16', exam_time: '14:00-17:00', midsem_date: '2026-02-18', midsem_time: '09:00-11:00',
    total_seats: 130, filled_seats: 115,
  },
  {
    id: uuidv4(), code: 'EE 224', name: 'Digital Systems', department: 'Electrical Engineering',
    credits: 6, l_t_p: '3-0-2', slot: 'Slot 6', semester: 'Spring 2026', course_type: 'core',
    description: 'Boolean algebra, combinational and sequential circuits, finite state machines, VHDL/Verilog, FPGA design, and microprocessor interfacing.',
    prerequisites: 'EE 114', instructor: 'Prof. Virendra Singh',
    lecture_hours: JSON.stringify([
      { day: 'Monday', start: '15:00', end: '15:55', room: 'LH 102' },
      { day: 'Wednesday', start: '15:00', end: '15:55', room: 'LH 102' },
      { day: 'Friday', start: '15:00', end: '15:55', room: 'LH 102' },
    ]),
    exam_date: '2026-04-19', exam_time: '09:00-12:00', midsem_date: '2026-02-21', midsem_time: '09:00-11:00',
    total_seats: 120, filled_seats: 105,
  },
  {
    id: uuidv4(), code: 'EE 325', name: 'Probability & Random Processes', department: 'Electrical Engineering',
    credits: 6, l_t_p: '3-1-0', slot: 'Slot 10', semester: 'Spring 2026', course_type: 'elective',
    description: 'Probability theory, random variables, stochastic processes, Markov chains, Gaussian processes, spectral analysis, and applications in communications.',
    prerequisites: 'MA 106', instructor: 'Prof. Animesh Kumar',
    lecture_hours: JSON.stringify([
      { day: 'Tuesday', start: '11:05', end: '12:30', room: 'LH 203' },
      { day: 'Thursday', start: '11:05', end: '12:30', room: 'LH 203' },
    ]),
    exam_date: '2026-04-14', exam_time: '14:00-17:00', midsem_date: '2026-02-19', midsem_time: '14:00-16:00',
    total_seats: 80, filled_seats: 62,
  },
  {
    id: uuidv4(), code: 'EE 679', name: 'Speech Processing', department: 'Electrical Engineering',
    credits: 6, l_t_p: '3-0-0', slot: 'Slot 13', semester: 'Spring 2026', course_type: 'minor',
    description: 'Speech production and perception, spectral analysis, linear prediction, hidden Markov models, speech recognition, text-to-speech systems.',
    prerequisites: 'EE 325', instructor: 'Prof. Preethi Jyothi',
    lecture_hours: JSON.stringify([
      { day: 'Tuesday', start: '15:30', end: '16:55', room: 'SIC 201' },
      { day: 'Thursday', start: '15:30', end: '16:55', room: 'SIC 201' },
    ]),
    exam_date: '2026-04-21', exam_time: '09:00-12:00', midsem_date: '2026-02-17', midsem_time: '14:00-16:00',
    total_seats: 45, filled_seats: 30,
  },
  {
    id: uuidv4(), code: 'ME 119', name: 'Engineering Graphics & Drawing', department: 'Mechanical Engineering',
    credits: 6, l_t_p: '0-0-6', slot: 'Slot 4', semester: 'Spring 2026', course_type: 'core',
    description: 'Principles of engineering drawing, orthographic projections, isometric views, sectional views, CAD tools, and drafting standards.',
    prerequisites: 'None', instructor: 'Prof. Sawan Suman',
    lecture_hours: JSON.stringify([
      { day: 'Monday', start: '12:00', end: '12:55', room: 'WS 101' },
      { day: 'Wednesday', start: '12:00', end: '12:55', room: 'WS 101' },
      { day: 'Friday', start: '12:00', end: '12:55', room: 'WS 101' },
    ]),
    exam_date: '2026-04-15', exam_time: '14:00-17:00', midsem_date: '2026-02-20', midsem_time: '09:00-11:00',
    total_seats: 140, filled_seats: 128,
  },
  {
    id: uuidv4(), code: 'ME 209', name: 'Thermodynamics', department: 'Mechanical Engineering',
    credits: 6, l_t_p: '3-1-0', slot: 'Slot 7', semester: 'Spring 2026', course_type: 'core',
    description: 'Laws of thermodynamics, entropy, exergy, ideal and real gases, vapor power cycles, refrigeration cycles, thermodynamic relations, and gas mixtures.',
    prerequisites: 'None', instructor: 'Prof. Atul Sharma',
    lecture_hours: JSON.stringify([
      { day: 'Tuesday', start: '08:00', end: '08:55', room: 'LH 104' },
      { day: 'Thursday', start: '08:00', end: '08:55', room: 'LH 104' },
      { day: 'Friday', start: '08:00', end: '08:55', room: 'LH 104' },
    ]),
    exam_date: '2026-04-18', exam_time: '09:00-12:00', midsem_date: '2026-02-22', midsem_time: '09:00-11:00',
    total_seats: 130, filled_seats: 118,
  },
  {
    id: uuidv4(), code: 'ME 346', name: 'Heat Transfer', department: 'Mechanical Engineering',
    credits: 6, l_t_p: '3-1-0', slot: 'Slot 11', semester: 'Spring 2026', course_type: 'elective',
    description: 'Conduction, convection, radiation heat transfer, heat exchangers, boiling, condensation, and mass transfer fundamentals.',
    prerequisites: 'ME 209', instructor: 'Prof. Arunkumar Sridharan',
    lecture_hours: JSON.stringify([
      { day: 'Tuesday', start: '12:30', end: '13:55', room: 'LH 303' },
      { day: 'Thursday', start: '12:30', end: '13:55', room: 'LH 303' },
    ]),
    exam_date: '2026-04-20', exam_time: '14:00-17:00', midsem_date: '2026-02-16', midsem_time: '14:00-16:00',
    total_seats: 70, filled_seats: 52,
  },
  {
    id: uuidv4(), code: 'ME 651', name: 'Fluid Dynamics', department: 'Mechanical Engineering',
    credits: 6, l_t_p: '3-0-0', slot: 'Slot 14', semester: 'Spring 2026', course_type: 'minor',
    description: 'Navier-Stokes equations, potential flow, boundary layers, turbulence, compressible flows, and computational fluid dynamics.',
    prerequisites: 'ME 209', instructor: 'Prof. Salil Kulkarni',
    lecture_hours: JSON.stringify([
      { day: 'Monday', start: '17:00', end: '17:55', room: 'LH 204' },
      { day: 'Wednesday', start: '17:00', end: '17:55', room: 'LH 204' },
      { day: 'Friday', start: '17:00', end: '17:55', room: 'LH 204' },
    ]),
    exam_date: '2026-04-22', exam_time: '09:00-12:00', midsem_date: '2026-02-21', midsem_time: '14:00-16:00',
    total_seats: 50, filled_seats: 35,
  },
  {
    id: uuidv4(), code: 'MA 106', name: 'Linear Algebra', department: 'Mathematics',
    credits: 4, l_t_p: '3-1-0', slot: 'Slot 8', semester: 'Spring 2026', course_type: 'core',
    description: 'Vector spaces, linear transformations, eigenvalues, inner product spaces, orthogonality, SVD, and applications to least squares and differential equations.',
    prerequisites: 'None', instructor: 'Prof. Rekha Vithal',
    lecture_hours: JSON.stringify([
      { day: 'Tuesday', start: '08:00', end: '08:55', room: 'LH 301' },
      { day: 'Thursday', start: '08:00', end: '08:55', room: 'LH 301' },
    ]),
    exam_date: '2026-04-16', exam_time: '09:00-12:00', midsem_date: '2026-02-18', midsem_time: '14:00-16:00',
    total_seats: 200, filled_seats: 185,
  },
  {
    id: uuidv4(), code: 'MA 214', name: 'Numerical Analysis', department: 'Mathematics',
    credits: 4, l_t_p: '3-1-0', slot: 'Slot 16', semester: 'Spring 2026', course_type: 'core',
    description: 'Numerical methods for solving equations, interpolation, numerical integration, ODE solving, error analysis, and matrix computations.',
    prerequisites: 'MA 106', instructor: 'Prof. Harish Kumar',
    lecture_hours: JSON.stringify([
      { day: 'Monday', start: '08:00', end: '08:55', room: 'LH 103' },
      { day: 'Wednesday', start: '08:00', end: '08:55', room: 'LH 103' },
    ]),
    exam_date: '2026-04-14', exam_time: '09:00-12:00', midsem_date: '2026-02-16', midsem_time: '09:00-11:00',
    total_seats: 180, filled_seats: 165,
  },
  {
    id: uuidv4(), code: 'HS 101', name: 'Economics', department: 'Humanities & Social Sciences',
    credits: 6, l_t_p: '3-0-0', slot: 'Slot 7', semester: 'Spring 2026', course_type: 'institute_elective',
    description: 'Microeconomics, macroeconomics, market structures, fiscal and monetary policy, international trade, and Indian economic development.',
    prerequisites: 'None', instructor: 'Prof. Arindam Banerjee',
    lecture_hours: JSON.stringify([
      { day: 'Tuesday', start: '08:00', end: '09:25', room: 'LC 101' },
      { day: 'Thursday', start: '08:00', end: '09:25', room: 'LC 101' },
    ]),
    exam_date: '2026-04-17', exam_time: '14:00-17:00', midsem_date: '2026-02-19', midsem_time: '14:00-16:00',
    total_seats: 100, filled_seats: 78,
  },
  {
    id: uuidv4(), code: 'HS 200', name: 'Environmental Studies', department: 'Humanities & Social Sciences',
    credits: 3, l_t_p: '2-0-0', slot: 'Slot 17', semester: 'Spring 2026', course_type: 'institute_elective',
    description: 'Environmental science fundamentals, ecology, biodiversity, pollution, climate change, sustainability, and environmental policy.',
    prerequisites: 'None', instructor: 'Prof. Raghu Murtugudde',
    lecture_hours: JSON.stringify([
      { day: 'Wednesday', start: '08:00', end: '09:25', room: 'LC 102' },
    ]),
    exam_date: '2026-04-21', exam_time: '14:00-16:00', midsem_date: '2026-02-22', midsem_time: '14:00-15:30',
    total_seats: 200, filled_seats: 142,
  },
];

const insertCourse = db.prepare(`
  INSERT INTO courses (id, code, name, department, credits, l_t_p, slot, semester, course_type, description, prerequisites, instructor, lecture_hours, exam_date, exam_time, midsem_date, midsem_time, total_seats, filled_seats)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

courses.forEach(c => insertCourse.run(
  c.id, c.code, c.name, c.department, c.credits, c.l_t_p, c.slot, c.semester, c.course_type,
  c.description, c.prerequisites, c.instructor, c.lecture_hours, c.exam_date, c.exam_time,
  c.midsem_date, c.midsem_time, c.total_seats, c.filled_seats
));
console.log(`✅ Seeded ${courses.length} courses`);

// ─── Grade Distributions ───
const GRADES = ['AA', 'AB', 'BB', 'BC', 'CC', 'CD', 'DD', 'FR'];
const insertGrade = db.prepare('INSERT INTO grade_distribution (course_id, semester, grade, count) VALUES (?, ?, ?, ?)');

function generateGrades(courseId, semester, totalStudents) {
  const weights = [0.07, 0.18, 0.22, 0.18, 0.14, 0.08, 0.06, 0.07];
  let remaining = totalStudents;
  GRADES.forEach((grade, i) => {
    let count;
    if (i === GRADES.length - 1) {
      count = remaining;
    } else {
      count = Math.round(totalStudents * weights[i] * (0.8 + Math.random() * 0.4));
      count = Math.min(count, remaining);
    }
    remaining -= count;
    if (count > 0) insertGrade.run(courseId, semester, grade, count);
  });
}

courses.forEach(c => {
  const total = 80 + Math.floor(Math.random() * 70);
  generateGrades(c.id, 'Autumn 2025', total);
  generateGrades(c.id, 'Spring 2025', 70 + Math.floor(Math.random() * 60));
});
console.log(`✅ Seeded grade distributions for ${courses.length} courses × 2 semesters`);

// ─── Sample Resources ───
const resourceData = [
  { courseIdx: 1, title: 'CS 213 Endsem 2024 Solutions', type: 'pyq', year: 2024, semester: 'Autumn', exam_type: 'endsem', desc: 'Complete solutions for Autumn 2024 end-semester exam' },
  { courseIdx: 0, title: 'CS 101 Programming Notes - Complete', type: 'notes', year: 2025, semester: 'Spring', exam_type: null, desc: 'Comprehensive notes covering all topics' },
  { courseIdx: 14, title: 'MA 106 Linear Algebra Cheat Sheet', type: 'notes', year: 2025, semester: 'Spring', exam_type: null, desc: 'Quick reference for all key theorems and formulas' },
  { courseIdx: 7, title: 'EE 224 Digital Systems Midsem 2024', type: 'pyq', year: 2024, semester: 'Autumn', exam_type: 'midsem', desc: 'Midsem question paper with solutions' },
  { courseIdx: 3, title: 'CS 337 ML Lecture Slides Week 1-6', type: 'slides', year: 2025, semester: 'Spring', exam_type: null, desc: 'Official lecture slides covering supervised learning' },
  { courseIdx: 11, title: 'ME 209 Thermodynamics Tutorial Solutions', type: 'tutorial', year: 2025, semester: 'Spring', exam_type: null, desc: 'Solutions to tutorial sheets 1-5' },
  { courseIdx: 1, title: 'CS 213 Midsem 2024', type: 'pyq', year: 2024, semester: 'Autumn', exam_type: 'midsem', desc: 'Midsem paper with hints' },
  { courseIdx: 3, title: 'CS 337 Assignment 1 Solutions', type: 'notes', year: 2025, semester: 'Spring', exam_type: null, desc: 'Detailed solutions and explanations for Assignment 1' },
];

const insertResource = db.prepare('INSERT INTO resources (id, course_id, user_id, title, type, year, semester, exam_type, file_url, description, votes) VALUES (?,?,?,?,?,?,?,?,?,?,?)');

resourceData.forEach((r, i) => {
  const uid = users[i % users.length].id;
  const votes = Math.floor(Math.random() * 30);
  insertResource.run(uuidv4(), courses[r.courseIdx].id, uid, r.title, r.type, r.year, r.semester, r.exam_type, `/uploads/sample-${i}.pdf`, r.desc, votes);
});
console.log(`✅ Seeded ${resourceData.length} sample resources`);

// ─── Default Enrollments (Arjun) ───
const arjun = users[0];
const enrollCourseIds = [courses[1].id, courses[3].id, courses[14].id, courses[16].id]; // CS213, CS337, MA106, HS101
const insertEnrollment = db.prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)');
enrollCourseIds.forEach(cid => insertEnrollment.run(arjun.id, cid));
console.log(`✅ Enrolled Arjun in ${enrollCourseIds.length} courses`);

console.log('\n🎉 Seeding complete!\n');
