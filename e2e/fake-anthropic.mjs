/**
 * Faux service d'IA pour les tests de bout en bout : répond à POST /v1/messages par une analyse de
 * plante toujours identique (basilic à surveiller), ou, pour une question à Nora, par une réponse toujours
 * identique. Aucune donnée ne sort de la machine.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_ANTHROPIC_PORT ?? 3199);
const DIAGNOSIS = {
  isPlant: true,
  commonName: "Basilic",
  scientificName: "Ocimum basilicum",
  catalogId: "basil",
  confidence: "high",
  health: "needs_attention",
  summary: "Les feuilles du bas jaunissent : la terre reste trop humide.",
  observations: ["Feuilles basses jaunes"],
  actions: [{ title: "Laisse sécher la terre", detail: "Attends qu'elle soit sèche sur 2 cm avant d'arroser." }],
  naturalRemedy: "",
  seeExpert: false,
};

const NORA_REPLY = { answer: "Réponse de Nora : ta plante va bien, arrose quand la terre est sèche.", remember: [], forget: [] };

createServer((req, res) => {
  if (req.method === "GET") return res.end("ok");
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    // Nora reçoit la description du balcon dans ses instructions ; Observer, une photo.
    const chat = raw.includes("Ce que l'on sait de la personne");
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      id: "msg_e2e", type: "message", role: "assistant", model: "fake-e2e",
      content: [{ type: "text", text: JSON.stringify(chat ? NORA_REPLY : DIAGNOSIS) }],
      stop_reason: "end_turn", stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    }));
  });
}).listen(PORT);
