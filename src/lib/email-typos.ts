// ============================================================
// src/lib/email-typos.ts — shared by the landing page (live hint)
// and /api/leads (server check). No Node imports: runs in browser.
// ============================================================

// Common mistyped domains → the domain people meant.
const TYPOS: Record<string, string> = {
  'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com',
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.comm': 'gmail.com', 'gmeil.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
  'outlook.con': 'outlook.com', 'outlok.com': 'outlook.com',
  'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com',
  'qq.con': 'qq.com', '163.con': '163.com',
};

// Throw-away inbox services — a lead from these is not a real lead.
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'guerrillamail.net', 'tempmail.com', 'temp-mail.org',
  'yopmail.com', 'trashmail.com', 'getnada.com', 'dispostable.com', 'sharklasers.com', 'maildrop.cc',
  'throwawaymail.com', 'fakeinbox.com', 'mintemail.com', 'emailondeck.com', 'moakt.com', 'tempail.com',
]);

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "anna@gmail.con" → "anna@gmail.com"; null when nothing to suggest. */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  const fixed = TYPOS[domain];
  return fixed ? `${email.slice(0, at)}@${fixed}` : null;
}
