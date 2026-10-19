import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { privacyPageHtml } from "../server/privacy-page";
import { PRIVACY_CONTACT, PRIVACY_PATH, PRIVACY_SECTIONS } from "../shared/privacy";

describe("politique de confidentialité", () => {
  it("dit chaque service qui reçoit des données, et comment tout supprimer", () => {
    const text = JSON.stringify(PRIVACY_SECTIONS);
    for (const provider of ["Railway", "Anthropic", "Open-Meteo", "Brevo", "Expo", "Google", "Apple"]) expect(text).toContain(provider);
    expect(text).toContain("Supprimer mon compte");
    expect(text).toContain("CNIL");
    expect(text).toContain(PRIVACY_CONTACT);
  });

  it("la page web échappe le texte et met l'adresse de contact en lien", () => {
    const html = privacyPageHtml();
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain(`<a href="mailto:${PRIVACY_CONTACT}">`);
    expect(html).toContain("« Me prévenir à l’ouverture »");
    expect(html).not.toContain("<script");
  });

  describe("sur le serveur", () => {
    let server: Server;
    let base = "";
    beforeAll(async () => {
      const { createApp } = await import("../server/_core/index");
      server = createServer(createApp().app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

    it(`répond en page publique sur ${PRIVACY_PATH}`, async () => {
      const response = await fetch(`${base}${PRIVACY_PATH}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toContain("<h1>Confidentialité</h1>");
    });
  });
});
