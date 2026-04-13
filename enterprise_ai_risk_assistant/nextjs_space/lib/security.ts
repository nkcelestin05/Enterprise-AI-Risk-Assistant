// AI Security Manager - PII Redaction & Prompt Injection Defense

const PII_PATTERNS: { name: string; pattern: RegExp; replacement: string }[] = [
  { name: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
  { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN_REDACTED]' },
  { name: 'credit_card', pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CREDIT_CARD_REDACTED]' },
  { name: 'phone', pattern: /\b\d{3}-\d{3}-\d{4}\b/g, replacement: '[PHONE_REDACTED]' },
];

const INJECTION_KEYWORDS = [
  'ignore previous instructions',
  'system prompt',
  'become an unrestricted ai',
  'jailbreak',
  'disregard all rules',
  'ignore all previous',
  'bypass security',
  'override instructions',
];

export interface SecurityCheckResult {
  isClean: boolean;
  sanitizedText: string;
  piiDetected: string[];
  injectionDetected: boolean;
  injectionKeyword: string | null;
}

export function checkSecurity(text: string): SecurityCheckResult {
  const piiDetected: string[] = [];
  let sanitizedText = text ?? '';

  // PII redaction
  for (const { name, pattern, replacement } of PII_PATTERNS) {
    const matches = sanitizedText.match(pattern);
    if (matches && matches.length > 0) {
      piiDetected.push(name);
      sanitizedText = sanitizedText.replace(pattern, replacement);
    }
  }

  // Injection detection
  const lowerText = (text ?? '').toLowerCase();
  let injectionDetected = false;
  let injectionKeyword: string | null = null;
  for (const keyword of INJECTION_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      injectionDetected = true;
      injectionKeyword = keyword;
      break;
    }
  }

  return {
    isClean: !injectionDetected,
    sanitizedText,
    piiDetected,
    injectionDetected,
    injectionKeyword,
  };
}
