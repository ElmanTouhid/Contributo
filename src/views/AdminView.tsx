import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  BookOpen, 
  Video, 
  Users, 
  Check, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useResources } from '../context/ResourceContext';
import { useAuth } from '../context/AuthContext';
import { validateYoutubeResourceUrl } from '../utils/security';

export const AdminView: React.FC = () => {
  const { 
    courses, 
    addCourse, 
    deleteCourse, 
    addResource, 
    deleteResource 
  } = useResources();
  const { studentsList, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'courses' | 'resources' | 'students'>('courses');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Course Form State
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDept, setNewCourseDept] = useState('Computer Science & Engineering');
  const [newCourseCredits, setNewCourseCredits] = useState('3.0');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  // New Resource Form State
  const [resCourseId, setResCourseId] = useState<string>(courses[0]?.id || '');
  const selectedCourseForRes = courses.find(c => c.id === resCourseId) || courses[0];
  const [newResTopic, setNewResTopic] = useState('');
  const [newResTitle, setNewResTitle] = useState('');
  const [newResCreator, setNewResCreator] = useState('');
  const [newResUrl, setNewResUrl] = useState('');
  const [newResDesc, setNewResDesc] = useState('');

  const flashSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode || !newCourseName) return;

    addCourse({
      code: newCourseCode.trim().toUpperCase(),
      name: newCourseName.trim(),
      department: newCourseDept,
      credits: parseFloat(newCourseCredits) || 3.0,
      description: newCourseDesc.trim() || 'Comprehensive university curriculum course.',
      term: 'Semester 3'
    });

    setNewCourseCode('');
    setNewCourseName('');
    setNewCourseDesc('');
    flashSuccess(`Course ${newCourseCode.trim().toUpperCase()} added successfully.`);
  };

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCourseId = resCourseId || courses[0]?.id;
    if (!targetCourseId || !newResTitle || !newResUrl || !newResTopic) return;

    const validation = validateYoutubeResourceUrl(newResUrl);
    if (!validation.valid) {
      alert(validation.error || 'Please enter a valid YouTube video or playlist link.');
      return;
    }

    addResource({
      courseId: targetCourseId,
      resourceType: validation.detectedType,
      title: newResTitle.trim(),
      creator: newResCreator.trim() || 'Academic Faculty',
      topic: newResTopic.trim(),
      description: newResDesc.trim() || 'Shared video lecture.',
      youtubeUrl: newResUrl.trim(),
      sharedBy: currentUser?.name || 'Faculty Admin'
    });

    setNewResTitle('');
    setNewResTopic('');
    setNewResCreator('');
    setNewResUrl('');
    setNewResDesc('');
    flashSuccess(`Resource "${newResTitle}" added successfully.`);
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      
      {/* Admin Header */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Academic Curriculum Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Admin & Content Management
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage courses and curated YouTube video learning resources.
            </p>
          </div>

          <div className="text-xs bg-orange-50 text-orange-800 border border-orange-200 p-3 rounded-2xl max-w-xs">
            <span className="font-bold">Faculty Admin Mode: </span>
            Changes made here update the student catalog in real-time.
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="mt-6 flex items-center gap-2 border-b border-[#F2ECE1] pb-1 overflow-x-auto text-sm">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'courses'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#FAF8F5]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Courses ({courses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'resources'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#FAF8F5]'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>YouTube Resources</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'students'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#FAF8F5]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students ({studentsList.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: COURSES MANAGEMENT */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Add Course Form (col-span-5) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#EAE4D9] space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-600" />
              <span>Create New Course</span>
            </h2>

            <form onSubmit={handleCreateCourse} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  value={newCourseCode}
                  onChange={e => setNewCourseCode(e.target.value)}
                  placeholder="e.g. CSE-2321"
                  required
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl font-mono text-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={e => setNewCourseName(e.target.value)}
                  placeholder="e.g. Data Structures"
                  required
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newCourseCredits}
                    onChange={e => setNewCourseCredits(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={newCourseDept}
                    onChange={e => setNewCourseDept(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-xs"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Department of Natural Sciences">Department of Natural Sciences</option>
                    <option value="Department of Mathematics & Physics">Department of Mathematics & Physics</option>
                    <option value="Department of General Education">Department of General Education</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCourseDesc}
                  onChange={e => setNewCourseDesc(e.target.value)}
                  placeholder="Brief syllabus outline..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                Create Course
              </button>
            </form>
          </div>

          {/* Existing Courses List (col-span-7) */}
          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Active Courses ({courses.length})
            </h2>

            <div className="space-y-2.5">
              {courses.map(c => {
                const totalVideos = c.resources ? c.resources.length : 0;
                return (
                  <div
                    key={c.id}
                    className="bg-white p-4 rounded-2xl border border-[#EAE4D9] flex items-start justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          {c.code}
                        </span>
                        <span className="text-xs text-slate-500">{c.department}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{c.credits} Credits</span>
                      </div>
                      <h3 className="font-bold text-slate-900">{c.name}</h3>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{c.description}</p>
                      <div className="text-[11px] text-slate-400 mt-1">
                        <span>{totalVideos} Curated YouTube Videos</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete course ${c.code}?`)) {
                          deleteCourse(c.id);
                          flashSuccess(`Course ${c.code} deleted.`);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: RESOURCES MANAGEMENT */}
      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Add Resource Form (col-span-5) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#EAE4D9] space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-600" />
              <span>Add Curated YouTube Resource</span>
            </h2>

            <form onSubmit={handleCreateResource} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Target Course
                </label>
                <select
                  value={resCourseId || courses[0]?.id}
                  onChange={e => setResCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-xs"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Topic
                </label>
                <input
                  type="text"
                  value={newResTopic}
                  onChange={e => setNewResTopic(e.target.value)}
                  placeholder="e.g. Data Structures Implementation, Atomic Structure"
                  required
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Video Title
                </label>
                <input
                  type="text"
                  value={newResTitle}
                  onChange={e => setNewResTitle(e.target.value)}
                  placeholder="e.g. History of Atomic Theory"
                  required
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  4. Creator / Channel
                </label>
                <input
                  type="text"
                  value={newResCreator}
                  onChange={e => setNewResCreator(e.target.value)}
                  placeholder="e.g. Professor Dave Explains, freeCodeCamp.org"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  5. Exact YouTube URL
                </label>
                <input
                  type="url"
                  value={newResUrl}
                  onChange={e => setNewResUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  6. Description
                </label>
                <textarea
                  value={newResDesc}
                  onChange={e => setNewResDesc(e.target.value)}
                  placeholder="Comprehensive description of topics covered in the lecture..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                Add YouTube Resource
              </button>
            </form>
          </div>

          {/* Resource list for selected course (col-span-7) */}
          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Shared Resources in {selectedCourseForRes?.code} — {selectedCourseForRes?.name}
            </h2>

            <div className="space-y-2">
              {selectedCourseForRes?.resources && selectedCourseForRes.resources.length > 0 ? (
                selectedCourseForRes.resources.map(res => (
                  <div
                    key={res.id}
                    className="bg-white p-4 rounded-2xl border border-[#EAE4D9] flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span className="text-orange-700 font-semibold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          Topic: {res.topic}
                        </span>
                        <span>·</span>
                        <span className="font-medium text-slate-700">{res.resourceType === 'playlist' ? '📺 Playlist' : '🎥 Video'}</span>
                        <span>·</span>
                        <span>Shared by: <strong className="text-slate-800">{res.sharedBy}</strong></span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 leading-snug">{res.title}</div>
                      <p className="text-xs text-slate-600 line-clamp-2">{res.description}</p>
                      <div className="text-[11px] font-mono text-slate-400 truncate max-w-sm">
                        {res.youtubeUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={res.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-orange-600 rounded-xl hover:bg-orange-50 transition-colors"
                        title="Watch Video in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => {
                          if (confirm(`Remove resource "${res.title}"?`)) {
                            deleteResource(res.id);
                            flashSuccess('Resource deleted.');
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-[#EAE4D9] text-center space-y-2">
                  <Video className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-700">No resources added yet</h3>
                  <p className="text-xs text-slate-500">
                    Use the form on the left to add verified YouTube learning resources to {selectedCourseForRes?.code}.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: STUDENTS ROSTER */}
      {activeTab === 'students' && (
        <div className="bg-white p-6 rounded-3xl border border-[#EAE4D9] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F2ECE1]">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Enrolled Students Roster</h2>
              <p className="text-xs text-slate-500">
                Official records of registered university students in Contributo.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-orange-50 text-orange-700 px-3 py-1 rounded-lg border border-orange-200">
              {studentsList.length} Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-slate-500 font-semibold uppercase tracking-wider border-b border-[#EDE8DF]">
                <tr>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">University ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE1]">
                {studentsList.map(st => (
                  <tr key={st.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{st.name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">{st.universityId}</td>
                    <td className="py-3 px-4 text-slate-600">{st.department}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-medium capitalize ${
                        st.role === 'admin' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {st.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(st.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
