import React, { useState } from 'react';
import { 
  GraduationCap, 
  Search, 
  BookOpen, 
  Bookmark, 
  History, 
  User, 
  LogOut, 
  Settings, 
  ShieldCheck, 
  Menu, 
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActiveNavTab } from '../types';

interface NavbarProps {
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenSearch }) => {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ActiveNavTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BookOpen },
    { id: 'courses', label: 'Courses', icon: GraduationCap },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'favorites', label: 'Favorites', icon: Bookmark },
    { id: 'history', label: 'History', icon: History },
  ];

  if (!isAuthenticated || !currentUser) {
    return (
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#EAE4D9] px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
              Contributo
            </span>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Private University Academic Hub
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#EAE4D9] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg p-1"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/25 group-hover:bg-orange-600 transition-colors">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors font-sans">
                Contributo
              </span>
            </button>
          </div>

          {/* Zone 2: 4-6 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'search') {
                      onOpenSearch();
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className={`px-3.5 py-2 text-base font-medium rounded-lg transition-all duration-150 flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'text-orange-600 bg-orange-500/10 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-2 text-base font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'text-orange-700 bg-orange-100 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                <span>Admin</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Logged-in student's information & actions */}
          <div className="flex items-center gap-3">
            {/* Quick search button for desktop */}
            <button
              onClick={onOpenSearch}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 bg-white border border-[#E4DEC3] rounded-lg hover:border-orange-300 hover:text-slate-800 transition-colors shadow-2xs"
              title="Search courses, chapters, resources"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">Quick search...</span>
              <kbd className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-slate-200">
                /
              </kbd>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-3 p-1.5 pr-2.5 rounded-xl hover:bg-white border border-transparent hover:border-[#EAE4D9] hover:shadow-2xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-expanded={profileMenuOpen}
              >
                <div className="w-9 h-9 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 font-semibold text-sm">
                  {currentUser.name.charAt(0)}
                </div>
                
                {/* Student Name & University ID: C253124 */}
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-semibold text-slate-900 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-xs font-mono text-orange-600 font-semibold tracking-wide">
                    ID: {currentUser.universityId}
                  </div>
                </div>

                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {profileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setProfileMenuOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[#EAE4D9] py-1.5 z-40 text-sm animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <div className="font-semibold text-slate-900">{currentUser.name}</div>
                      <div className="text-xs font-mono font-medium text-orange-600 mt-0.5">
                        University ID: {currentUser.universityId}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        {currentUser.department}
                      </div>
                      {currentUser.role === 'admin' && (
                        <div className="mt-1.5 inline-block text-[11px] font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                          Administrator
                        </div>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2.5 transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>My Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2.5 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>Study Settings</span>
                      </button>

                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => {
                            setActiveTab('admin');
                            setProfileMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center gap-2.5 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-orange-500" />
                          <span>Admin Control</span>
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          logout();
                        }}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-black/5"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#EAE4D9] bg-[#FAF8F5] px-4 pt-3 pb-5 space-y-1">
          <div className="pb-3 mb-2 border-b border-[#EAE4D9] flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">{currentUser.name}</div>
              <div className="text-xs font-mono font-medium text-orange-600">ID: {currentUser.universityId}</div>
            </div>
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="text-xs text-red-600 font-medium px-2.5 py-1 rounded bg-red-50 hover:bg-red-100"
            >
              Logout
            </button>
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'search') {
                    onOpenSearch();
                  } else {
                    setActiveTab(item.id);
                  }
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white font-semibold'
                    : 'text-slate-700 hover:bg-black/5'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => {
              setActiveTab('profile');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-base text-slate-700 hover:bg-black/5 font-medium"
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('settings');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-base text-slate-700 hover:bg-black/5 font-medium"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              onClick={() => {
                setActiveTab('admin');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-base text-orange-700 bg-orange-100 font-medium"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Admin Management</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
