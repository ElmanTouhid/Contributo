/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ResourceProvider, useResources } from './context/ResourceContext';
import { Navbar } from './components/Navbar';
import { ResourceModal } from './components/ResourceModal';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { CoursesView } from './views/CoursesView';
import { CourseDetailView } from './views/CourseDetailView';
import { SearchView } from './views/SearchView';
import { FavoritesView } from './views/FavoritesView';
import { HistoryView } from './views/HistoryView';
import { ProfileView } from './views/ProfileView';
import { SettingsView } from './views/SettingsView';
import { AdminView } from './views/AdminView';
import { ActiveNavTab } from './types';
import { GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const { selectedResource, closeResourceModal } = useResources();

  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Keyboard shortcut: '/' opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setActiveTab('search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setActiveTab('course-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCourses = () => {
    setSelectedCourseId(null);
    setActiveTab('courses');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If user is not logged in, render the login & registration view
  if (!isAuthenticated || !currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col font-sans selection:bg-orange-500/20 selection:text-orange-900">
      
      {/* Top Bar strictly following 3-Zone contract */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSearch={() => {
          setActiveTab('search');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            setActiveTab={setActiveTab}
            onOpenSearch={() => setActiveTab('search')}
            onSelectCourse={handleSelectCourse}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesView onSelectCourse={handleSelectCourse} />
        )}

        {activeTab === 'course-detail' && selectedCourseId && (
          <CourseDetailView
            courseId={selectedCourseId}
            onBack={handleBackToCourses}
          />
        )}

        {activeTab === 'search' && (
          <SearchView onSelectCourse={handleSelectCourse} />
        )}

        {activeTab === 'favorites' && (
          <FavoritesView
            onSelectCourse={handleSelectCourse}
            onBrowseCourses={() => setActiveTab('courses')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView onBrowseCourses={() => setActiveTab('courses')} />
        )}

        {activeTab === 'profile' && <ProfileView />}

        {activeTab === 'settings' && <SettingsView />}

        {activeTab === 'admin' && <AdminView />}
      </main>

      {/* YouTube Resource Theater Modal */}
      {selectedResource && (
        <ResourceModal
          resource={selectedResource}
          onClose={closeResourceModal}
        />
      )}

      {/* Institutional Footer */}
      <footer className="border-t border-[#EAE4D9] bg-[#FAF8F5] py-8 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center text-white">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Contributo</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Private University Academic Resource Hub</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <span>Logged in as: <strong className="text-slate-900">{currentUser.name}</strong></span>
            <span>ID: <strong className="font-mono text-orange-600">{currentUser.universityId}</strong></span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Isolated Session
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ResourceProvider>
        <MainAppContent />
      </ResourceProvider>
    </AuthProvider>
  );
}
