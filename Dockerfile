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
RUN pnpm build \
    && pnpm --filter sobremesa-server deploy --prod --frozen-lockfile /prod/sobremesa-server

FROM node:22-alpine AS runner
WORKDIR /app/apps/sobremesa-server
ENV NODE_ENV=production HOST=0.0.0.0
COPY --from=builder /prod/sobremesa-server ./
COPY --from=builder /app/apps/sobremesa-client/dist ../sobremesa-client/dist
USER node
RUN test -f dist/server.js \
    && test -f node_modules/sobremesa-logic/dist/index.js \
    && cd dist \
    && node --input-type=module -e "await import('sobremesa-logic')"
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
