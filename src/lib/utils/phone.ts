// Converts any phone string to E.164 format (+XXXXXXXXXXX).
// Assumes Spain (+34) when no international prefix is present.
export function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, "");
  if (p.startsWith("0034")) p = "+34" + p.slice(4);
  if (!p.startsWith("+")) p = "+34" + p;
  return p;
}
