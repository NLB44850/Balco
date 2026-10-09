import { describe, expect, it } from "vitest";

import { brevoPayload, loginCodeMail, parseSender } from "../server/auth/mailer";

describe("e-mail du code de connexion", () => {
  it("lit l'expéditeur de MAIL_FROM", () => {
    expect(parseSender("Balco <bonjour@balco.app>")).toEqual({ name: "Balco", email: "bonjour@balco.app" });
    expect(parseSender('"Balco test" <moi@exemple.fr>')).toEqual({ name: "Balco test", email: "moi@exemple.fr" });
    expect(parseSender("moi@exemple.fr")).toEqual({ name: "Balco", email: "moi@exemple.fr" });
  });

  it("prépare l'envoi par l'API de Brevo", () => {
    const payload = brevoPayload("Balco <moi@exemple.fr>", "jardinier@exemple.fr", loginCodeMail("123456"));
    expect(payload.sender).toEqual({ name: "Balco", email: "moi@exemple.fr" });
    expect(payload.to).toEqual([{ email: "jardinier@exemple.fr" }]);
    expect(payload.subject).toBe("123456 est ton code Balco");
    expect(payload.textContent).toContain("123456");
    expect(payload.htmlContent).toContain("123456");
  });
});
