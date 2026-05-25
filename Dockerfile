# Use official Node LTS image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install all deps (including devDeps needed for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Remove devDependencies to keep image small
RUN npm prune --production

# Expose the port the app runs on
ENV PORT 3000
EXPOSE 3000

# Start the server
CMD ["node", "dist/server.cjs"]
