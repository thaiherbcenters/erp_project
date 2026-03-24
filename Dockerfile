# -------------------------
# Stage 1: Build Frontend (Vite)
# -------------------------
FROM node:20-alpine as build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# -------------------------
# Stage 2: Serve with Nginx
# -------------------------
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend from Stage 1 into Nginx HTML folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support React Router
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Start Nginx Server
CMD ["nginx", "-g", "daemon off;"]
