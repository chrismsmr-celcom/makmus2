FROM node:20-alpine
RUN apk add --no-cache unzip wget ca-certificates

# Install PocketBase
WORKDIR /pb
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.21/pocketbase_0.22.21_linux_amd64.zip && \
    unzip pocketbase_0.22.21_linux_amd64.zip && \
    rm pocketbase_0.22.21_linux_amd64.zip

# Install Node App
WORKDIR /app
COPY . .
WORKDIR /app/server
RUN npm install

EXPOSE 8080

# Lancement simultané : PB sur 9000, Node sur 8080
CMD /pb/pocketbase serve --http=0.0.0.0:9000 & node server.js
