/**
 * Journaux du serveur (Railway) : le détail utile d'une erreur, sans données personnelles. Les adresses e-mail
 * sont masquées, les longues valeurs (photo en base64, requêtes SQL) coupées.
 */
const EMAIL = /[^\s@"'<>(),;:]+@[^\s@"'<>(),;:]+\.[a-z]{2,}/giu;
const LONG_TOKEN = /[A-Za-z0-9+/=_-]{120,}/gu;

export function redact(text: string, max = 1500) {
  const clean = text.replace(EMAIL, "<e-mail>").replace(LONG_TOKEN, "<…>");
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/** Le détail d'une erreur imprévue, prêt pour les journaux. */
export function describeError(error: unknown) {
  if (error instanceof Error) return redact(error.stack ?? `${error.name}: ${error.message}`);
  return redact(String(error));
}
