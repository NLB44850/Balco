/**
 * Applique les migrations SQL au démarrage d'un déploiement, sans dépendance de développement :
 *   DATABASE_URL=… node dist/migrate.js
 */
import "dotenv/config";
import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const connection = await mysql.createConnection(url);
try {
  await migrate(drizzle(connection), { migrationsFolder: path.resolve(process.env.MIGRATIONS_DIR ?? "drizzle") });
  console.log("[migrate] database is up to date");
} finally {
  await connection.end();
}
