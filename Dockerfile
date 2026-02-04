FROM alpine:latest
RUN apk add --no-cache unzip wget ca-certificates

WORKDIR /pb

# Téléchargement de PocketBase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.21/pocketbase_0.22.21_linux_amd64.zip && \
    unzip pocketbase_0.22.21_linux_amd64.zip && \
    rm pocketbase_0.22.21_linux_amd64.zip

# On place ton site dans le dossier public de PocketBase
COPY index.html ./pb_public/
COPY style.css ./pb_public/

EXPOSE 8080

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8080"]
