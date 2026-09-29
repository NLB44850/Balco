/**
 * Scanner et Nora de bout en bout côté serveur : vrai SDK Anthropic, fausse API Messages locale,
 * vraie base MySQL (ignoré sans TEST_DATABASE_URL). Aucun appel payant n'est fait.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

type Captured = { headers: http.IncomingHttpHeaders; body: Record<string, any> };
type Reply = { status?: number; body: unknown };

const requests: Captured[] = [];
let nextReplies: Reply[] = [];

function message(content: unknown[], extra: Record<string, unknown> = {}) {
  return {
    id: `msg_${Math.random().toString(36).slice(2)}`,
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    content,
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 800, cache_creation_input_tokens: 0 },
    ...extra,
  };
}

const DIAGNOSIS = {
  isPlant: true,
  commonName: "Basilic",
  scientificName: "Ocimum basilicum",
  catalogId: "basil",
  confidence: "high",
  health: "needs_attention",
  summary: "Ton basilic manque un peu d'eau.",
  observations: ["Feuilles molles", "Terre sèche", "Pas d'insecte visible", "Tiges saines", "Cinquième constat en trop"],
  actions: [{ title: "Arrose au pied", detail: "Un verre d'eau, puis vide la soucoupe." }],
  naturalRemedy: "",
  seeExpert: false,
};

const thinking = { type: "thinking", thinking: "", signature: "sig" };
const scanReply = (diagnosis: unknown = DIAGNOSIS): Reply => ({ body: message([thinking, { type: "text", text: JSON.stringify(diagnosis) }]) });

// Plus petit JPEG « valide » pour la détection : en-tête FF D8 FF.
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]).toString("base64");

describe.skipIf(!TEST_DATABASE_URL)("AI scanner and assistant (fake Messages API + MySQL)", () => {
  let server: http.Server;
  let appRouter: typeof import("../server/routers")["appRouter"];
  let claude: typeof import("../server/ai/claude");
  let db: NonNullable<Awaited<ReturnType<typeof import("../server/db")["getDb"]>>>;
  let schema: typeof import("../drizzle/schema");
  const userId = 800_000 + Math.floor(Math.random() * 90_000);
  const plusUserId = userId + 1;

  const caller = (id = userId, plan = "free") => appRouter.createCaller({
    req: { headers: {}, ip: "127.0.0.1" },
    res: { cookie: () => undefined, clearCookie: () => undefined },
    user: { id, openId: `ai-test-${id}`, name: null, email: null, loginMethod: "email", role: "user", plan, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  } as never);

  async function usedRows(id = userId) {
    const { eq } = await import("drizzle-orm");
    return db.select().from(schema.aiRequests).where(eq(schema.aiRequests.userId, id));
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.ANTHROPIC_API_KEY = "";
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        requests.push({ headers: req.headers, body: JSON.parse(raw || "{}") });
        const reply = nextReplies.shift() ?? { status: 500, body: { type: "error", error: { type: "api_error", message: "no reply queued" } } };
        res.writeHead(reply.status ?? 200, { "content-type": "application/json" });
        res.end(JSON.stringify(reply.body));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    claude = await import("../server/ai/claude");
    claude.setAnthropicClient(new Anthropic({ apiKey: "test-key", baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, maxRetries: 0 }));
    appRouter = (await import("../server/routers")).appRouter;
    schema = await import("../drizzle/schema");
    db = (await (await import("../server/db")).getDb())!;
    const { syncGarden } = await import("../server/reminders");
    await syncGarden(userId, {
      profile: { firstName: "Léa", balcony: { experience: "beginner", sunlight: "sunny", space: "balcony" } },
      location: { city: "Lyon", latitude: 45.76, longitude: 4.84, timezone: "Europe/Paris" },
      plants: [{ id: "basil-1", catalogId: "basil", nickname: "Basilic cuisine", addedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      events: [{ id: "e1", plantId: "basil-1", type: "watering", completedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(), source: "daily_task" }],
      deletedEventIds: [],
    });
  });

  beforeEach(() => {
    requests.length = 0;
    nextReplies = [];
  });

  afterAll(async () => {
    const { inArray } = await import("drizzle-orm");
    for (const table of [schema.aiRequests, schema.reminderPlants, schema.maintenanceEvents, schema.reminderProfiles, schema.noraMemories]) {
      await db.delete(table).where(inArray(table.userId, [userId, plusUserId]));
    }
    claude.setAnthropicClient(null);
    server.close();
  });

  describe("scanner", () => {
    it("sends the photo with the garden context and returns a checked diagnosis", async () => {
      nextReplies = [scanReply()];
      const result = await caller().ai.diagnose({ imageBase64: JPEG });

      expect(result.diagnosis).toMatchObject({ commonName: "Basilic", catalogId: "basil", health: "needs_attention" });
      expect(result.diagnosis.observations).toHaveLength(4);
      expect(result.quota).toMatchObject({ kind: "scan", used: 1, limit: 3, remaining: 2 });

      const [{ headers, body }] = requests;
      expect(headers["anthropic-beta"]).toContain("server-side-fallback-2026-07-01");
      expect(body).toMatchObject({ model: "claude-opus-5", fallbacks: "default", thinking: { type: "adaptive" } });
      expect(body.output_config.format).toMatchObject({ type: "json_schema" });
      expect(body.output_config.format.schema.properties.catalogId.enum).toContain("basil");
      const image = body.messages[0].content[0];
      expect(image).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/jpeg" } });
      const context = body.system.map((block: { text: string }) => block.text).join("\n");
      expect(context).toContain("Basilic cuisine");
      expect(context).toContain("Lyon");
      expect(context).toContain("exposition soleil");
      expect(body.system[0].cache_control).toEqual({ type: "ephemeral" });

      const [row] = await usedRows();
      expect(row).toMatchObject({ kind: "scan", status: "ok", inputTokens: 1200, outputTokens: 300, cacheReadTokens: 800, model: "claude-opus-5" });
    });

    it("maps an identification outside the catalog to no plant", async () => {
      nextReplies = [scanReply({ ...DIAGNOSIS, catalogId: "unknown", commonName: "Monstera" })];
      const { diagnosis } = await caller(plusUserId, "plus").ai.diagnose({ imageBase64: JPEG });
      expect(diagnosis.catalogId).toBeNull();
    });

    it("rejects files that are not images before calling the model", async () => {
      await expect(caller().ai.diagnose({ imageBase64: Buffer.from("%PDF-1.7 not an image at all, clearly".repeat(5)).toString("base64") })).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(requests).toHaveLength(0);
    });

    it("does not charge the user for a refusal, an outage or a broken answer", async () => {
      const before = (await usedRows()).filter((row) => row.status === "ok").length;
      nextReplies = [{ body: message([], { stop_reason: "refusal", stop_details: { type: "refusal", category: null, explanation: null } }) }];
      await expect(caller().ai.diagnose({ imageBase64: JPEG })).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("Je ne peux pas analyser") });
      nextReplies = [{ status: 529, body: { type: "error", error: { type: "overloaded_error", message: "Overloaded" } } }];
      await expect(caller().ai.diagnose({ imageBase64: JPEG })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: expect.stringContaining("pas décomptée") });
      nextReplies = [{ body: message([{ type: "text", text: "{pas du json" }]) }];
      await expect(caller().ai.diagnose({ imageBase64: JPEG })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
      nextReplies = [{ body: message([{ type: "text", text: "{\"isPlant\": tr" }], { stop_reason: "max_tokens" }) }];
      await expect(caller().ai.diagnose({ imageBase64: JPEG })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await usedRows();
      expect(rows.filter((row) => row.status === "ok")).toHaveLength(before);
      expect(rows.map((row) => row.status)).toEqual(expect.arrayContaining(["refused", "error"]));
      expect((await caller().ai.status()).scan.used).toBe(before);
    });

    it("stops at the free quota, even with simultaneous requests on the last slot", async () => {
      nextReplies = [scanReply(), scanReply(), scanReply()];
      // 1 analyse déjà faite : il reste 2 places, 3 requêtes arrivent en même temps.
      const results = await Promise.allSettled([caller().ai.diagnose({ imageBase64: JPEG }), caller().ai.diagnose({ imageBase64: JPEG }), caller().ai.diagnose({ imageBase64: JPEG })]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
      const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
      expect(rejected.reason).toMatchObject({ code: "TOO_MANY_REQUESTS", message: expect.stringContaining("tes 3 analyses offertes") });
      expect((await caller().ai.status()).scan).toMatchObject({ used: 3, remaining: 0 });
      await expect(caller().ai.diagnose({ imageBase64: JPEG })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    });
  });

  describe("Nora", () => {
    it("answers with the text only, keeps recent turns and caches the prefix", async () => {
      nextReplies = [{ body: message([thinking, { type: "text", text: "Arrose ton basilic le matin, au pied." }]) }];
      const history = Array.from({ length: 15 }, (_, index) => ({ role: index % 2 === 0 ? "user" : "assistant", content: `message ${index}` })) as Array<{ role: "user" | "assistant"; content: string }>;
      const result = await caller().ai.ask({ messages: history });

      expect(result.answer).toBe("Arrose ton basilic le matin, au pied.");
      expect(result.quota).toMatchObject({ kind: "chat", used: 1, limit: 15 });
      const { body } = requests[0];
      expect(body.messages.length).toBeLessThanOrEqual(12);
      expect(body.messages[0].role).toBe("user");
      expect(body.messages.at(-1)).toEqual({ role: "user", content: "message 14" });
      expect(body).toMatchObject({ cache_control: { type: "ephemeral" }, output_config: { effort: "low" }, fallbacks: "default" });
      expect(body.system[1].text).toContain("Léa");
    });

    it("remembers what the person tells, and forgets it on request or when contradicted", async () => {
      const noraReply = (reply: object): Reply => ({ body: message([thinking, { type: "text", text: JSON.stringify({ remember: [], forget: [], ...reply }) }]) });
      expect(await caller().ai.memory()).toEqual({ level: "beginner", preferences: [], notes: [] });

      nextReplies = [noraReply({ answer: "Attention, la menthe plaît aux chats !", remember: ["A un chat qui grignote les feuilles."] })];
      const first = await caller().ai.ask({ messages: [{ role: "user", content: "Mon chat mange mes plantes" }] });
      expect(first.answer).toBe("Attention, la menthe plaît aux chats !");
      expect(first.remembered).toMatchObject([{ text: "A un chat qui grignote les feuilles" }]);
      expect(requests[0].body.output_config.format.schema.required).toEqual(["answer", "remember", "forget"]);
      const noteId = first.remembered[0].id;

      nextReplies = [noraReply({ answer: "D'accord, c'est noté.", forget: [noteId, "inconnu"] })];
      const second = await caller().ai.ask({ messages: [{ role: "user", content: "En fait je n'ai plus de chat" }] });
      const context = requests[1].body.system.map((block: { text: string }) => block.text).join("\n");
      expect(context).toContain(`[${noteId}] A un chat qui grignote les feuilles`);
      expect(context).toContain("débute");
      expect(context).toContain("arrosage 1 fois, dernière fois il y a 2 j");
      expect(second.forgotten).toMatchObject([{ id: noteId }]);
      expect(second.remembered).toEqual([]);
      expect((await caller().ai.memory()).notes).toEqual([]);
    });

    it("follows the experience from settings, saves preferences, and erases what Nora learned", async () => {
      const { syncGarden } = await import("../server/reminders");
      await syncGarden(userId, { profile: { balcony: { experience: "experienced", sunlight: "sunny", space: "balcony" } }, plants: [], events: [], deletedEventIds: [] });
      const updated = await caller().ai.updateMemory({ preferences: ["pets", "short"] });
      expect(updated).toMatchObject({ level: "experienced", preferences: ["pets", "short"] });
      await expect(caller().ai.updateMemory({ preferences: ["not-a-preference"] })).rejects.toMatchObject({ code: "BAD_REQUEST" });

      nextReplies = [{ body: message([{ type: "text", text: JSON.stringify({ answer: "Noté.", remember: ["Part en vacances en août", "Aime les tomates anciennes"], forget: [] }) }]) }];
      await caller().ai.ask({ messages: [{ role: "user", content: "Je pars en août et j'adore les tomates anciennes" }] });
      const context = requests[0].body.system[1].text as string;
      expect(context).toContain("expérience");
      expect(context).toContain("animal de compagnie");
      const notes = (await caller().ai.memory()).notes;
      expect(notes).toHaveLength(2);

      expect((await caller().ai.forget({ noteId: notes[0].id })).notes.map((note) => note.text)).toEqual(["Aime les tomates anciennes"]);
      const cleared = await caller().ai.forget({});
      expect(cleared).toEqual({ level: "experienced", preferences: ["pets", "short"], notes: [] });
    });

    it("refuses a conversation that does not end with a question", async () => {
      await expect(caller().ai.ask({ messages: [{ role: "user", content: "Bonjour" }, { role: "assistant", content: "Salut" }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(requests).toHaveLength(0);
    });

    it("gives Balco+ members a larger allowance", async () => {
      const status = await caller(plusUserId, "plus").ai.status();
      expect(status.plan).toBe("plus");
      expect(status.chat.limit).toBe(300);
      expect(status.scan.limit).toBe(40);
    });
  });

  it("never grants more (or fewer) reservations than the quota under real concurrency", async () => {
    const quotas = await import("../server/ai/quotas");
    const { inArray } = await import("drizzle-orm");
    const ids = [userId + 10, userId + 11, userId + 12];
    try {
      for (const id of ids) {
        const results = await Promise.allSettled(Array.from({ length: 12 }, () => quotas.reserve(id, "free", "scan")));
        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(3);
      }
    } finally {
      await db.delete(schema.aiRequests).where(inArray(schema.aiRequests.userId, ids));
    }
  });

  it("reports the service as unavailable without an API key", async () => {
    claude.setAnthropicClient(null);
    try {
      expect((await caller().ai.status()).available).toBe(false);
      await expect(caller().ai.ask({ messages: [{ role: "user", content: "Bonjour" }] })).rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: "Nora n’est pas encore disponible." });
    } finally {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      claude.setAnthropicClient(new Anthropic({ apiKey: "test-key", baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, maxRetries: 0 }));
    }
  });
});
