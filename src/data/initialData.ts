import { Course, StudentUser } from '../types';

export const INITIAL_STUDENTS: StudentUser[] = [
  {
    id: 'user_1',
    name: 'Md. Elman',
    universityId: 'C253124',
    role: 'student',
    department: 'Computer Science & Engineering',
    batch: '25th Batch (Spring)',
    createdAt: '2025-01-15T09:00:00Z',
    lastLogin: new Date().toISOString(),
    hashedPassword: 'h_demo_elman_password',
  },
  {
    id: 'user_2',
    name: 'Prof. K. Rahman',
    universityId: 'C250001',
    role: 'admin',
    department: 'Department of Computer Science',
    batch: 'Faculty Board',
    createdAt: '2024-08-10T11:00:00Z',
    lastLogin: new Date().toISOString(),
    hashedPassword: 'h_demo_admin_password',
  },
  {
    id: 'user_3',
    name: 'Sarah Ahmed',
    universityId: 'C253890',
    role: 'student',
    department: 'Computer Science & Engineering',
    batch: '25th Batch (Spring)',
    createdAt: '2025-01-20T14:30:00Z',
    lastLogin: new Date().toISOString(),
    hashedPassword: 'h_demo_sarah_password',
  }
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-chem-2301',
    code: 'CHEM-2301',
    name: 'Chemistry',
    department: 'Department of Natural Sciences',
    credits: 3.0,
    term: 'Semester 3',
    description: 'Fundamental chemical principles including atomic theory, chemical periodicity, molecular bonding, thermodynamics, and kinetics.',
    resources: []
  },
  {
    id: 'course-cse-2321',
    code: 'CSE-2321',
    name: 'Data Structures',
    department: 'Computer Science & Engineering',
    credits: 3.0,
    term: 'Semester 3',
    description: 'Fundamental data structures including arrays, linked lists, stacks, queues, trees, and graphs with searching and sorting algorithms.',
    resources: []
  },
  {
    id: 'course-cse-2322',
    code: 'CSE-2322',
    name: 'Data Structures Lab',
    department: 'Computer Science & Engineering',
    credits: 1.5,
    term: 'Semester 3',
    description: 'Practical lab implementations and asymptotic performance testing of linear and non-linear data structures in C/C++.',
    resources: []
  },
  {
    id: 'course-cse-2323',
    code: 'CSE-2323',
    name: 'Digital Logic Design',
    department: 'Computer Science & Engineering',
    credits: 3.0,
    term: 'Semester 3',
    description: 'Boolean algebra, logic minimization, combinational circuits, sequential elements, flip-flops, registers, and finite state machines.',
    resources: []
  },
  {
    id: 'course-cse-2324',
    code: 'CSE-2324',
    name: 'Digital Logic Design Lab',
    department: 'Computer Science & Engineering',
    credits: 1.5,
    term: 'Semester 3',
    description: 'Hardware experiments with digital ICs, circuit simulation tools, breadboard wiring, and logic verification.',
    resources: []
  },
  {
    id: 'course-cse-2340',
    code: 'CSE-2340',
    name: 'Software Development 1',
    department: 'Computer Science & Engineering',
    credits: 2.0,
    term: 'Semester 3',
    description: 'Core web architecture, modern frontend technologies, HTML, CSS, JavaScript, React components, state management, and full-stack integration.',
    resources: []
  },
  {
    id: 'course-math-2307',
    code: 'MATH-2307',
    name: 'Mathematics III (Matrices, Linear System of Equations and Vector Analysis)',
    department: 'Department of Mathematics & Physics',
    credits: 3.0,
    term: 'Semester 3',
    description: 'Matrices, determinants, systems of linear equations, vector spaces, eigenvalues/eigenvectors, and vector calculus.',
    resources: []
  },
  {
    id: 'course-stat-2311',
    code: 'STAT-2311',
    name: 'Probability and Statistics',
    department: 'Department of Mathematics & Physics',
    credits: 3.0,
    term: 'Semester 3',
    description: 'Probability theory, discrete/continuous random variables, probability distributions, expectations, and hypothesis testing.',
    resources: []
  }
];

export const INITIAL_FAVORITES: any[] = [];

export const INITIAL_HISTORY: any[] = [];
