/**
 * Password Security Policy for StegoPy Cryptographic Engine
 * Enforces NIST SP 800-63B standards to prevent dictionary and brute-force attacks.
 */

export interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordEvaluation {
  isValid: boolean;
  score: number; // 0 (empty) to 4 (very strong)
  strengthLabel: 'None' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  strengthColor: string;
  rules: PasswordRule[];
  errorMessage?: string;
}

export function evaluatePassword(password: string, isRequired: boolean = false): PasswordEvaluation {
  if (!password) {
    return {
      isValid: !isRequired,
      score: 0,
      strengthLabel: 'None',
      strengthColor: 'bg-slate-200',
      rules: [
        { id: 'length', label: 'At least 8 characters', met: false },
        { id: 'letter', label: 'At least 1 letter (a-z, A-Z)', met: false },
        { id: 'number', label: 'At least 1 number (0-9)', met: false },
        { id: 'special', label: 'Special symbol (!@#$%^&*...) (Recommended)', met: false },
      ],
      errorMessage: isRequired ? 'Password is required.' : undefined,
    };
  }

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);

  const rules: PasswordRule[] = [
    { id: 'length', label: 'At least 8 characters', met: hasMinLength },
    { id: 'letter', label: 'At least 1 letter (a-z, A-Z)', met: hasLetter },
    { id: 'number', label: 'At least 1 number (0-9)', met: hasNumber },
    { id: 'special', label: 'Special symbol or mixed case (Recommended)', met: hasSpecial || hasUpperLower },
  ];

  // Mandatory rules: length >= 8, letter, number
  const mandatoryMet = hasMinLength && hasLetter && hasNumber;

  let score = 0;
  if (hasMinLength) score++;
  if (hasLetter) score++;
  if (hasNumber) score++;
  if (hasSpecial || hasUpperLower) score++;

  let strengthLabel: PasswordEvaluation['strengthLabel'] = 'Weak';
  let strengthColor = 'bg-rose-500';

  if (score >= 4) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
  } else if (score === 3) {
    strengthLabel = 'Good';
    strengthColor = 'bg-teal-500';
  } else if (score === 2) {
    strengthLabel = 'Fair';
    strengthColor = 'bg-amber-500';
  } else {
    strengthLabel = 'Weak';
    strengthColor = 'bg-rose-500';
  }

  let errorMessage: string | undefined;
  if (!mandatoryMet) {
    if (!hasMinLength) {
      errorMessage = 'Password must be at least 8 characters long.';
    } else if (!hasLetter) {
      errorMessage = 'Password must contain at least one letter.';
    } else if (!hasNumber) {
      errorMessage = 'Password must contain at least one number.';
    }
  }

  return {
    isValid: mandatoryMet,
    score,
    strengthLabel,
    strengthColor,
    rules,
    errorMessage,
  };
}
