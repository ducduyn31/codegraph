FROM oven/bun:1.0 as base

WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN apt-get update && apt-get install -y curl
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm
RUN pnpm install

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Expose port
EXPOSE 3002

# Start the service
CMD ["bun", "src/index.ts"]