/** Tour de l'appli, étape 2 : verrous du serveur (erreurs, en-têtes, taille des requêtes). */
import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";
import { TRPCError } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { redact } from "../server/_core/log";
import { INTERNAL_ERROR_MESSAGE, isUnexpectedError, publicProcedure, router } from "../server/_core/trpc";

const testRouter = router({
  boom: publicProcedure.query(() => {
    throw new Error("Failed query: select * from users where email = ? params: lea@example.test");
  }),
  outage: publicProcedure.query(() => {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Nora ne peut pas répondre pour l’instant." });
  }),
});

let server: Server;
let base = "";
const logged: string[] = [];

beforeAll(async () => {
  const app = express();
  app.use("/trpc", createExpressMiddleware({ router: testRouter, createContext: () => ({}) as never, onError: ({ error }) => { if (isUnexpectedError(error)) logged.push(redact(String(error.cause?.message))); } }));
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("erreurs du serveur", () => {
  it("une erreur imprévue : message neutre pour l'app, sans pile ; le détail masqué dans les journaux", async () => {
    const body = JSON.stringify(await (await fetch(`${base}/trpc/boom`)).json());
    expect(body).toContain(INTERNAL_ERROR_MESSAGE);
    expect(body).not.toContain("lea@example.test");
    expect(body).not.toContain("Failed query");
    expect(body).not.toContain("\"stack\"");
    expect(logged.at(-1)).toBe("Failed query: select * from users where email = ? params: <e-mail>");
  });

  it("un message prévu pour la personne passe tel quel", async () => {
    const body = JSON.stringify(await (await fetch(`${base}/trpc/outage`)).json());
    expect(body).toContain("Nora ne peut pas répondre pour l’instant.");
  });

  it("redact coupe les longues valeurs", () => {
    expect(redact(`photo ${"A".repeat(300)} fin`)).toBe("photo <…> fin");
    expect(redact("x".repeat(20), 5)).toBe("xxxxx…");
  });
});

describe("taille des requêtes", () => {
  it("seules les analyses de photo ont droit à 8 Mo", async () => {
    const { isPhotoRequest } = await import("../server/_core/index");
    expect(isPhotoRequest("/api/trpc/ai.diagnose")).toBe(true);
    expect(isPhotoRequest("/api/trpc/ai.diagnoseGuest")).toBe(true);
    expect(isPhotoRequest("/api/trpc/reminders.sync")).toBe(false);
    expect(isPhotoRequest("/api/trpc/reminders.sync,ai.ask")).toBe(false);
  });
});
