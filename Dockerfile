# ---- Imagen de producción mínima para el microservicio de autenticación ----
FROM node:22-alpine AS base
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Ejecutar como usuario sin privilegios
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data && chown app:app /data
USER app

ENV PORT=3000 DB_PATH=/data/donaciones.db
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.js"]
