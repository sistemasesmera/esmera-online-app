export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").replace(/^(\+34|0034)/, "");
}
