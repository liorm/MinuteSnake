FROM node:20 AS build

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build the application
COPY . ./
RUN npm run build

FROM nginx:1.23 AS final

# Copy build artifacts
COPY --from=build /app/dist/ /usr/share/nginx/html/dist/
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
