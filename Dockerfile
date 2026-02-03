FROM alpine:latest

# On installe les outils nécessaires
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    openssh

# Version de PocketBase
ARG PB_VERSION=0.22.0

# Téléchargement et installation
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# On expose le port par défaut
EXPOSE 8080

# On lance PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
