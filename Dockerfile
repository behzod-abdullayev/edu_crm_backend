# Stage 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/mail/templates ./dist/mail/templates
RUN mkdir -p uploads logs && chown -R nestjs:nodejs /app
USER nestjs
EXPOSE 4001
CMD ["node", "dist/main"]
