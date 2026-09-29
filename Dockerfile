# Image de production Balco : l'API et l'app web dans un seul conteneur léger.
#
#   docker build -t balco .
#   docker run --env-file .env -p 3000:3000 balco
#
# Les migrations s'appliquent au démarrage ; relancer le conteneur ne refait rien.

FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
# Identifiants publics injectés dans l'app web au moment du build (facultatifs).
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=""
ENV EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
# « 1 » pour afficher la simulation météo dans l'app web (versions de test uniquement).
ARG EXPO_PUBLIC_WEATHER_SIMULATION=""
ENV EXPO_PUBLIC_WEATHER_SIMULATION=$EXPO_PUBLIC_WEATHER_SIMULATION
RUN pnpm build:standalone && pnpm build:web

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 WEB_DIR=/app/web MIGRATIONS_DIR=/app/drizzle
# Serveur compilé en un seul fichier : pas de node_modules (React Native n'a rien à faire ici).
COPY --from=build /app/dist/standalone ./server
COPY --from=build /app/dist/web ./web
COPY --from=build /app/drizzle ./drizzle
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node server/migrate.mjs && exec node server/index.mjs"]
