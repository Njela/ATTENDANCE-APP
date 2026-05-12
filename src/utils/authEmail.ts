/**
 * Legacy synthetic auth email (Supabase often rejects reserved / internal TLDs).
 * Kept only for accounts created before we switched to real contact email for Auth.
 */
export function studentIdToAuthEmail(studentId: string): string {
  const raw = studentId.trim().toLowerCase();
  const slug = raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'student';
  return `${slug}@attendtrack.internal`;
}
