import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  Key,
  Layers,
  Server,
  X
} from 'lucide-react';
import {
  clearRuntimeSupabaseCredentials,
  getSupabaseCredentials,
  isSupabaseConfigured,
  saveRuntimeSupabaseCredentials,
  SUPABASE_SETUP_SQL
} from '../lib/supabase';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsUpdated: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onCredentialsUpdated,
}) => {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim().startsWith('http')) {
      setStatusMsg({ text: 'Project URL must start with https://', isError: true });
      return;
    }
    if (!anonKey.trim()) {
      setStatusMsg({ text: 'Please enter your Supabase anon/public key.', isError: true });
      return;
    }

    saveRuntimeSupabaseCredentials(url.trim(), anonKey.trim());
    setStatusMsg({ text: 'Credentials saved! Connecting to Supabase...', isError: false });
    setTimeout(() => {
      onCredentialsUpdated();
      onClose();
    }, 600);
  };

  const handleClear = () => {
    clearRuntimeSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setStatusMsg({ text: 'Credentials cleared.', isError: false });
    setTimeout(() => {
      onCredentialsUpdated();
    }, 400);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#FFFDF9] border border-amber-200 rounded-2xl shadow-2xl p-6 sm:p-8 my-8 text-stone-800">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900">Supabase Backend Configuration</h2>
            <p className="text-sm text-stone-600">
              Shared storage across all student accounts and devices
            </p>
          </div>
        </div>

        {/* Status Callout */}
        <div
          className={`p-4 rounded-xl mb-6 border flex items-start gap-3 ${
            isConfigured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-semibold">
              {isConfigured
                ? 'Supabase is currently connected and active'
                : 'Supabase credentials are required for live sharing'}
            </p>
            <p className="text-xs mt-1 text-stone-600">
              As required by Contributo, no resources are kept in localStorage. Every student
              accessing from any device connects to this shared backend to view and submit YouTube
              videos, playlists, and syllabus files.
            </p>
          </div>
        </div>

        {/* Required Environment Variables Section */}
        <div className="mb-6 bg-stone-50 border border-stone-200 rounded-xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 mb-2">
            <Server className="w-4 h-4" /> Required Environment Variables
          </h3>
          <p className="text-xs text-stone-600 mb-3">
            Add these to your environment (e.g. <code className="bg-stone-200 px-1.5 py-0.5 rounded text-stone-800">.env</code>):
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="bg-stone-900 text-amber-300 p-2.5 rounded-lg flex justify-between items-center overflow-x-auto">
              <span>VITE_SUPABASE_URL=&quot;https://your-project.supabase.co&quot;</span>
            </div>
            <div className="bg-stone-900 text-amber-300 p-2.5 rounded-lg flex justify-between items-center overflow-x-auto">
              <span>VITE_SUPABASE_ANON_KEY=&quot;eyJhbGciOiJI...&quot;</span>
            </div>
          </div>
        </div>

        {/* Runtime Input Form */}
        <form onSubmit={handleSave} className="space-y-4 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-amber-600" /> Or Connect Directly Now
          </h3>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Supabase Project URL (<code className="text-amber-700">VITE_SUPABASE_URL</code>)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzabcdefg.supabase.co"
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Supabase Anon Key (<code className="text-amber-700">VITE_SUPABASE_ANON_KEY</code>)
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {statusMsg && (
            <p
              className={`text-xs p-2 rounded-lg ${
                statusMsg.isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {statusMsg.text}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer"
            >
              Save & Connect
            </button>
            {isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        </form>

        {/* SQL Schema Script Accordion */}
        <div className="border border-amber-200/80 rounded-xl p-4 bg-amber-50/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Public Registration & RLS SQL Migration
              </h4>
            </div>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-md text-xs font-semibold text-amber-900 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-700" /> Copy SQL
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-stone-600 mb-3">
            Database tables, open public registration policies, and course-files storage bucket permissions
            can be deployed by running this SQL migration in your Supabase SQL Editor.
          </p>
          <div className="relative">
            <pre className="max-h-36 overflow-y-auto p-3 bg-stone-900 text-stone-200 text-[11px] font-mono rounded-lg leading-relaxed select-all">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const SupabaseSetupBanner: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const isConfigured = isSupabaseConfigured();
  if (isConfigured) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-300/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-amber-950">
          <span className="flex h-2 w-2 rounded-full bg-amber-600 animate-pulse"></span>
          <span className="font-semibold">Supabase Shared Backend Required:</span>
          <span className="text-amber-800 hidden md:inline">
            Set <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">VITE_SUPABASE_URL</code> and{' '}
            <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">VITE_SUPABASE_ANON_KEY</code> for cross-device shared library.
          </span>
        </div>
        <button
          onClick={onOpenModal}
          className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <span>Connect Supabase</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
