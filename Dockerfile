FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.10.1 --activate

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/game-logic/package.json ./packages/game-logic/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY packages/game-logic ./packages/game-logic
COPY apps/server ./apps/server
COPY apps/client ./apps/client
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/game-logic/package.json ./packages/game-logic/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/
RUN pnpm install --prod --filter games-server... --frozen-lockfile
COPY --from=builder /app/packages/game-logic/dist ./packages/game-logic/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/client/dist ./apps/client/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/server/dist/server.js"]
