import { StudentProfile } from '../types';

export const DEMO_STUDENTS: StudentProfile[] = [
  {
    id: 'student-elman-101',
    displayName: 'Md. Elman',
    universityId: '011211045', // Kept private, never shown publicly
    department: 'Computer Science & Engineering',
    semester: '6th Semester',
    avatarColor: 'bg-orange-600',
  },
  {
    id: 'student-sarah-102',
    displayName: 'Sarah Ahmed',
    universityId: '011211082',
    department: 'Computer Science & Engineering',
    semester: '6th Semester',
    avatarColor: 'bg-amber-600',
  },
  {
    id: 'student-tanvir-103',
    displayName: 'Tanvir Hasan',
    universityId: '011211099',
    department: 'Computer Science & Engineering',
    semester: '6th Semester',
    avatarColor: 'bg-rose-600',
  },
  {
    id: 'student-nafisa-104',
    displayName: 'Nafisa Rahman',
    universityId: '011211112',
    department: 'Electrical & Electronic Engineering',
    semester: '5th Semester',
    avatarColor: 'bg-emerald-600',
  },
];

const CURRENT_STUDENT_KEY = 'contributo_current_student';

export function getCurrentStudent(): StudentProfile {
  if (typeof window === 'undefined') return DEMO_STUDENTS[0];
  try {
    const raw = window.localStorage.getItem(CURRENT_STUDENT_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse stored student profile:', e);
  }
  return DEMO_STUDENTS[0];
}

export function setCurrentStudent(student: StudentProfile) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CURRENT_STUDENT_KEY, JSON.stringify(student));
  }
}
