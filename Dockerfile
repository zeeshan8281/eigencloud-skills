FROM node:22-bullseye-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy app
COPY server.js .
COPY index.js .
COPY ui/ ui/
COPY skills/ skills/
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

EXPOSE 4200

ENTRYPOINT ["/app/entrypoint.sh"]
