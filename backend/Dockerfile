FROM node:18-slim

# Set working directory
WORKDIR /app

# Install OpenSSL
RUN apt-get update && apt-get install -y openssl

# Copy and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Set this to ignore Prisma's checksum (optional but helpful)
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Force Prisma to use valid binary target
ENV PRISMA_CLI_BINARY_TARGETS=native,debian-openssl-1.1.x

# Generate Prisma client
RUN npm run db:generate

# Build your app
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]
