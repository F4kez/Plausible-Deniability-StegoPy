import React from 'react';
import { Check, X, Shield, AlertCircle } from 'lucide-react';
import { evaluatePassword } from '../utils/passwordPolicy';

interface PasswordRequirementMeterProps {
  password: string;
  label?: string;
  isRequired?: boolean;
  accentColor?: 'rose' | 'amber' | 'cyan';
}

export const PasswordRequirementMeter: React.FC<PasswordRequirementMeterProps> = ({
  password,
  label = 'Password Security Requirements',
  isRequired = false,
  accentColor = 'rose',
}) => {
  const evalResult = evaluatePassword(password, isRequired);

  if (!password && !isRequired) {
    return (
      <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-start gap-2">
        <Shield className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-slate-700">Optional Encryption: </span>
          Leave blank for unencrypted payload, or type a password meeting security standards (min 8 chars, letters, &amp; numbers).
        </div>
      </div>
    );
  }

  const getBarColor = (score: number) => {
    switch (score) {
      case 1:
        return 'bg-rose-500';
      case 2:
        return 'bg-amber-500';
      case 3:
        return 'bg-teal-500';
      case 4:
        return 'bg-emerald-500';
      default:
        return 'bg-slate-200';
    }
  };

  return (
    <div className="bg-white/80 border border-slate-200 rounded-lg p-2.5 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
          <Shield className="w-3 h-3 text-slate-500" />
          {label}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            evalResult.score <= 1
              ? 'bg-rose-100 text-rose-800'
              : evalResult.score === 2
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {evalResult.strengthLabel}
        </span>
      </div>

      {/* 4-segment Strength Bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-colors ${
              evalResult.score >= step ? getBarColor(evalResult.score) : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Rules Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
        {evalResult.rules.map((rule) => (
          <div
            key={rule.id}
            className={`flex items-center gap-1.5 ${
              rule.met ? 'text-emerald-700 font-medium' : 'text-slate-500'
            }`}
          >
            {rule.met ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className={rule.met ? 'text-emerald-900' : 'text-slate-600'}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>

      {/* Invalidation Alert */}
      {password && !evalResult.isValid && evalResult.errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5 font-medium">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>{evalResult.errorMessage}</span>
        </div>
      )}
    </div>
  );
};
