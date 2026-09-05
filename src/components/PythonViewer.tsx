import React, { useState, useEffect } from 'react';
import { Terminal, Copy, Check, Download, ShieldAlert, Code2, ShieldCheck } from 'lucide-react';

export const PythonViewer: React.FC = () => {
  const [pythonCode, setPythonCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeCliTab, setActiveCliTab] = useState<'deniability' | 'hide' | 'extract' | 'analysis'>('deniability');

  useEffect(() => {
    fetch('/api/python-code')
      .then((res) => res.json())
      .then((data) => {
        setPythonCode(data.code);
      })
      .catch((err) => console.warn('Could not fetch python code:', err));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stego_engine.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Intro Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Python 3 + Pillow
              </span>
              <span className="text-xs text-slate-500 font-mono">stego_engine.py</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Python Steganography Engine Source &amp; CLI
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              This application is powered by a standalone Python steganography engine utilizing the <code className="text-indigo-700 font-semibold bg-indigo-50 px-1 py-0.5 rounded">Pillow (PIL)</code> library with integrated <strong>Plausible Deniability</strong> dual-payload architecture. You can run it via this web interface or directly from your terminal.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Script'}</span>
            </button>
            <button
              onClick={handleDownloadScript}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download stego_engine.py</span>
            </button>
          </div>
        </div>
      </div>

      {/* CLI Documentation Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-600" />
          Command Line Interface (CLI) Usage Guide
        </h3>

        {/* Tab selector */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-semibold flex-wrap">
          <button
            onClick={() => setActiveCliTab('deniability')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeCliTab === 'deniability' ? 'bg-amber-100 text-amber-900' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Plausible Deniability (Duress Mode)</span>
          </button>
          <button
            onClick={() => setActiveCliTab('hide')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeCliTab === 'hide' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Standard Hide (Single Layer)
          </button>
          <button
            onClick={() => setActiveCliTab('extract')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeCliTab === 'extract' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Extract &amp; Verify Checksum
          </button>
          <button
            onClick={() => setActiveCliTab('analysis')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeCliTab === 'analysis' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Capacity &amp; Difference Map
          </button>
        </div>

        {/* CLI content */}
        <div className="space-y-3">
          {activeCliTab === 'deniability' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                Embed both an innocent <strong>Decoy file</strong> and your <strong>True Secret file</strong> into separate bit planes. Provide the decoy password under duress; auditors cannot prove the real secret exists:
              </p>
              <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800 space-y-2">
                <div className="text-slate-400"># 1. Encode with Plausible Deniability (Decoy + Real Secret):</div>
                <div className="text-amber-300">
                  python3 stego_engine.py hide \<br />
                  &nbsp;&nbsp;--cover cover.png \<br />
                  &nbsp;&nbsp;--secret secret.pdf \<br />
                  &nbsp;&nbsp;--password &quot;RealKey456&quot; \<br />
                  &nbsp;&nbsp;--deniability \<br />
                  &nbsp;&nbsp;--decoy shopping_list.txt \<br />
                  &nbsp;&nbsp;--decoy-password &quot;CoercedPass123&quot; \<br />
                  &nbsp;&nbsp;--output stego.png
                </div>

                <div className="text-slate-400 mt-3"># 2. Extract under duress (reveals ONLY shopping_list.txt):</div>
                <div className="text-emerald-400">
                  python3 stego_engine.py extract --stego stego.png --output-dir extracted/ --password &quot;CoercedPass123&quot;
                </div>

                <div className="text-slate-400 mt-3"># 3. Extract genuine confidential payload (reveals secret.pdf):</div>
                <div className="text-cyan-400">
                  python3 stego_engine.py extract --stego stego.png --output-dir extracted/ --password &quot;RealKey456&quot;
                </div>
              </div>
            </div>
          )}

          {activeCliTab === 'hide' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                Run the python script to hide text, PDF, Word doc, or images inside any cover image and generate <code className="font-mono text-indigo-700 font-semibold">stego.png</code>:
              </p>
              <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800 space-y-2">
                <div className="text-slate-400"># 1. Install Pillow requirement:</div>
                <div className="text-emerald-400">pip install pillow</div>
                <div className="text-slate-400 mt-2"># 2. Hide a text file (secret.txt):</div>
                <div className="text-indigo-300">python3 stego_engine.py hide --cover cover.png --secret secret.txt --output stego.png</div>
                <div className="text-slate-400 mt-2"># 3. Hide a PDF document (secret.pdf):</div>
                <div className="text-indigo-300">python3 stego_engine.py hide --cover cover.png --secret secret.pdf --output stego.png</div>
                <div className="text-slate-400 mt-2"># 4. Hide a secret image with password encryption:</div>
                <div className="text-indigo-300">python3 stego_engine.py hide --cover cover.png --secret secret.png --output stego.png --password &quot;MySecretPass123&quot;</div>
              </div>
            </div>
          )}

          {activeCliTab === 'extract' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                Extract the hidden secret file from <code className="font-mono text-indigo-700 font-semibold">stego.png</code> and verify CRC32 integrity:
              </p>
              <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800 space-y-2">
                <div className="text-slate-400"># Extract payload to an output folder:</div>
                <div className="text-indigo-300">python3 stego_engine.py extract --stego stego.png --output-dir extracted/</div>
                <div className="text-slate-400 mt-2"># Extract password-protected stego image:</div>
                <div className="text-indigo-300">python3 stego_engine.py extract --stego stego.png --output-dir extracted/ --password &quot;MySecretPass123&quot;</div>
              </div>
            </div>
          )}

          {activeCliTab === 'analysis' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                Inspect image capacity and generate 80&times; amplified pixel difference heatmaps:
              </p>
              <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800 space-y-2">
                <div className="text-slate-400"># Inspect image dimensions and byte storage capacity:</div>
                <div className="text-indigo-300">python3 stego_engine.py info --image cover.png</div>
                <div className="text-slate-400 mt-2"># Generate amplified difference map:</div>
                <div className="text-indigo-300">python3 stego_engine.py diff --cover cover.png --stego stego.png --output diff.png --amplify 80</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Python Code Viewer */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
        <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-slate-200">stego_engine.py (Python 3.10 + Pillow)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Dual-Layer LSB &bull; CRC32 Checksum &bull; Plausible Deniability
          </span>
        </div>
        <div className="p-6 max-h-[560px] overflow-y-auto">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed">
            <code>{pythonCode || '# Loading Python engine source code...'}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
