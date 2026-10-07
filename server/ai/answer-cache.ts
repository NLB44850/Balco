/**
 * Les réponses de Nora gardées quelques minutes, par compte et par identifiant de question (`requestId`, tiré
 * par l'app). Quand le transfert de port du Codespace coupe la réponse alors que le serveur a bien répondu,
 * l'app renvoie la même question avec le même identifiant : elle reçoit la réponse déjà faite (ou attend celle
 * en cours), sans seconde question décomptée ni facturée. En mémoire : un seul serveur aujourd'hui.
 */
const TTL_MS = 15 * 60_000;
const MAX_ENTRIES = 2_000;

type Entry = { at: number; promise: Promise<unknown> };
const entries = new Map<string, Entry>();

const keyOf = (userId: number, requestId: string) => `${userId}:${requestId}`;

function prune(now: number) {
  for (const [key, entry] of entries) {
    if (now - entry.at > TTL_MS || entries.size > MAX_ENTRIES) entries.delete(key);
    else break; // Rangées par ancienneté : la suite est plus récente.
  }
}

/** La réponse à cette question : celle déjà faite, celle en cours, ou une nouvelle. Un échec n'est pas gardé. */
export function answerOnce<T>(userId: number, requestId: string | undefined, run: () => Promise<T>, now = Date.now()): Promise<T> {
  if (!requestId) return run();
  prune(now);
  const key = keyOf(userId, requestId);
  const existing = entries.get(key);
  if (existing) return existing.promise as Promise<T>;
  const promise = run();
  entries.set(key, { at: now, promise });
  promise.catch(() => entries.delete(key));
  return promise;
}

/** Pour les tests. */
export function clearAnswerCache() {
  entries.clear();
}
