FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo workspace definition and package manifests
COPY pnpm-workspace.yaml package.json ./
COPY packages/game-logic/package.json ./packages/game-logic/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

# Install dependencies
RUN pnpm install

# Copy complete project source
COPY . .

# Build packages and applications
RUN pnpm --filter @games/game-logic build
RUN pnpm --filter games-server build
RUN pnpm --filter games-client build

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package descriptors
COPY pnpm-workspace.yaml package.json ./
COPY packages/game-logic/package.json ./packages/game-logic/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

# Install production dependencies
RUN pnpm install --prod

# Copy built code from builder
COPY --from=builder /app/packages/game-logic/dist ./packages/game-logic/dist
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/client/dist ./apps/client/dist

EXPOSE 3000

CMD ["node", "apps/server/dist/server.js"]
