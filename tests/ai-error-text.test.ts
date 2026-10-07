import { describe, expect, it } from "vitest";

import { aiErrorText, isConnectionLost, NORA_CONNECTION_LOST, noticeText, OLD_CONNECTION_LOST, SCAN_CONNECTION_LOST } from "../lib/ai/error-text";

describe("erreurs de Nora et d'Observer en mots simples", () => {
  it("garde le message du serveur, remplace celui du navigateur", () => {
    const quota = "Tu as utilisé tes 5 questions ce mois-ci.";
    expect(aiErrorText({ message: quota, data: { code: "TOO_MANY_REQUESTS" } })).toBe(quota);
    // Réponse vide du Codespace (serveur qui redémarre, délai dépassé) : pas de données tRPC.
    expect(aiErrorText({ message: "Failed to execute 'json' on 'Response': Unexpected end of JSON input" })).toBe(NORA_CONNECTION_LOST);
    expect(aiErrorText({ message: "Failed to fetch" }, SCAN_CONNECTION_LOST)).toBe(SCAN_CONNECTION_LOST);
    expect(aiErrorText({ message: "Unexpected token '<'", data: { code: "INTERNAL_SERVER_ERROR" } })).toBe(NORA_CONNECTION_LOST);
    // Seule une connexion coupée se redemande en silence ; une erreur du serveur s'affiche tout de suite.
    expect(isConnectionLost({ message: "Failed to fetch" })).toBe(true);
    expect(isConnectionLost({ message: quota, data: { code: "TOO_MANY_REQUESTS" } })).toBe(false);
  });

  it("réécrit une ancienne notice technique déjà enregistrée", () => {
    expect(noticeText("Failed to execute 'json' on 'Response': Unexpected end of JSON input")).toBe(OLD_CONNECTION_LOST);
    expect(noticeText("Nora n’est pas encore disponible.")).toBe("Nora n’est pas encore disponible.");
  });
});
