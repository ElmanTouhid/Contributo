import React, { useState } from 'react';
import { Check, ShieldCheck, UserCheck, Users, X } from 'lucide-react';
import { DEMO_STUDENTS, setCurrentStudent } from '../lib/auth';
import { StudentProfile } from '../types';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent: StudentProfile;
  onStudentChanged: (student: StudentProfile) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  currentStudent,
  onStudentChanged,
}) => {
  const [customName, setCustomName] = useState('');
  const [customDept, setCustomDept] = useState('Computer Science & Engineering');

  if (!isOpen) return null;

  const handleSelectStudent = (student: StudentProfile) => {
    setCurrentStudent(student);
    onStudentChanged(student);
    onClose();
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newStudent: StudentProfile = {
      id: `student-custom-${Date.now()}`,
      displayName: customName.trim(),
      universityId: `011${Math.floor(100000 + Math.random() * 900000)}`,
      department: customDept,
      semester: '6th Semester',
      avatarColor: 'bg-orange-600',
    };

    setCurrentStudent(newStudent);
    onStudentChanged(newStudent);
    setCustomName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-[#FFFDF9] border border-amber-200 rounded-2xl shadow-2xl p-6 text-stone-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Student Profile & Identity</h2>
            <p className="text-xs text-stone-600">Simulate different students contributing resources</p>
          </div>
        </div>

        {/* Current Active Student Card */}
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 mb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${currentStudent.avatarColor || 'bg-orange-600'}`}>
              {currentStudent.displayName
                .split(' ')
                .map((n) => n[0])
                .slice(-2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-stone-900 text-sm">{currentStudent.displayName}</span>
                <span className="text-[10px] bg-orange-200 text-orange-900 font-semibold px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-xs text-stone-600">{currentStudent.department} · {currentStudent.semester}</p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-orange-200/80 flex items-center justify-between text-xs text-stone-600">
            <span className="flex items-center gap-1 text-[11px] text-stone-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              University ID (Private): {currentStudent.universityId}
            </span>
            <span className="text-[11px] font-medium text-amber-800">
              Never publicly shown
            </span>
          </div>
        </div>

        {/* Switch Student List */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
            Switch University Student
          </label>
          <div className="space-y-2">
            {DEMO_STUDENTS.map((student) => {
              const isSelected = student.id === currentStudent.id;
              return (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/70 font-semibold text-stone-900'
                      : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center ${student.avatarColor}`}>
                      {student.displayName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(-2)
                        .join('')}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-stone-900">{student.displayName}</p>
                      <p className="text-[10px] text-stone-500">{student.department}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-orange-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Or enter custom student name */}
        <form onSubmit={handleCreateCustom} className="pt-3 border-t border-stone-200">
          <label className="block text-xs font-medium text-stone-700 mb-1.5">
            Or Sign in with Custom Student Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Arafat Hossain"
              className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Set Active
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
