FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all backend source code
COPY . .

# Expose the API port
EXPOSE 5000

# Start the server (Production mode instead of nodemon)
CMD ["node", "server.js"]
