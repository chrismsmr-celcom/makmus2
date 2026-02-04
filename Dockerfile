FROM node:20-alpine
RUN apk add --no-cache unzip wget ca-certificates

# 1. Installer PocketBase
WORKDIR /pb
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.21/pocketbase_0.22.21_linux_amd64.zip && \
    unzip pocketbase_0.22.21_linux_amd64.zip && \
    rm pocketbase_0.22.21_linux_amd64.zip

# 2. Installer le Serveur Node
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .
COPY index.html style.css ./

# On expose le port 8080 (le port standard de ton service Render)
EXPOSE 8080

# On lance PocketBase sur le port 9000 (caché) et Node sur 8080 (public)
CMD /pb/pocketbase serve --http=0.0.0.0:9000 & node server.js
