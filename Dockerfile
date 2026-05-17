# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy backend source
COPY backend/package.json backend/package-lock.json* ./

# Install dependencies
RUN npm install --no-optional 2>&1 || npm install --legacy-peer-deps 2>&1

COPY backend/ ./
RUN npm run build

# ---- Runtime stage ----
# Alpine-based: Node.js 22 + OpenJDK 17 (much smaller than Debian+JDK)
FROM node:22-alpine

# Enable Alpine community repo and install Java 17 + utilities
RUN ALPINE_VER=$(cut -d. -f1,2 /etc/alpine-release) \
    && echo "https://dl-cdn.alpinelinux.org/alpine/v${ALPINE_VER}/community" >> /etc/apk/repositories \
    && apk add --no-cache openjdk17 unzip curl

WORKDIR /app

# Copy built server and production node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Setup bundletool directory - copy keystore, download bundletool.jar
COPY backend/bundletool/debug.keystore ./bundletool/debug.keystore

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
