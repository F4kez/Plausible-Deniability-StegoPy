import React, { useState } from 'react';
import { Header } from './components/Header';
import { HideWorkflow } from './components/HideWorkflow';
import { ExtractWorkflow } from './components/ExtractWorkflow';
import { PythonViewer } from './components/PythonViewer';

export default function App() {
  const [activeTab, setActiveTab] = useState<'hide' | 'extract' | 'python'>('hide');
  const [preloadedStegoUrl, setPreloadedStegoUrl] = useState<string | null>(null);

  const handleSwitchToExtract = (stegoUrl: string) => {
    setPreloadedStegoUrl(stegoUrl);
    setActiveTab('extract');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {activeTab === 'hide' && <HideWorkflow onSwitchToExtract={handleSwitchToExtract} />}
        {activeTab === 'extract' && <ExtractWorkflow initialStegoUrl={preloadedStegoUrl} />}
        {activeTab === 'python' && <PythonViewer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">StegoPy Tool</span>
            <span>&bull;</span>
            <span>Python 3.10 LSB Steganography Engine with Pillow (PIL)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Text (.txt)</span>
            <span>&bull;</span>
            <span>Documents (.pdf, .doc)</span>
            <span>&bull;</span>
            <span>Images (.png, .jpg)</span>
            <span>&bull;</span>
            <span>Output: stego.png</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
