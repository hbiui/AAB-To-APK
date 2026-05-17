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

# Setup bundletool directory
COPY backend/bundletool/debug.keystore ./bundletool/debug.keystore

# Download bundletool.jar (always, since .gitignore excludes the 31MB jar)
RUN echo "Downloading bundletool.jar..." && \
    curl -fsSL -o ./bundletool/bundletool.jar \
      https://github.com/google/bundletool/releases/download/1.17.2/bundletool-all-1.17.2.jar

# Verify Java and bundletool are working
RUN java -version && java -jar ./bundletool/bundletool.jar version

# Create temp directories for file processing
RUN mkdir -p /app/uploads /app/outputs

ENV NODE_ENV=production
ENV PORT=8080
ENV BUNDLETOOL_PATH=/app/bundletool/bundletool.jar
ENV KEYSTORE_PATH=/app/bundletool/debug.keystore

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
