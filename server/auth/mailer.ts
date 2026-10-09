import nodemailer, { type Transporter } from "nodemailer";

import { ENV } from "../_core/env";

let transporter: Transporter | null = null;

function getTransporter() {
  if (!ENV.smtpUrl) return null;
  transporter ??= nodemailer.createTransport(ENV.smtpUrl);
  return transporter;
}

export class MailNotConfiguredError extends Error {
  constructor() {
    super("BREVO_API_KEY or SMTP_URL is not configured");
  }
}

export type LoginMail = { subject: string; text: string; html: string };

export function loginCodeMail(code: string): LoginMail {
  return {
    subject: `${code} est ton code Balco`,
    text: `Bonjour,\n\nVoici ton code de connexion à Balco : ${code}\n\nIl est valable 10 minutes. Si tu n'as rien demandé, ignore simplement ce message.\n\nÀ bientôt sur ton balcon !`,
    html: `<div style="font-family:system-ui,sans-serif;color:#14352B;max-width:420px">
<p>Bonjour,</p>
<p>Voici ton code de connexion à Balco :</p>
<p style="font-size:30px;font-weight:800;letter-spacing:6px;margin:18px 0">${code}</p>
<p style="color:#7D887B">Il est valable 10 minutes. Si tu n'as rien demandé, ignore simplement ce message.</p>
</div>`,
  };
}

/** « Balco <bonjour@balco.app> » → nom et adresse ; une adresse seule garde le nom Balco. */
export function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || "Balco", email: match[2].trim() };
  return { name: "Balco", email: from.trim() };
}

/** Le corps de l'appel à l'API d'envoi de Brevo (https://developers.brevo.com/reference/sendtransacemail). */
export function brevoPayload(from: string, to: string, mail: LoginMail) {
  return { sender: parseSender(from), to: [{ email: to }], subject: mail.subject, textContent: mail.text, htmlContent: mail.html };
}

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

async function sendWithBrevo(to: string, mail: LoginMail) {
  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: { "api-key": ENV.brevoApiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(brevoPayload(ENV.mailFrom, to, mail)),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    // Le détail de Brevo (clé refusée, expéditeur non validé…) dans les journaux, pas dans l'app.
    const detail = await response.text().catch(() => "");
    console.error(`[auth] Brevo refused the login mail: ${response.status} ${detail.slice(0, 300)}`);
    throw new Error(`Brevo API error ${response.status}`);
  }
}

export async function sendLoginCode(email: string, code: string) {
  const mail = loginCodeMail(code);
  if (ENV.brevoApiKey) return sendWithBrevo(email, mail);
  const transport = getTransporter();
  if (!transport) {
    // En développement uniquement : le code s'affiche dans la console du serveur.
    if (ENV.isProduction) throw new MailNotConfiguredError();
    console.info(`[auth] login code for ${email}: ${code}`);
    return;
  }
  await transport.sendMail({ from: ENV.mailFrom, to: email, ...mail });
}
