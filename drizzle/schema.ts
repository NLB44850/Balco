import { int, mysqlTable, text, timestamp, varchar, double, uniqueIndex, index } from "drizzle-orm/mysql-core";

/** Core user table backing auth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Moyens de connexion d'un compte : une adresse e-mail, un identifiant Apple, un identifiant Google.
 * Un même compte peut en avoir plusieurs (par exemple e-mail + Apple avec la même adresse vérifiée).
 */
export const authIdentities = mysqlTable("auth_identities", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 16 }).notNull(),
  /** Adresse e-mail normalisée, ou identifiant stable (« sub ») chez Apple et Google. */
  subject: varchar("subject", { length: 320 }).notNull(),
  email: varchar("email", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
}, (table) => ({ providerSubjectUnique: uniqueIndex("auth_identities_provider_subject_unique").on(table.provider, table.subject), userIndex: index("auth_identities_user_index").on(table.userId) }));

/** Codes à usage unique envoyés par e-mail. Seule leur empreinte est stockée. */
export const loginCodes = mysqlTable("login_codes", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  codeHash: varchar("codeHash", { length: 64 }).notNull(),
  attempts: int("attempts").default(0).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ emailIndex: index("login_codes_email_index").on(table.email, table.createdAt) }));

export const reminderProfiles = mysqlTable("reminder_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  enabled: int("enabled").default(0).notNull(),
  city: varchar("city", { length: 128 }).notNull().default("Paris"),
  latitude: double("latitude").notNull().default(48.8566),
  longitude: double("longitude").notNull().default(2.3522),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/Paris"),
  /** Nul tant que l'appareil n'a pas envoyé de vraie position : pas de rappel météo sur la ville par défaut. */
  locationUpdatedAt: timestamp("locationUpdatedAt"),
  preferredHour: int("preferredHour").default(18).notNull(),
  preferredMinute: int("preferredMinute").default(30).notNull(),
  quietStartHour: int("quietStartHour").default(21).notNull(),
  quietEndHour: int("quietEndHour").default(9).notNull(),
  skipWateringWhenRainExpected: int("skipWateringWhenRainExpected").default(1).notNull(),
  maxNormalRemindersPerDay: int("maxNormalRemindersPerDay").default(1).notNull(),
  enabledPlantIds: text("enabledPlantIds"),
  firstName: varchar("firstName", { length: 64 }),
  /** Réponses d'onboarding (exposition, espace, objectifs) en JSON. */
  balconyJson: text("balconyJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userUnique: uniqueIndex("reminder_profiles_user_unique").on(table.userId) }));

export const reminderPlants = mysqlTable("reminder_plants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plantId: varchar("plantId", { length: 128 }).notNull(),
  displayName: varchar("displayName", { length: 128 }).notNull(),
  profileJson: text("profileJson").notNull(),
  active: int("active").default(1).notNull(),
  catalogId: varchar("catalogId", { length: 64 }),
  nickname: varchar("nickname", { length: 128 }),
  addedAt: timestamp("addedAt"),
  removedAt: timestamp("removedAt"),
  /** Horodatage de la dernière modification côté appareil : la plus récente gagne. */
  clientUpdatedAt: timestamp("clientUpdatedAt", { fsp: 3 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userPlantUnique: uniqueIndex("reminder_plants_user_plant_unique").on(table.userId, table.plantId), userIndex: index("reminder_plants_user_index").on(table.userId) }));

export const maintenanceEvents = mysqlTable("maintenance_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventId: varchar("eventId", { length: 128 }).notNull(),
  plantId: varchar("plantId", { length: 128 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  completedAt: timestamp("completedAt").notNull(),
  source: varchar("source", { length: 32 }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ eventUnique: uniqueIndex("maintenance_events_user_event_unique").on(table.userId, table.eventId), userDateIndex: index("maintenance_events_user_date_index").on(table.userId, table.completedAt) }));

export const reminderDecisions = mysqlTable("reminder_decisions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  decisionKey: varchar("decisionKey", { length: 255 }).notNull(),
  plantId: varchar("plantId", { length: 128 }).notNull(),
  taskType: varchar("taskType", { length: 32 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  priority: varchar("priority", { length: 32 }).notNull(),
  payload: text("payload").notNull(),
  validUntil: timestamp("validUntil").notNull(),
  weatherFetchedAt: timestamp("weatherFetchedAt").notNull(),
  scheduledFor: timestamp("scheduledFor"),
  sentAt: timestamp("sentAt"),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ decisionUnique: uniqueIndex("reminder_decisions_user_key_unique").on(table.userId, table.decisionKey), userStatusIndex: index("reminder_decisions_user_status_index").on(table.userId, table.status) }));

export const devicePushTokens = mysqlTable("device_push_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 16 }).notNull(),
  active: int("active").default(1).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ tokenUnique: uniqueIndex("device_push_tokens_token_unique").on(table.token), userIndex: index("device_push_tokens_user_index").on(table.userId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ReminderProfile = typeof reminderProfiles.$inferSelect;
export type ReminderPlant = typeof reminderPlants.$inferSelect;
export type MaintenanceEvent = typeof maintenanceEvents.$inferSelect;
export type ReminderDecisionRow = typeof reminderDecisions.$inferSelect;
export type DevicePushToken = typeof devicePushTokens.$inferSelect;
export type AuthIdentity = typeof authIdentities.$inferSelect;
