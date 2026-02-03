FROM alpine:latest

# Installation des certificats de sécurité
RUN apk add --no-cache ca-certificates unzip wget

# On définit la version de PocketBase
ENV PB_VERSION=0.22.21

# Téléchargement et installation de PocketBase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip && \
    unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb && \
    rm pocketbase_${PB_VERSION}_linux_amd64.zip

# Port par défaut pour Render
EXPOSE 8080

# Commande pour lancer PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
