# Build context is the REPO ROOT; this file lives in deploy/.
# CI (GitHub Actions) does this for you; do not build on the 1 GB server.
#   docker buildx build -f deploy/Dockerfile --platform linux/amd64 --target api -t tara-api .
#   docker buildx build -f deploy/Dockerfile --platform linux/amd64 --target web -t tara-web .

# ---- frontend build ----
FROM node:22-slim AS fe
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- web: Caddy serves the SPA, proxies /api to the API, handles HTTPS ----
FROM caddy:2 AS web
COPY --from=fe /fe/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile

# ---- api: FastAPI + Node >= 22.13 (pdfjs-dist needs Promise.withResolvers; stage agents run as `node agent.js`) ----
FROM python:3.12-slim AS api
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY checkpoint-api/requirements.txt checkpoint-api/requirements.txt
RUN pip install --no-cache-dir -r checkpoint-api/requirements.txt
COPY package.json package-lock.json ./
COPY --from=node:22-slim /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && npm ci --omit=dev && rm -f /usr/local/bin/npm
COPY checkpoint-api/ checkpoint-api/
COPY tara-workspace/ tara-workspace/
COPY src/ src/
ENV WORKSPACE_ROOT=/app DATABASE_URL=sqlite:////data/tara.db UPLOAD_DIR=/app/uploads
WORKDIR /app/checkpoint-api
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "checkpoint_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
