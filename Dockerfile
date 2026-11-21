FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3000 \
    DATA_DIR=/app/data

WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node api ./api
COPY --chown=node:node backend ./backend
COPY --chown=node:node frontend ./frontend
COPY --chown=node:node shared ./shared
COPY --chown=node:node scripts ./scripts
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "api/server.js"]
