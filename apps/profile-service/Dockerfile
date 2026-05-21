FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/profile-service/ ./apps/profile-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @meetup/profile-service run prisma:generate
RUN pnpm turbo run build --filter=@meetup/profile-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/profile-service/dist ./dist
COPY --from=builder /app/apps/profile-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/main"]
