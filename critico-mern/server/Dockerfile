# Stage 1: install dependencies with dev tooling
FROM node:18-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci


# Stage 2: production image with only runtime deps
FROM node:18-slim AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV npm_config_registry=https://registry.npmjs.org/ \
    npm_config_fetch_timeout=600000 \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000
COPY . .
RUN rm -rf node_modules && npm ci --omit=dev
EXPOSE 4000
CMD ["npm", "start"]
