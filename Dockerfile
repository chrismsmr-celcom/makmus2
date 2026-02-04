FROM node:20-alpine
RUN apk add --no-cache unzip wget ca-certificates

# 1. Installer PocketBase
WORKDIR /pb
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.21/pocketbase_0.22.21_linux_amd64.zip && \
    unzip pocketbase_0.22.21_linux_amd64.zip && \
    rm pocketbase_0.22.21_linux_amd64.zip

# 2. Installer le projet complet
WORKDIR /app
COPY . .

# Installer les dépendances du serveur Node
WORKDIR /app/server
RUN npm install

# Exposer le port public
EXPOSE 8080

# LANCEMENT HYBRIDE :
# - PocketBase tourne sur le port 9000 (interne)
# - Node tourne sur le port 8080 (public)
CMD /pb/pocketbase serve --http=0.0.0.0:9000 & node server.js
