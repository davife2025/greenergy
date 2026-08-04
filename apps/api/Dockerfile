# Multi-stage build for @greenenergy/api inside a pnpm + Turborepo monorepo.
# Build from the REPO ROOT: docker build -f apps/api/Dockerfile .

FROM node:20-alpine AS base
RUN corepack enable

# ---- deps: install the full workspace (needed for workspace:* packages) ----
FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile

# ---- build: compile packages/types then apps/api ----
FROM base AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/packages/types/node_modules ./packages/types/node_modules
COPY . .
RUN pnpm --filter @greenenergy/types build
RUN pnpm --filter @greenenergy/api build

# ---- runtime: slim image with only what's needed to run ----
FROM base AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/packages/types/dist ./packages/types/dist
COPY --from=build /repo/packages/types/package.json ./packages/types/package.json
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules

WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
