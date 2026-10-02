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
    super("SMTP_URL is not configured");
  }
}

export async function sendLoginCode(email: string, code: string) {
  const transport = getTransporter();
  if (!transport) {
    // En développement uniquement : le code s'affiche dans la console du serveur.
    if (ENV.isProduction) throw new MailNotConfiguredError();
    console.info(`[auth] login code for ${email}: ${code}`);
    return;
  }
  await transport.sendMail({
    from: ENV.mailFrom,
    to: email,
    subject: `${code} est ton code Balco`,
    text: `Bonjour,\n\nVoici ton code de connexion à Balco : ${code}\n\nIl est valable 10 minutes. Si tu n'as rien demandé, ignore simplement ce message.\n\nÀ bientôt sur ton balcon !`,
    html: `<div style="font-family:system-ui,sans-serif;color:#14352B;max-width:420px">
<p>Bonjour,</p>
<p>Voici ton code de connexion à Balco :</p>
<p style="font-size:30px;font-weight:800;letter-spacing:6px;margin:18px 0">${code}</p>
<p style="color:#7D887B">Il est valable 10 minutes. Si tu n'as rien demandé, ignore simplement ce message.</p>
</div>`,
  });
}
