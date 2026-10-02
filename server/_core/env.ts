function list(value: string | undefined) {
  return (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function intEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export const ENV = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  /** Secret de signature des sessions (32 caractères minimum en production). */
  cookieSecret: process.env.JWT_SECRET ?? "",
  /** Shared secret expected in the `Authorization: Bearer` header of /api/scheduled/* calls. */
  cronSecret: process.env.CRON_SECRET ?? "",
  /** Origines web autorisées à appeler l'API avec des cookies (en plus de la même origine). */
  corsOrigins: list(process.env.CORS_ORIGINS),
  /** smtp(s)://utilisateur:motdepasse@hote:port — Brevo, OVH, Gmail, Mailjet… */
  smtpUrl: process.env.SMTP_URL ?? "",
  mailFrom: process.env.MAIL_FROM ?? "Balco <bonjour@balco.app>",
  /** Identifiants de bundle iOS acceptés dans les jetons « Sign in with Apple ». */
  appleAudiences: list(process.env.APPLE_AUDIENCES),
  appleJwksUrl: process.env.APPLE_JWKS_URL || "https://appleid.apple.com/auth/keys",
  /** Client IDs OAuth Google (iOS, Android, web) acceptés dans les jetons Google. */
  googleClientIds: list(process.env.GOOGLE_CLIENT_IDS),
  googleJwksUrl: process.env.GOOGLE_JWKS_URL || "https://www.googleapis.com/oauth2/v3/certs",
  /** Clé de l'API Claude : sans elle, le scanner et Nora s'affichent comme indisponibles. */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  /**
   * Un modèle par usage : le diagnostic photo garde le plus précis, Nora un modèle moins cher.
   * BALCO_AI_MODEL reste le repli commun quand la variable propre à l'usage est vide.
   */
  aiModels: {
    scan: process.env.BALCO_AI_MODEL_PHOTO || process.env.BALCO_AI_MODEL || "claude-opus-5",
    chat: process.env.BALCO_AI_MODEL_CHAT || process.env.BALCO_AI_MODEL || "claude-sonnet-5",
  },
  /** Plafond de jetons de sortie (réflexion comprise) : une réponse coupée n'est pas décomptée. */
  aiMaxTokens: { scan: intEnv("AI_MAX_TOKENS_PHOTO", 2000), chat: intEnv("AI_MAX_TOKENS_CHAT", 1500) },
  aiQuotas: {
    free: { scan: intEnv("AI_FREE_SCANS_PER_MONTH", 3), chat: intEnv("AI_FREE_QUESTIONS_PER_MONTH", 15) },
    plus: { scan: intEnv("AI_PLUS_SCANS_PER_MONTH", 40), chat: intEnv("AI_PLUS_QUESTIONS_PER_MONTH", 300) },
  },
  /** Dossier de l'export web (`expo export -p web`), servi par l'API s'il existe. */
  webDir: process.env.WEB_DIR ?? "dist/web",
};

/** Arrête le démarrage plutôt que de tourner avec une configuration dangereuse. */
export function assertProductionConfig() {
  if (!ENV.isProduction) return;
  const problems: string[] = [];
  if (ENV.cookieSecret.length < 32) problems.push("JWT_SECRET must be at least 32 characters");
  if (!ENV.databaseUrl) problems.push("DATABASE_URL is required");
  if (!ENV.smtpUrl) problems.push("SMTP_URL is required to send login codes");
  if (problems.length > 0) throw new Error(`Invalid production configuration:\n- ${problems.join("\n- ")}`);
}
