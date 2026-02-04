FROM node:20-alpine
RUN apk add --no-cache unzip wget ca-certificates

# 1. On installe PocketBase
WORKDIR /pb
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.21/pocketbase_0.22.21_linux_amd64.zip && \
    unzip pocketbase_0.22.21_linux_amd64.zip && \
    rm pocketbase_0.22.21_linux_amd64.zip

# 2. On installe ton API News
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .
COPY index.html style.css ./

# 3. On lance tout : PocketBase est le Chef sur 8080
EXPOSE 8080
CMD /pb/pocketbase serve --http=0.0.0.0:8080 & node server.js
