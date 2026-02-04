FROM node:20-alpine

# Installation des outils nécessaires
RUN apk add --no-cache unzip wget ca-certificates

# 1. Préparation de PocketBase
WORKDIR /pb
ENV PB_VERSION=0.22.21
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip && \
    unzip pocketbase_${PB_VERSION}_linux_amd64.zip && \
    rm pocketbase_${PB_VERSION}_linux_amd64.zip

# 2. Préparation de ton API News (le dossier server)
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .

# 3. Script pour lancer les deux serveurs en même temps
EXPOSE 8080
EXPOSE 3000

# On lance PocketBase sur le port 8080 et ton script Node sur le port 3000
CMD /pb/pocketbase serve --http=0.0.0.0:8080 & node server.js
