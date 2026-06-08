export const DEPARTMENTS = [
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Mathematics',
  'Humanities & Social Sciences',
];

// Cross-department interest domains used for Plan onboarding & ranking.
// Each domain has keywords matched against a course's name/code/department
// to decide whether the course aligns with that interest.
export const INTEREST_DOMAINS = [
  { value: 'AI/ML',                keywords: ['machine learning', 'neural', 'deep learning', 'artificial intelligence', 'reinforcement', 'nlp', 'natural language', 'computer vision', 'image processing'] },
  { value: 'Data Science',         keywords: ['data', 'statistics', 'analytics', 'mining', 'probability', 'bayesian', 'regression'] },
  { value: 'Systems & Networks',   keywords: ['operating system', 'distributed', 'network', 'database', 'compiler', 'parallel'] },
  { value: 'Theory & Algorithms',  keywords: ['algorithm', 'complexity', 'cryptography', 'discrete', 'combinatorics', 'optimization', 'logic'] },
  { value: 'Robotics & Control',   keywords: ['robotics', 'control', 'autonomous', 'mechatronics', 'kinematics'] },
  { value: 'Hardware & VLSI',      keywords: ['vlsi', 'circuit', 'embedded', 'fpga', 'semiconductor', 'analog', 'digital electronics', 'microelectronics'] },
  { value: 'Signal & Comms',       keywords: ['signal', 'communication', 'wireless', 'antenna'] },
  { value: 'Design & HCI',         keywords: ['design', 'ux', 'ui', 'human-computer', 'hci', 'visual', 'graphics', 'interaction'] },
  { value: 'Pure Math',            keywords: ['analysis', 'algebra', 'topology', 'geometry', 'number theory', 'mathematical', 'differential equations'] },
  { value: 'Management',           keywords: ['management', 'organization', 'leadership', 'operations', 'strategy', 'project'] },
  { value: 'Finance & Economics',  keywords: ['finance', 'economics', 'financial', 'investment', 'banking', 'macro', 'micro'] },
  { value: 'Entrepreneurship',     keywords: ['entrepreneurship', 'startup', 'venture', 'innovation'] },
];

export function courseMatchesDomain(course, domainValue) {
  const dom = INTEREST_DOMAINS.find(d => d.value === domainValue);
  if (!dom) return false;
  const haystack = `${course.name || ''} ${course.code || ''} ${course.department || ''}`.toLowerCase();
  return dom.keywords.some(k => haystack.includes(k));
}

export const COURSE_TYPES = [
  { value: 'core', label: 'Core', color: 'var(--core-color)' },
  { value: 'elective', label: 'Elective', color: 'var(--elective-color)' },
  { value: 'minor', label: 'Minor', color: 'var(--minor-color)' },
  { value: 'honors', label: 'Honors', color: 'var(--honors-color)' },
  { value: 'institute_elective', label: 'Inst. Elective', color: 'var(--institute-color)' },
];

export const RESOURCE_TYPES = ['notes', 'pyq', 'slides', 'tutorial'];

// IITB-style slot schedule. Maps each slot label to the weekdays and time
// span it occupies. Used by the Slots filter dropdown (hover-expand) and
// the inline schedule reference triggered by the info icon.
export const SLOT_SCHEDULE = {
  'Slot 1':  { days: ['Mon', 'Wed', 'Fri'], time: '08:30 – 09:25' },
  'Slot 2':  { days: ['Tue', 'Thu', 'Fri'], time: '09:30 – 10:55' },
  'Slot 3':  { days: ['Mon', 'Wed', 'Fri'], time: '09:30 – 10:25' },
  'Slot 4':  { days: ['Mon', 'Wed', 'Fri'], time: '10:35 – 11:30' },
  'Slot 5':  { days: ['Mon', 'Wed', 'Thu'], time: '11:35 – 12:30' },
  'Slot 6':  { days: ['Tue', 'Fri'],        time: '14:00 – 15:25' },
  'Slot 7':  { days: ['Mon', 'Thu'],        time: '14:00 – 15:25' },
  'Slot 8':  { days: ['Tue', 'Fri'],        time: '15:30 – 16:55' },
  'Slot 9':  { days: ['Mon', 'Thu'],        time: '15:30 – 16:55' },
  'Slot 10': { days: ['Wed', 'Fri'],        time: '17:00 – 18:25' },
  'Slot 11': { days: ['Mon', 'Thu'],        time: '17:00 – 18:25' },
  'Slot 12': { days: ['Tue', 'Fri'],        time: '17:00 – 18:25' },
};

export const GRADE_ORDER = ['AA', 'AB', 'BB', 'BC', 'CC', 'CD', 'DD', 'FR'];

export const GRADE_COLORS = {
  AA: '#10B981', AB: '#34D399', BB: '#6366F1', BC: '#818CF8',
  CC: '#F59E0B', CD: '#FBBF24', DD: '#F97316', FR: '#EF4444',
};

export const DEPT_COLORS = {
  'Computer Science': '#818CF8',
  'Electrical Engineering': '#F59E0B',
  'Mechanical Engineering': '#10B981',
  'Mathematics': '#3B82F6',
  'Humanities & Social Sciences': '#EC4899',
};

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Brief, human-readable department descriptions used on the department-detail hero.
export const DEPARTMENT_INFO = {
  'Computer Science': {
    tagline: 'Algorithms, systems, AI, theory.',
    description: 'Foundations of computation paired with applied work in software systems, machine learning, security, and human–computer interaction. Strong emphasis on algorithmic thinking and rigorous analysis.',
  },
  'Electrical Engineering': {
    tagline: 'Power, signals, devices, control.',
    description: 'From microelectronics and VLSI to communication systems, power engineering, and control theory. Combines deep mathematical foundations with hands-on lab and design work.',
  },
  'Mechanical Engineering': {
    tagline: 'Design, manufacturing, mechanics.',
    description: 'Thermodynamics, fluid mechanics, machine design, manufacturing, robotics, and energy systems. A broad core followed by specialised tracks in design and production.',
  },
  'Mathematics': {
    tagline: 'Analysis, algebra, probability.',
    description: 'Pure and applied mathematics — real and complex analysis, algebra, topology, probability, optimisation, and numerical methods. Foundational courses for engineering and the sciences.',
  },
  'Humanities & Social Sciences': {
    tagline: 'Economics, philosophy, literature.',
    description: 'Critical thinking, communication, and disciplinary study across philosophy, economics, sociology, history, and literature — courses required of all undergraduates and open electives.',
  },
};

// URL-safe slug for routing: "Computer Science" → "computer-science"
export function slugifyDept(name) {
  return String(name).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
