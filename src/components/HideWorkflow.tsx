import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Lock,
  Sparkles,
  Sliders,
  RefreshCw,
  File,
  Shield,
  ShieldAlert,
  UserCheck,
  EyeOff,
  HelpCircle
} from 'lucide-react';
import { SampleCover, SampleSecret, CoverInfo, StegoResult } from '../types';
import { VisualInspector } from './VisualInspector';

interface HideWorkflowProps {
  onSwitchToExtract: (stegoDownloadUrl: string) => void;
}

export const HideWorkflow: React.FC<HideWorkflowProps> = ({ onSwitchToExtract }) => {
  // Samples loaded from server
  const [samples, setSamples] = useState<{ covers: SampleCover[]; secrets: SampleSecret[] }>({
    covers: [],
    secrets: [],
  });

  // Step 1: Cover Image State
  const [coverSource, setCoverSource] = useState<'upload' | 'sample'>('sample');
  const [selectedSampleCover, setSelectedSampleCover] = useState<string>('sample_cover_cyber.png');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>('/samples/sample_cover_cyber.png');
  const [coverInfo, setCoverInfo] = useState<CoverInfo | null>(null);
  const [loadingCoverInfo, setLoadingCoverInfo] = useState<boolean>(false);

  // Plausible Deniability Toggle
  const [deniabilityMode, setDeniabilityMode] = useState<boolean>(true);

  // Step 2: True Secret File State
  const [secretSource, setSecretSource] = useState<'sample' | 'upload' | 'text'>('sample');
  const [selectedSampleSecret, setSelectedSampleSecret] = useState<string>('secret.pdf');
  const [secretFile, setSecretFile] = useState<File | null>(null);
  const [secretText, setSecretText] = useState<string>(
    'TOP-SECRET BLUEPRINT: Project Chimera flight logs and root encryption keys. Do not disclose.'
  );
  const [secretCategory, setSecretCategory] = useState<'all' | 'text' | 'document' | 'image'>('all');
  const [secretPassword, setSecretPassword] = useState<string>('trueSecret456');

  // Decoy File State (Plausible Deniability)
  const [decoySource, setDecoySource] = useState<'sample' | 'upload' | 'text'>('sample');
  const [selectedSampleDecoy, setSelectedSampleDecoy] = useState<string>('secret.txt');
  const [decoyFile, setDecoyFile] = useState<File | null>(null);
  const [decoyText, setDecoyText] = useState<string>(
    'Harmless Public Meeting Notes:\n1. Discuss quarterly budget for office supplies\n2. Schedule team picnic for next Friday\n3. Order coffee beans'
  );
  const [decoyPassword, setDecoyPassword] = useState<string>('decoy123');

  // Step 3: Output options
  const [outputFilename, setOutputFilename] = useState<string>('stego.png');
  const [bitsPerChannel, setBitsPerChannel] = useState<number>(1);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Execution & Output State
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stegoResult, setStegoResult] = useState<StegoResult | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const secretInputRef = useRef<HTMLInputElement>(null);
  const decoyInputRef = useRef<HTMLInputElement>(null);

  // Fetch samples on load
  useEffect(() => {
    fetch('/api/stego/samples')
      .then((res) => res.json())
      .then((data) => {
        setSamples(data);
      })
      .catch((err) => console.warn('Could not fetch samples:', err));
  }, []);

  // Update cover info when sample or file changes
  useEffect(() => {
    const fetchInfo = async () => {
      setLoadingCoverInfo(true);
      try {
        const formData = new FormData();
        if (coverSource === 'upload' && coverFile) {
          formData.append('image', coverFile);
        } else {
          formData.append('sampleImage', selectedSampleCover);
        }

        const res = await fetch('/api/stego/info', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          setCoverInfo(data);
        }
      } catch {
        // non-blocking
      } finally {
        setLoadingCoverInfo(false);
      }
    };

    fetchInfo();
  }, [coverSource, selectedSampleCover, coverFile]);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverSource('upload');
      setCoverPreviewUrl(URL.createObjectURL(file));
      setStegoResult(null);
    }
  };

  const handleSecretUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSecretFile(e.target.files[0]);
      setSecretSource('upload');
      setStegoResult(null);
    }
  };

  const handleDecoyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDecoyFile(e.target.files[0]);
      setDecoySource('upload');
      setStegoResult(null);
    }
  };

  // Run Stego Hiding Execution
  const handleRunStego = async () => {
    setProcessing(true);
    setError(null);
    setStegoResult(null);

    try {
      const formData = new FormData();

      // Cover (Step 1)
      if (coverSource === 'upload' && coverFile) {
        formData.append('cover', coverFile);
      } else {
        formData.append('sampleCover', selectedSampleCover);
      }

      // True Secret (Step 2)
      if (secretSource === 'upload' && secretFile) {
        formData.append('secret', secretFile);
      } else if (secretSource === 'sample') {
        formData.append('sampleSecret', selectedSampleSecret);
      } else {
        formData.append('secretText', secretText);
        formData.append('secretFilename', 'top_secret.txt');
      }

      // Plausible Deniability Mode & Decoy File
      if (deniabilityMode) {
        formData.append('deniability', 'true');
        formData.append('decoyPassword', decoyPassword);
        formData.append('password', secretPassword);

        if (decoySource === 'upload' && decoyFile) {
          formData.append('decoy', decoyFile);
        } else if (decoySource === 'sample') {
          formData.append('sampleDecoy', selectedSampleDecoy);
        } else {
          formData.append('decoyText', decoyText);
          formData.append('decoyFilename', 'innocent_notes.txt');
        }
      } else {
        formData.append('deniability', 'false');
        formData.append('password', secretPassword);
      }

      // Settings (Step 3)
      formData.append('outputName', outputFilename || 'stego.png');
      formData.append('bits', bitsPerChannel.toString());

      const res = await fetch('/api/stego/hide', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Steganography encoding failed');
      }

      setStegoResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during steganography processing.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredSecrets = samples.secrets.filter(
    (s) => secretCategory === 'all' || s.category === secretCategory
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Introduction Card with Plausible Deniability Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-700" />
                LSB Steganography + Duress Architecture
              </span>
              <span className="text-xs text-slate-500 font-mono">Python Pillow (PIL)</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Dual-Layer Steganography with Plausible Deniability
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Unlike generic steganography tools that only embed a single file sequentially, StegoPy supports <strong>Plausible Deniability</strong>: it embeds an innocent Decoy layer in bit plane 0 and your True Secret in bit plane 1. Under coercion or audit, providing the Decoy password unlocks the decoy with zero mathematical proof of the hidden secret.
            </p>
          </div>

          {/* Plausible Deniability Mode Toggle */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Plausible Deniability</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                  Duress Mode
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Two passwords &bull; Two separate payloads</p>
            </div>
            <button
              type="button"
              id="toggle-deniability-mode"
              onClick={() => setDeniabilityMode(!deniabilityMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                deniabilityMode ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  deniabilityMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 3-Step Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ================= STEP 1: CHOOSE A COVER IMAGE ================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                Step 1
              </span>
              <span className="text-xs text-slate-500 font-medium">Carrier Selection</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-2">Choose a Cover Image</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select or upload a carrier image to host the steganographic payload.
            </p>
          </div>

          <div className="p-5 space-y-4 flex-1 flex flex-col">
            {/* Source Tab selector */}
            <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setCoverSource('sample')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  coverSource === 'sample' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Preloaded Samples
              </button>
              <button
                type="button"
                onClick={() => setCoverSource('upload')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  coverSource === 'upload' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Upload Custom Image
              </button>
            </div>

            {/* Sample covers */}
            {coverSource === 'sample' && (
              <div className="grid grid-cols-3 gap-2">
                {samples.covers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedSampleCover(c.id);
                      setCoverPreviewUrl(c.url);
                      setStegoResult(null);
                    }}
                    className={`p-1.5 rounded-xl border text-left transition-all ${
                      selectedSampleCover === c.id
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-100 mb-1.5">
                      <img src={c.url} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-800 block truncate">{c.name}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{c.type}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom Cover Upload */}
            {coverSource === 'upload' && (
              <div
                onClick={() => coverInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20"
              >
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/bmp"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700 block">Click or Drag Image Here</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">PNG, JPG, WEBP, or BMP</span>
              </div>
            )}

            {/* Cover Preview & Storage Capacity specs */}
            <div className="space-y-3 pt-2">
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                <img
                  src={coverPreviewUrl}
                  alt="Cover Preview"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white text-[10px] font-mono">
                  Cover Carrier
                </div>
              </div>

              {loadingCoverInfo ? (
                <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2 text-xs text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating image capacity with Python...</span>
                </div>
              ) : coverInfo ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Dimensions:</span>
                    <span className="font-mono font-medium text-slate-800">
                      {coverInfo.width} &times; {coverInfo.height} px
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Carrier Pixels:</span>
                    <span className="font-mono font-medium text-slate-800">
                      {((coverInfo.width * coverInfo.height) / 1000).toFixed(0)}k pixels
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                    <span className="font-semibold text-emerald-800">Max Secret Capacity:</span>
                    <span className="font-bold text-emerald-700">
                      {coverInfo.capacities?.['1_bit_lsb']?.formatted_usable || 'Ready'}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ================= STEP 2: HIDE SECRET FILES (WITH DENIABILITY) ================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-md">
                Step 2
              </span>
              <span className="text-xs text-slate-500 font-medium">Payload Specification</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-2">
              {deniabilityMode ? 'Configure Payloads (Decoy & Secret)' : 'Hide Secret Files'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {deniabilityMode
                ? 'Embed an innocent Decoy for coercion + your confidential True Secret.'
                : 'Supports text files, documents, and confidential image files.'}
            </p>
          </div>

          <div className="p-5 space-y-4 flex-1 flex flex-col">
            {/* Section A: TRUE SECRET (Primary) */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="text-xs font-bold text-rose-900 uppercase">
                    {deniabilityMode ? 'Layer 2: True Secret File' : 'Confidential Secret File'}
                  </span>
                </div>
                <span className="text-[10px] text-rose-700 font-medium">
                  {deniabilityMode ? 'Bit Plane 1 (Hidden)' : 'Encrypted Payload'}
                </span>
              </div>

              {/* Source Tabs for True Secret */}
              <div className="flex p-0.5 bg-rose-100/60 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setSecretSource('sample')}
                  className={`flex-1 py-1 rounded-md transition-all ${
                    secretSource === 'sample' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                  }`}
                >
                  Samples
                </button>
                <button
                  type="button"
                  onClick={() => setSecretSource('upload')}
                  className={`flex-1 py-1 rounded-md transition-all ${
                    secretSource === 'upload' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setSecretSource('text')}
                  className={`flex-1 py-1 rounded-md transition-all ${
                    secretSource === 'text' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                  }`}
                >
                  Type Text
                </button>
              </div>

              {secretSource === 'sample' && (
                <div className="space-y-1.5">
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {(['all', 'document', 'text', 'image'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSecretCategory(cat)}
                        className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${
                          secretCategory === cat ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {filteredSecrets.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedSampleSecret(s.id);
                          setStegoResult(null);
                        }}
                        className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                          selectedSampleSecret === s.id
                            ? 'border-rose-500 bg-white ring-2 ring-rose-500/20 font-semibold'
                            : 'border-slate-200 bg-white/70 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {s.category === 'text' && <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          {s.category === 'document' && <File className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          {s.category === 'image' && <ImageIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                          <span className="text-xs text-slate-800 truncate">{s.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize shrink-0">{s.category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {secretSource === 'upload' && (
                <div
                  onClick={() => secretInputRef.current?.click()}
                  className="border-2 border-dashed border-rose-300 hover:border-rose-500 rounded-xl p-3 text-center cursor-pointer transition-colors bg-white/70"
                >
                  <input
                    ref={secretInputRef}
                    type="file"
                    onChange={handleSecretUpload}
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 mx-auto text-rose-500 mb-1" />
                  <span className="text-xs font-semibold text-slate-800 block truncate">
                    {secretFile ? secretFile.name : 'Select Secret File (.pdf, .doc, .png, .txt)'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {secretFile ? `${(secretFile.size / 1024).toFixed(1)} KB` : 'Any format'}
                  </span>
                </div>
              )}

              {secretSource === 'text' && (
                <textarea
                  rows={3}
                  value={secretText}
                  onChange={(e) => setSecretText(e.target.value)}
                  placeholder="Confidential payload..."
                  className="w-full p-2 text-xs font-mono rounded-lg border border-rose-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              )}

              {/* True Secret Password Input */}
              <div className="space-y-1 pt-1 border-t border-rose-200/60">
                <label className="text-[11px] font-semibold text-rose-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-rose-600" />
                    True Secret Password (Layer 2):
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Unlocks real payload</span>
                </label>
                <input
                  type="text"
                  value={secretPassword}
                  onChange={(e) => setSecretPassword(e.target.value)}
                  placeholder="Password for true secret"
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-rose-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-rose-950 font-semibold"
                />
              </div>
            </div>

            {/* Section B: DECOY FILE (Under Duress / Plausible Deniability) */}
            {deniabilityMode && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-900 uppercase">
                      Layer 1: Decoy Payload (Duress)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-200 text-amber-900">
                    Bit Plane 0
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-tight">
                  This harmless payload is unlocked if coerced to surrender a password. An auditor will verify this file and find zero evidence of Layer 2.
                </p>

                {/* Source Tabs for Decoy */}
                <div className="flex p-0.5 bg-amber-100/70 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setDecoySource('sample')}
                    className={`flex-1 py-1 rounded-md transition-all ${
                      decoySource === 'sample' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                    }`}
                  >
                    Sample Decoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecoySource('upload')}
                    className={`flex-1 py-1 rounded-md transition-all ${
                      decoySource === 'upload' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                    }`}
                  >
                    Upload Decoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecoySource('text')}
                    className={`flex-1 py-1 rounded-md transition-all ${
                      decoySource === 'text' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                    }`}
                  >
                    Decoy Note
                  </button>
                </div>

                {decoySource === 'sample' && (
                  <select
                    value={selectedSampleDecoy}
                    onChange={(e) => setSelectedSampleDecoy(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-amber-300 bg-white focus:outline-none"
                  >
                    <option value="secret.txt">secret.txt (Innocent Text Payload)</option>
                    <option value="secret.doc">secret.doc (Office Document)</option>
                    <option value="sample_avatar.png">sample_avatar.png (Standard Photo)</option>
                  </select>
                )}

                {decoySource === 'upload' && (
                  <div
                    onClick={() => decoyInputRef.current?.click()}
                    className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-xl p-3 text-center cursor-pointer transition-colors bg-white/70"
                  >
                    <input
                      ref={decoyInputRef}
                      type="file"
                      onChange={handleDecoyUpload}
                      className="hidden"
                    />
                    <Upload className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                    <span className="text-xs font-semibold text-slate-800 block truncate">
                      {decoyFile ? decoyFile.name : 'Select Innocent Decoy File'}
                    </span>
                  </div>
                )}

                {decoySource === 'text' && (
                  <textarea
                    rows={2}
                    value={decoyText}
                    onChange={(e) => setDecoyText(e.target.value)}
                    className="w-full p-2 text-xs font-mono rounded-lg border border-amber-300 bg-white focus:outline-none"
                  />
                )}

                {/* Decoy Password Input */}
                <div className="space-y-1 pt-1 border-t border-amber-200/70">
                  <label className="text-[11px] font-semibold text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Decoy Password (Duress):
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Surrendered under coercion</span>
                  </label>
                  <input
                    type="text"
                    value={decoyPassword}
                    onChange={(e) => setDecoyPassword(e.target.value)}
                    placeholder="Password to give under duress"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-amber-300 bg-white focus:outline-none text-amber-950 font-semibold"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= STEP 3: SAVE OUTPUT (STEGO.PNG) ================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                Step 3
              </span>
              <span className="text-xs text-slate-500 font-medium">Generate Stego Image</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-2">Save the Output</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The output image is called a stego image. Save it as stego.png.
            </p>
          </div>

          <div className="p-5 space-y-4 flex-1 flex flex-col">
            {/* Output filename input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Output Filename:</label>
              <div className="relative">
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="stego.png"
                  className="w-full pl-3 pr-12 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-semibold text-slate-800"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">.png</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Default: <code className="font-semibold text-indigo-700">stego.png</code> (lossless PNG format is strictly required).
              </p>
            </div>

            {/* Plausible Deniability Architecture Summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <EyeOff className="w-4 h-4 text-indigo-600" />
                <span>Steganographic Bit Allocation</span>
              </div>
              {deniabilityMode ? (
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>Bit Plane 0 (LSB0):</span>
                    </span>
                    <span className="font-mono font-bold text-amber-800">Decoy (Password: {decoyPassword || 'none'})</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>Bit Plane 1 (LSB1):</span>
                    </span>
                    <span className="font-mono font-bold text-rose-800">True Secret (Password: {secretPassword || 'none'})</span>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600">
                  Single payload embedded sequentially in {bitsPerChannel}-bit LSB plane with zlib compression &amp; SHA-256 stream cipher.
                </div>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Execute Button */}
            <div className="mt-auto pt-4 border-t border-slate-100">
              <button
                type="button"
                id="btn-run-stego"
                onClick={handleRunStego}
                disabled={processing}
                className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                  processing
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] shadow-emerald-600/20'
                }`}
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Python Pillow Engine Running...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>Generate Stego Image ({outputFilename || 'stego.png'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Inspector & Stego Metrics Section (Appears after encoding) */}
      {stegoResult && (
        <VisualInspector
          stegoResult={stegoResult}
          coverUrl={coverPreviewUrl}
          onSwitchToExtract={onSwitchToExtract}
        />
      )}
    </div>
  );
};
