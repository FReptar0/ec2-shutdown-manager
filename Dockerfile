FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY src ./src

# Keep container running
CMD ["tail", "-f", "/dev/null"]
