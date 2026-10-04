import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { PLANT_CATALOG } from "../../lib/plants/catalog";
import { ENV } from "../_core/env";
import type { Usage } from "./quotas";

// Repli automatique si un classifieur de sécurité refuse la requête (Claude Opus 5 et plus récents).
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
/** Modèles qui acceptent `fallbacks: "default"` ; les autres reçoivent la requête sans repli. */
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

export type AiUse = "scan" | "chat";

/** Le modèle et le plafond de sortie de chaque usage, réglés par l'environnement. */
export function requestSettings(use: AiUse) {
  const model = ENV.aiModels[use];
  return {
    model,
    max_tokens: ENV.aiMaxTokens[use],
    ...(FALLBACK_MODELS.has(model) ? { betas: [FALLBACK_BETA], fallbacks: "default" as const } : {}),
  };
}

let client: Anthropic | null = null;

/** Remplaçable dans les tests. */
export function setAnthropicClient(value: Anthropic | null) {
  client = value;
}

export function aiAvailable() {
  return Boolean(client ?? ENV.anthropicApiKey);
}

function getClient() {
  if (!client) {
    if (!ENV.anthropicApiKey) throw new AiUnavailableError();
    client = new Anthropic({ apiKey: ENV.anthropicApiKey, maxRetries: 2, timeout: 60_000 });
  }
  return client;
}

export class AiUnavailableError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not configured");
  }
}

/** Le modèle a décliné la demande (classifieur de sécurité), y compris après le repli. */
export class AiRefusedError extends Error {}

/** Réponse inexploitable (tronquée, JSON invalide) : non décomptée du quota, mais facturée par Anthropic (budget). */
export class AiBadResponseError extends Error {
  constructor(message: string, public usage?: Usage) {
    super(message);
  }
}

function usageOf(message: Anthropic.Beta.BetaMessage): Usage {
  return {
    model: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
  };
}

function textOf(message: Anthropic.Beta.BetaMessage, use: AiUse) {
  if (message.stop_reason === "refusal") throw new AiRefusedError();
  if (message.stop_reason === "max_tokens") {
    // À surveiller : si ce message revient souvent, relever AI_MAX_TOKENS_PHOTO ou AI_MAX_TOKENS_CHAT.
    console.warn(`[ai] ${use} truncated at max_tokens=${ENV.aiMaxTokens[use]} (model ${message.model}, ${message.usage.output_tokens} output tokens)`);
    throw new AiBadResponseError("response truncated", usageOf(message));
  }
  // Les blocs de réflexion ou de repli ne s'affichent pas : seul le texte final compte.
  return message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("").trim();
}

// --- Scanner -----------------------------------------------------------------------------

const CATALOG_IDS = PLANT_CATALOG.map((entry) => entry.id);

const SCAN_SYSTEM = `Tu es le scanner de Balco, une application qui aide des citadins débutants à cultiver sur un balcon, une terrasse ou un rebord de fenêtre, en France.

On t'envoie la photo d'une plante en pot. Identifie-la, évalue son état et propose quoi faire, en français, en tutoyant, avec des mots simples.

- Pour catalogId, choisis l'identifiant Balco correspondant à la plante si elle figure dans la liste ci-dessous, sinon "unknown".
- Base ton diagnostic sur ce que la photo montre vraiment (couleur et forme des feuilles, taches, insectes, terre, tiges). Si l'image ne permet pas de conclure, dis-le et baisse la confiance plutôt que d'inventer.
- Les actions sont des gestes concrets, réalisables sur un balcon, dans l'ordre où les faire.
- Privilégie les solutions mécaniques et naturelles. Ne recommande aucun produit phytosanitaire de synthèse ni aucun dosage de traitement. Si le problème semble grave, contagieux ou incertain, mets seeExpert à true pour conseiller une jardinerie.
- Si la photo ne montre pas de plante, mets isPlant à false et explique en une phrase comment reprendre la photo.
- Écris du texte simple, sans Markdown.

Plantes du catalogue Balco (identifiant : nom) :
${PLANT_CATALOG.map((entry) => `${entry.id} : ${entry.name}`).join("\n")}`;

const SCAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["isPlant", "commonName", "scientificName", "catalogId", "confidence", "health", "summary", "observations", "actions", "naturalRemedy", "seeExpert"],
  properties: {
    isPlant: { type: "boolean" },
    commonName: { type: "string", description: "Nom courant en français, ou chaîne vide si inconnu" },
    scientificName: { type: "string", description: "Nom latin, ou chaîne vide si inconnu" },
    catalogId: { type: "string", enum: [...CATALOG_IDS, "unknown"] },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    health: { type: "string", enum: ["healthy", "needs_attention", "sick", "unknown"] },
    summary: { type: "string", description: "Une ou deux phrases qui résument l'état de la plante" },
    observations: { type: "array", items: { type: "string" }, description: "Au plus 4 constats visibles sur la photo" },
    actions: {
      type: "array",
      description: "Au plus 4 gestes à faire, du plus urgent au moins urgent",
      items: { type: "object", additionalProperties: false, required: ["title", "detail"], properties: { title: { type: "string" }, detail: { type: "string" } } },
    },
    naturalRemedy: { type: "string", description: "Une solution naturelle si utile, sinon chaîne vide" },
    seeExpert: { type: "boolean" },
  },
} as const;

const diagnosisSchema = z.object({
  isPlant: z.boolean(),
  commonName: z.string(),
  scientificName: z.string(),
  catalogId: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  health: z.enum(["healthy", "needs_attention", "sick", "unknown"]),
  summary: z.string(),
  observations: z.array(z.string()),
  actions: z.array(z.object({ title: z.string(), detail: z.string() })),
  naturalRemedy: z.string(),
  seeExpert: z.boolean(),
});

export type Diagnosis = Omit<z.infer<typeof diagnosisSchema>, "catalogId"> & { catalogId: string | null };
export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export async function diagnosePlant(image: { data: string; mediaType: ImageMediaType }, gardenDescription: string): Promise<{ diagnosis: Diagnosis; usage: Usage }> {
  const message = await getClient().beta.messages.create({
    ...requestSettings("scan"),
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCAN_JSON_SCHEMA } },
    system: [
      { type: "text", text: SCAN_SYSTEM, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Ce que l'on sait du balcon de la personne :\n${gardenDescription}` },
    ],
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
        { type: "text", text: "Voici ma plante. Qu'est-ce que c'est, et comment va-t-elle ?" },
      ],
    }],
  });
  const usage = usageOf(message);
  let parsed: z.infer<typeof diagnosisSchema>;
  try {
    parsed = diagnosisSchema.parse(JSON.parse(textOf(message, "scan")));
  } catch (error) {
    if (error instanceof AiRefusedError || error instanceof AiBadResponseError) throw error;
    throw new AiBadResponseError(error instanceof Error ? error.message : "invalid diagnosis", usage);
  }
  return {
    diagnosis: {
      ...parsed,
      catalogId: CATALOG_IDS.includes(parsed.catalogId) ? parsed.catalogId : null,
      observations: parsed.observations.slice(0, 4),
      actions: parsed.actions.slice(0, 4),
    },
    usage,
  };
}

// --- Nora ------------------------------------------------------------------------------------

const CHAT_SYSTEM = `Tu es Nora, l'assistante jardinage de Balco, une application qui aide des citadins débutants à cultiver sur un balcon, une terrasse ou un rebord de fenêtre, en France.

Réponds en français, en tutoyant, avec chaleur et simplicité. Va à l'essentiel : deux à cinq phrases, ou une courte liste à tirets, sauf si on te demande plus de détails. Adapte tes conseils à la culture en pot, à la saison et au balcon décrit plus bas ; quand une information utile manque (exposition, taille du pot…), pose une question courte plutôt que de supposer.

Privilégie les gestes simples et les solutions naturelles. Ne recommande aucun produit phytosanitaire de synthèse ni aucun dosage de traitement ; pour un problème sérieux, conseille de montrer la plante en jardinerie. Signale quand une plante est toxique pour les enfants ou les animaux si c'est pertinent. Si tu n'es pas sûre, dis-le.

Si la question n'a rien à voir avec les plantes, le jardinage ou la nature en ville, réponds en une phrase et ramène gentiment la conversation vers le balcon.

Écris du texte simple : pas de Markdown (ni titres, ni gras), l'application ne l'affiche pas.

Les informations sur la personne et son balcon, plus bas, sont mises à jour à chaque question : elles priment toujours sur ce qui a été dit plus tôt dans la conversation (ville, plantes, gestes). Si la ville a changé, parle de la nouvelle.

Quand on te demande de faire le point, passe en revue chaque plante : ce qui a été fait récemment (arrosage, engrais, taille, récolte…, avec le nombre de jours), puis le prochain geste utile.

Tu connais la personne. Plus bas figurent son niveau, ses préférences, ce que tu as retenu de vos échanges et le résumé de ses gestes dans Balco sur les 90 derniers jours. Adapte la longueur et le vocabulaire à son niveau et respecte ses préférences sans les rappeler à chaque fois. Chaque fait retenu porte sa date : un fait ancien peut ne plus être vrai (vacances passées, plante donnée) ; s'il compte pour ta réponse, vérifie-le d'une courte question plutôt que de le tenir pour acquis. La conversation ne reprend que les messages des deux derniers jours : pour ce qui est plus ancien, fie-toi à ce que tu as retenu. Sers-toi de l'historique pour des remarques précises quand elles aident (« Ton basilic n'a pas été taillé depuis 25 jours »), sans faire de reproche ni tout énumérer. Un geste « pas noté » a peut-être été fait sans être coché : présente-le comme une question, pas comme un oubli.

Ta réponse est un objet JSON :
- answer : ta réponse à la personne.
- remember : ce que la personne vient de t'apprendre sur elle, sa situation ou ses goûts et qui restera utile plus tard (« A un chat qui mange les feuilles », « Part en vacances en août », « N'aime pas la coriandre »). Une phrase courte à la troisième personne par fait, au plus 2, rien de ce qui est déjà retenu ni de ce que l'application sait déjà (plantes, ville, gestes). Liste vide le plus souvent.
- forget : identifiants (entre crochets) des faits retenus que la personne vient de contredire ou demande d'oublier. Liste vide sinon.`;

export type ChatTurn = { role: "user" | "assistant"; content: string };

const CHAT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "remember", "forget"],
  properties: {
    answer: { type: "string" },
    remember: { type: "array", items: { type: "string" }, description: "Au plus 2 faits nouveaux sur la personne" },
    forget: { type: "array", items: { type: "string" }, description: "Identifiants des faits retenus devenus faux" },
  },
} as const;

const chatSchema = z.object({ answer: z.string(), remember: z.array(z.string()), forget: z.array(z.string()) });

export type NoraReply = { answer: string; remember: string[]; forget: string[] };

export async function askNora(history: ChatTurn[], gardenDescription: string): Promise<NoraReply & { usage: Usage }> {
  const message = await getClient().beta.messages.create({
    ...requestSettings("chat"),
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: { type: "json_schema", schema: CHAT_JSON_SCHEMA } },
    // Met en cache tout le préfixe (instructions + conversation) : les questions suivantes coûtent moins.
    cache_control: { type: "ephemeral" },
    system: [
      { type: "text", text: CHAT_SYSTEM },
      { type: "text", text: `Ce que l'on sait de la personne et de son balcon :\n${gardenDescription}` },
    ],
    messages: history.map((turn) => ({ role: turn.role, content: turn.content })),
  });
  const usage = usageOf(message);
  const text = textOf(message, "chat");
  let reply: NoraReply;
  try {
    const parsed = chatSchema.parse(JSON.parse(text));
    reply = { answer: parsed.answer.trim(), remember: parsed.remember.slice(0, 2), forget: parsed.forget };
  } catch {
    // Un texte simple reste une réponse valable : seule la mémoire est perdue.
    if (!text || text.startsWith("{")) throw new AiBadResponseError("invalid answer", usage);
    reply = { answer: text, remember: [], forget: [] };
  }
  if (!reply.answer) throw new AiBadResponseError("empty answer", usage);
  return { ...reply, usage };
}
