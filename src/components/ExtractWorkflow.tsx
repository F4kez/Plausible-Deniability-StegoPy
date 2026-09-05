import React, { useState, useRef } from 'react';
import {
  Upload,
  Eye,
  FileCheck2,
  AlertCircle,
  Download,
  Lock,
  RefreshCw,
  FileText,
  File,
  Image as ImageIcon,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Layers,
  KeyRound,
  EyeOff
} from 'lucide-react';
import { ExtractResult } from '../types';

interface ExtractWorkflowProps {
  initialStegoUrl?: string | null;
}

export const ExtractWorkflow: React.FC<ExtractWorkflowProps> = ({ initialStegoUrl }) => {
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [stegoPreviewUrl, setStegoPreviewUrl] = useState<string | null>(initialStegoUrl || null);
  const [password, setPassword] = useState<string>('trueSecret456');
  const [forceLayer, setForceLayer] = useState<'auto' | 'secret' | 'decoy'>('auto');
  const [extracting, setExtracting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStegoFile(file);
      setStegoPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setResult(null);
    }
  };

  const handleExtract = async (overridePassword?: string) => {
    if (!stegoFile && !stegoPreviewUrl) {
      setError('Please select or upload a stego image first.');
      return;
    }

    setExtracting(true);
    setError(null);
    setResult(null);

    const activePassword = overridePassword !== undefined ? overridePassword : password;

    try {
      const formData = new FormData();
      if (stegoFile) {
        formData.append('stego', stegoFile);
      } else if (stegoPreviewUrl) {
        const resp = await fetch(stegoPreviewUrl);
        const blob = await resp.blob();
        formData.append('stego', blob, 'stego.png');
      }

      if (activePassword) {
        formData.append('password', activePassword);
      }

      if (forceLayer !== 'auto') {
        formData.append('layer', forceLayer);
      }

      const res = await fetch('/api/stego/extract', {
        method: 'POST',
        body: formData,
      });

      const data: ExtractResult = await res.json();
      if (!res.ok || (!data.success && !data.password_required)) {
        throw new Error(data.error || 'Steganography extraction failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to extract hidden file from the image.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Intro card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">
                Reverse Steganography
              </span>
              <span className="text-xs text-slate-500 font-mono">Plausible Deniability Verifier</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Extract &amp; Verify Hidden Files
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Inspect any stego image to extract its concealed payload. If the carrier was encoded with <strong>Plausible Deniability</strong>, entering the decoy password unlocks the innocent document, while the true secret password unseals the confidential file.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPassword('decoy123');
                handleExtract('decoy123');
              }}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Test Decoy Password</span>
            </button>
            <button
              onClick={() => {
                setPassword('trueSecret456');
                handleExtract('trueSecret456');
              }}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <KeyRound className="w-4 h-4 text-rose-600" />
              <span>Test Real Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Extract Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Selection & Password (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">1. Stego Image Input</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select or drop the stego.png image generated in Step 3.
            </p>
          </div>

          {/* Stego File drop area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-cyan-50/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/bmp"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-700 block">
              {stegoFile ? stegoFile.name : 'Upload Stego Image (stego.png)'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {stegoFile ? `${(stegoFile.size / 1024).toFixed(1)} KB` : 'Lossless PNG with embedded LSB bits'}
            </span>
          </div>

          {/* Image Preview */}
          {stegoPreviewUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Loaded Stego Image:</span>
                <span className="text-[10px] text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded font-mono">
                  Ready for Decoding
                </span>
              </div>
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                <img
                  src={stegoPreviewUrl}
                  alt="Stego Image"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Decryption Password:
              </label>
              <span className="text-[10px] text-slate-400">Decoy or True Secret</span>
            </div>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="e.g. decoy123 or trueSecret456"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          {/* Optional Layer Selector */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-semibold">Extraction Bit Plane Mode:</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setForceLayer('auto')}
                className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                  forceLayer === 'auto'
                    ? 'border-cyan-600 bg-cyan-50 text-cyan-900 font-semibold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Auto (by Pass)
              </button>
              <button
                type="button"
                onClick={() => setForceLayer('decoy')}
                className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                  forceLayer === 'decoy'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Force Decoy
              </button>
              <button
                type="button"
                onClick={() => setForceLayer('secret')}
                className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                  forceLayer === 'secret'
                    ? 'border-rose-600 bg-rose-50 text-rose-900 font-semibold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Force Secret
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div className="pt-2 mt-auto">
            <button
              type="button"
              id="btn-extract-stego"
              onClick={() => handleExtract()}
              disabled={extracting}
              className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                extracting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-700 active:scale-[0.99] shadow-cyan-600/20'
              }`}
            >
              {extracting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Decoding Bitstream with Python...</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Extract Secret File with Python</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Extraction Results & Payload Preview (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              Extracted Payload &amp; Integrity Verification
            </h3>

            {!result && !extracting && (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <File className="w-12 h-12 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-500">No file extracted yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Provide a stego image on the left and click &quot;Extract Secret File with Python&quot; to test password extraction.
                </p>
              </div>
            )}

            {result?.password_required && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Lock className="w-4 h-4 text-amber-600" />
                  Password Required
                </div>
                <p className="text-xs text-amber-800">
                  {result.error || 'This hidden file is protected with a password. Please enter the password and try again.'}
                </p>
              </div>
            )}

            {result?.success && (
              <div className="space-y-6">
                {/* Layer Identification Badge */}
                {result.deniability_mode && (
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      result.active_layer?.includes('Decoy')
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {result.active_layer?.includes('Decoy') ? (
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-rose-600" />
                      )}
                      <span>Active Layer Unlocked: {result.active_layer}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80">
                      {result.active_layer?.includes('Decoy') ? 'Bit Plane 0 (Decoy)' : 'Bit Plane 1 (True Secret)'}
                    </span>
                  </div>
                )}

                {/* Status card */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      {result.category === 'text' && <FileText className="w-5 h-5" />}
                      {result.category === 'document' && <File className="w-5 h-5" />}
                      {result.category === 'image' && <ImageIcon className="w-5 h-5" />}
                      {result.category === 'other' && <FileCheck2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide block">
                        File Recovered Successfully
                      </span>
                      <h4 className="text-base font-bold text-slate-900">{result.filename}</h4>
                      <span className="text-xs text-slate-600">
                        Size: <strong>{result.formatted_size}</strong> ({result.size_bytes?.toLocaleString()} bytes)
                      </span>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    CRC32 Match
                  </span>
                </div>

                {/* Integrity & Encryption Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Integrity Check</span>
                    <span className="font-semibold text-emerald-700 font-mono">CRC32 {result.crc32_hex}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Payload Category</span>
                    <span className="font-semibold text-slate-800 capitalize">{result.category}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Stream Cipher</span>
                    <span className="font-semibold text-slate-800">
                      {result.is_encrypted ? 'SHA-256 + XOR' : 'None'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Decompression</span>
                    <span className="font-semibold text-slate-800">
                      {result.is_compressed ? 'zlib Deflate' : 'Raw'}
                    </span>
                  </div>
                </div>

                {/* Text Payload Preview (if text) */}
                {result.textPreview && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-700 block">
                      Decoded File Content Preview ({result.filename}):
                    </span>
                    <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                      {result.textPreview}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Download recovered file button */}
          {result?.success && result.downloadUrl && (
            <div className="pt-6 border-t border-slate-100 mt-6">
              <a
                href={result.downloadUrl}
                download={result.filename}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Extracted {result.filename}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
