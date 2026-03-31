FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=384"
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

# Only copy what's needed to run
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json .

# Install only production deps in runtime
RUN npm install --omit=dev --ignore-scripts

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
