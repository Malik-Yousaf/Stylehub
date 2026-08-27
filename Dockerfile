# Builds the React frontend, then serves it (and the API) with server.js.
FROM node:20-alpine

WORKDIR /app

# Install client dependencies first (better Docker layer caching)
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm install

# Copy the rest of the project
COPY . .

# Keep a bundled copy of the starting catalog — used to seed a brand-new
# persistent volume (DATA_DIR) the first time the app boots there.
RUN cp data.json data.default.json

# Build the React app -> ../dist (served by server.js)
RUN cd client && npm run build

EXPOSE 3000
CMD ["node", "server.js"]
