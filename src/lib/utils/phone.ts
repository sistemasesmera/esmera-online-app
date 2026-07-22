// Converts any phone string to E.164 format (+XXXXXXXXXXX).
// Assumes Spain (+34) only when the number is clearly 9 digits with no country prefix.
export function normalizePhone(phone: string): string {
  // Strip spaces, dashes, dots, parentheses
  let p = phone.replace(/[\s\-().]/g, "");

  // "00XX..." → "+XX..."
  if (p.startsWith("00")) return "+" + p.slice(2);

  // Already has "+" — keep as is
  if (p.startsWith("+")) return p;

  // Pure digits from here on
  // If 11+ digits, assume the country code is already embedded (e.g. "34612345678")
  if (/^\d{11,}$/.test(p)) return "+" + p;

  // 9-digit Spanish mobile/landline — prepend +34
  return "+34" + p;
}
