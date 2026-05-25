# Use official Node LTS image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# Build the client
RUN npm run build

# Expose the port the app runs on
ENV PORT 3000
EXPOSE 3000

# Start the server
CMD ["node", "dist/server.cjs"]
