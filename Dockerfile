# ---- Build stage ----
FROM node:22-slim AS builder

WORKDIR /app

# Copy backend source
COPY backend/package.json ./
RUN npm install

COPY backend/ ./
RUN npm run build

# ---- Runtime stage ----
# Use Eclipse Temurin JDK 17 on Debian slim (Node.js will be installed on top)
FROM eclipse-temurin:17-jdk-jammy

# Install Node.js 22, unzip, curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl unzip ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Copy bundletool assets (keystore)
COPY backend/bundletool/ ./bundletool/

# Download bundletool.jar if not already present in the repo
RUN if [ ! -f "./bundletool/bundletool.jar" ]; then \
      echo "Downloading bundletool.jar..." && \
      curl -fsSL -o ./bundletool/bundletool.jar \
        https://github.com/google/bundletool/releases/download/1.17.2/bundletool-all-1.17.2.jar; \
    fi

# Verify Java and bundletool are working
RUN java -version && java -jar ./bundletool/bundletool.jar version

ENV NODE_ENV=production
ENV PORT=8080
ENV BUNDLETOOL_PATH=/app/bundletool/bundletool.jar
ENV KEYSTORE_PATH=/app/bundletool/debug.keystore

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
