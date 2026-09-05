import React from 'react';
import { ShieldCheck, Terminal, Eye, Lock, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: 'hide' | 'extract' | 'python';
  setActiveTab: (tab: 'hide' | 'extract' | 'python') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">StegoPy</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                Python 3.10 + Pillow
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Plausible Deniability &bull; Python LSB Steganography Engine
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-sm font-medium">
          <button
            id="tab-hide"
            onClick={() => setActiveTab('hide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'hide'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Hide Secret (Part 1)</span>
          </button>

          <button
            id="tab-extract"
            onClick={() => setActiveTab('extract')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'extract'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4 text-cyan-600" />
            <span>Extract &amp; Verify</span>
          </button>

          <button
            id="tab-python"
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'python'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>Python Script &amp; CLI</span>
          </button>
        </div>
      </div>
    </header>
  );
};
