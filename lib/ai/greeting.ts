/**
 * Les premiers mots de Nora, écrits par l'app (sans IA, sans compte, sans décompter de question). Sans
 * prénom connu, elle le demande une fois : « Comment je t'appelle ? ». Logique pure.
 */
export type GreetingLine = { id: string; text: string };

export type Greeting = { lines: GreetingLine[]; askName: boolean };

/** Gardé quand on répond « Plus tard » : Nora ne redemande pas le prénom. */
export const NAME_ASKED_STORAGE_KEY = "balco.nora.name-asked.v1";

export function noraGreeting({ firstName, nameAsked, signedIn, justNamed = false }: { firstName?: string | null; nameAsked: boolean; signedIn: boolean; justNamed?: boolean }): Greeting {
  const name = firstName?.trim();
  const lines: GreetingLine[] = [{ id: "welcome", text: `Bonjour${name ? ` ${name}` : ""} ! Je suis Nora, ta coach pour un balcon vivant et facile à entretenir.` }];
  if (name && justNamed) lines.push({ id: "named", text: `Enchantée, ${name} ! Tu pourras changer ton prénom dans Réglages.` });
  const askName = !name && !nameAsked;
  if (askName) lines.push({ id: "ask-name", text: "Comment je t’appelle ?" });
  lines.push({
    id: "prompt",
    text: signedIn
      ? "Pose-moi une question sur tes plantes, ton exposition ou la saison : je connais ton balcon 🌿"
      : "Connecte-toi pour me poser tes questions : je réponds en tenant compte de tes plantes et de ta ville 🌿",
  });
  return { lines, askName };
}
