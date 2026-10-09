FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS build
WORKDIR /app
RUN npm install --global npm@12.2.0
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/test-support/package.json packages/test-support/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci --include=optional && node -e "require('lightningcss')"
COPY . .
RUN npm run build

FROM build AS browser
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN node node_modules/playwright/cli.js install --with-deps chromium

FROM browser AS verification
COPY --from=docker:29.1.3-cli@sha256:4fa0ee1f3a7e4354c4ea34558b6d4ee32859baf4973d4c8ccc8e7fe3dd730c04 /usr/local/bin/docker /usr/local/bin/docker

FROM browser AS runtime
ARG RELEASE_ID
LABEL org.opencontainers.image.revision=$RELEASE_ID
ENV NODE_ENV=production APP_ENV=production DEPLOYMENT_MANAGED=true API_HOST=0.0.0.0 API_PORT=4100
WORKDIR /app
USER node
EXPOSE 4100 8080
STOPSIGNAL SIGTERM
ENTRYPOINT ["node", "deploy/entrypoint.mjs"]
CMD ["api"]
