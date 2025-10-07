FROM node:18-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:18-slim AS prod
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
ENV PORT=5173
EXPOSE 5173
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT}"]
