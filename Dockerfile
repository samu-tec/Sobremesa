FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.10.1 --activate

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/sobremesa-logic/package.json ./packages/sobremesa-logic/
COPY apps/sobremesa-server/package.json ./apps/sobremesa-server/
COPY apps/sobremesa-client/package.json ./apps/sobremesa-client/
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY packages/sobremesa-logic ./packages/sobremesa-logic
COPY apps/sobremesa-server ./apps/sobremesa-server
COPY apps/sobremesa-client ./apps/sobremesa-client
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production HOST=0.0.0.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/sobremesa-logic/package.json ./packages/sobremesa-logic/
COPY apps/sobremesa-server/package.json ./apps/sobremesa-server/
COPY apps/sobremesa-client/package.json ./apps/sobremesa-client/
RUN pnpm install --prod --filter sobremesa-server... --frozen-lockfile
COPY --from=builder /app/packages/sobremesa-logic/dist ./packages/sobremesa-logic/dist
COPY --from=builder /app/apps/sobremesa-server/dist ./apps/sobremesa-server/dist
COPY --from=builder /app/apps/sobremesa-client/dist ./apps/sobremesa-client/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/sobremesa-server/dist/server.js"]
