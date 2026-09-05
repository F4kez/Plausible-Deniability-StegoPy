import React, { useState } from 'react';
import { Layers, Eye, Zap, Info, Download, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { StegoResult } from '../types';

interface VisualInspectorProps {
  coverUrl: string;
  stegoResult: StegoResult;
  onSwitchToExtract?: (stegoDownloadUrl: string) => void;
}

export const VisualInspector: React.FC<VisualInspectorProps> = ({
  coverUrl,
  stegoResult: result,
  onSwitchToExtract,
}) => {
  const [viewMode, setViewMode] = useState<'sideBySide' | 'diff' | 'slider'>('sideBySide');
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
              Stego Image Ready
            </span>
            {result.deniability_mode && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-600" />
                Dual-Layer Plausible Deniability
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Visual Analysis &amp; Steganographic Invisibility
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare Cover vs. Stego ({result.outputFilename}). The carrier pixels show zero perceptible alteration.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center p-1 bg-slate-200/70 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('sideBySide')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'sideBySide' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Side by Side
          </button>
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'slider' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Split Slider
          </button>
          {result.diffUrl && (
            <button
              type="button"
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'diff' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Difference Map (80&times;)
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metric summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">PSNR Invisibility</span>
            <span className="text-lg font-bold text-emerald-600">
              {typeof result.stego_info.psnr_db === 'number'
                ? `${result.stego_info.psnr_db} dB`
                : result.stego_info.psnr_db}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">&gt;40 dB = Imperceptible</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">Mean Squared Error</span>
            <span className="text-lg font-bold text-slate-800">{result.stego_info.mse}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Average pixel variation</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">Pixels Altered</span>
            <span className="text-lg font-bold text-indigo-600">
              {result.stego_info.pixels_altered.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">{result.stego_info.pixels_altered_pct}% of total</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium block">Carrier Architecture</span>
            <span className="text-sm font-bold text-amber-700">
              {result.deniability_mode ? 'Dual-Layer Duress' : 'Standard 1-Layer'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {result.deniability_mode ? 'Plane 0 + Plane 1' : 'Plane 0'}
            </span>
          </div>
        </div>

        {/* Dual Layer Payload Specs (if deniability) */}
        {result.deniability_mode && result.decoy_info && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Layer 1 (Decoy / Duress) &bull; Bit Plane 0
                </span>
                <span className="text-xs font-bold text-slate-900 block">{result.decoy_info.filename}</span>
                <span className="text-[11px] text-slate-600">
                  Size: {result.decoy_info.formatted_size} &bull; Encrypted &amp; Compressed
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-800 block">
                  Layer 2 (True Secret) &bull; Bit Plane 1
                </span>
                <span className="text-xs font-bold text-slate-900 block">{result.secret_info.filename}</span>
                <span className="text-[11px] text-slate-600">
                  Size: {result.secret_info.formatted_size} &bull; Encrypted &amp; Compressed
                </span>
              </div>
            </div>
          </div>
        )}

        {/* View modes */}
        {viewMode === 'sideBySide' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                <span>Original Cover Image</span>
                <span>{result.cover_info.width} &times; {result.cover_info.height}</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 aspect-4/3 flex items-center justify-center relative">
                <img
                  src={coverUrl}
                  alt="Original Cover"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/70 text-white text-[10px] font-mono">
                  Cover (Clean)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 px-1">
                <span>Stego Image ({result.outputFilename})</span>
                <span className="text-emerald-600 font-mono text-[11px]">Secret Embedded</span>
              </div>
              <div className="rounded-xl overflow-hidden border border-emerald-300 bg-slate-900/5 aspect-4/3 flex items-center justify-center relative ring-2 ring-emerald-500/10">
                <img
                  src={result.downloadUrl}
                  alt="Stego Image"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-200 text-[10px] font-mono">
                  Output: {result.outputFilename}
                </span>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'slider' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-16/9 select-none">
              <img
                src={result.downloadUrl}
                alt="Stego"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                referrerPolicy="no-referrer"
              />
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={coverUrl}
                  alt="Cover"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ width: '100%', maxWidth: 'none' }}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-lg border border-slate-300 flex items-center justify-center text-[10px] text-slate-700 font-bold">
                  &harr;
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 font-medium">Cover (Left)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="flex-1 accent-emerald-600"
              />
              <span className="text-xs text-emerald-700 font-medium">Stego (Right)</span>
            </div>
          </div>
        )}

        {viewMode === 'diff' && result.diffUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Amplified Difference Heatmap (80&times; Boost):</strong> Least Significant Bit (LSB) changes are
                amplified so the highlights reveal exactly which pixels hold hidden secret bits. To human eyes,
                these changes are completely invisible!
              </span>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-16/9 flex items-center justify-center">
              <img
                src={result.diffUrl}
                alt="Difference Map"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        {/* Action buttons: Download stego image & Switch to extract workflow */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href={result.downloadUrl}
            download={result.outputFilename || 'stego.png'}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download {result.outputFilename || 'stego.png'}</span>
          </a>

          {onSwitchToExtract && (
            <button
              type="button"
              onClick={() => onSwitchToExtract(result.downloadUrl)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <span>Test Extraction in Part 2</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
