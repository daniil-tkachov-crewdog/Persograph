// Fixed enumeration of "Ethical System" values shown in the Personal Info
// dropdown. The list is intentionally closed (per spec) — adding a new value
// requires editing this file. "unknown" is the default for newly created
// nodes so we never imply a judgement we haven't made yet.
export const ETHICAL_SYSTEMS = [
  { value: 'honour', label: 'Honour' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'good-will', label: 'Good Will' },
  { value: 'daily-life', label: 'Daily Life: Work and Family' },
  { value: 'unknown', label: 'Unknown' }
];

export const DEFAULT_ETHICAL_SYSTEM = 'unknown';
