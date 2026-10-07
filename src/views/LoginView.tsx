import React, { useState } from 'react';
import { 
  GraduationCap, 
  Lock, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateUniversityId } from '../utils/security';

export const LoginView: React.FC = () => {
  const { login, register, switchUserQuick } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regId, setRegId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('Computer Science & Engineering');
  const [regError, setRegError] = useState<string | null>(null);

  // Live validation for University ID format: C + exactly 6 digits
  const currentIdToTest = activeTab === 'login' ? loginId : regId;
  const liveIdValidation = currentIdToTest ? validateUniversityId(currentIdToTest) : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const validation = validateUniversityId(loginId);
    if (!validation.valid) {
      setLoginError(validation.error || 'Invalid University ID');
      return;
    }

    if (!loginPassword) {
      setLoginError('Please enter your student password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(loginId, loginPassword);
    setIsSubmitting(false);

    if (!result.success) {
      setLoginError(result.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const validation = validateUniversityId(regId);
    if (!validation.valid) {
      setRegError(validation.error || 'Invalid University ID');
      return;
    }

    if (!regName.trim()) {
      setRegError('Please provide your full student name.');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setRegError('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      name: regName,
      universityId: regId,
      password: regPassword,
      department: regDepartment,
      role: 'student'
    });
    setIsSubmitting(false);

    if (!result.success) {
      setRegError(result.error || 'Registration failed.');
    }
  };

  const handleDemoFill = (id: string, name: string) => {
    setLoginId(id);
    setLoginPassword('password123');
    setLoginError(null);
    switchUserQuick(id);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/25 mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
          Contributo
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Private University Academic Resource Hub
        </p>
      </div>

      {/* Main Auth Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-[#EAE4D9] shadow-sm">
          
          {/* Tabs: Sign In / Create Account */}
          <div className="flex border-b border-[#EAE4D9] mb-6">
            <button
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`flex-1 pb-3 text-base font-semibold text-center border-b-2 transition-all ${
                activeTab === 'login'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Student Login
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
              }}
              className={`flex-1 pb-3 text-base font-semibold text-center border-b-2 transition-all ${
                activeTab === 'register'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              New Student ID
            </button>
          </div>

          {/* Quick Notice on Format */}
          <div className="mb-5 p-3.5 bg-orange-50/70 border border-orange-200/80 rounded-xl text-xs text-orange-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Required ID Format: </span>
              Must start with capital <span className="font-mono font-semibold text-orange-700">C</span> followed by exactly 6 digits (e.g. <span className="font-mono font-bold text-orange-700">C253124</span>).
              <div className="text-[11px] text-orange-800/80 mt-0.5">
                No email address or email verification is required.
              </div>
            </div>
          </div>

          {/* LOGIN TAB */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  University ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="e.g. C253124"
                    maxLength={7}
                    required
                    className={`w-full px-3.5 py-2.5 bg-[#FAF8F5] border rounded-xl font-mono text-base tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 ${
                      liveIdValidation === null
                        ? 'border-[#E4DEC3] focus:ring-orange-500'
                        : liveIdValidation.valid
                        ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/20'
                        : 'border-red-400 focus:ring-red-400'
                    }`}
                  />
                  <div className="absolute right-3 top-3">
                    {liveIdValidation && (
                      liveIdValidation.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                      )
                    )}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Format: C + 6 digits</span>
                  <span className="font-mono">{loginId.length}/7 chars</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
                  />
                  <div className="absolute right-3 top-3 text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl text-base font-semibold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Contributo'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REGISTER TAB */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  Student Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Md. Elman"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  University ID
                </label>
                <input
                  type="text"
                  value={regId}
                  onChange={(e) => setRegId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="e.g. C253124"
                  maxLength={7}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl font-mono text-base tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  Must start with C followed by 6 digits.
                </span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  Department
                </label>
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Department of Mathematics & Physics">Mathematics & Physics</option>
                  <option value="Department of Natural Sciences">Natural Sciences / Chemistry</option>
                  <option value="Electrical & Electronic Engineering">Electrical & Electronic Engineering</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-1">
                  Create Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl text-base font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Registering...' : 'Register Student ID'}</span>
                <UserCheck className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick 1-Click Demo Accounts for Easy Testing */}
          <div className="mt-6 pt-5 border-t border-[#EAE4D9]">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Instant 1-Click Demo Accounts</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoFill('C253124', 'Md. Elman')}
                className="w-full text-left p-2.5 rounded-xl border border-[#EAE4D9] hover:border-orange-300 hover:bg-orange-50/40 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                    Md. Elman (Student)
                  </div>
                  <div className="text-[11px] font-mono text-orange-700">
                    ID: C253124
                  </div>
                </div>
                <span className="text-xs font-medium text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded">
                  Quick Login
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('C250001', 'Prof. K. Rahman')}
                className="w-full text-left p-2.5 rounded-xl border border-[#EAE4D9] hover:border-orange-300 hover:bg-orange-50/40 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                    Prof. K. Rahman (Admin)
                  </div>
                  <div className="text-[11px] font-mono text-orange-700">
                    ID: C250001
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Admin Demo
                </span>
              </button>
            </div>
          </div>

        </div>

        {/* Security Assurance footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Private academic instance. Student records and IDs are strictly isolated.
        </p>
      </div>

    </div>
  );
};
