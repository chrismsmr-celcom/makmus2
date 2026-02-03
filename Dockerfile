FROM node:20-alpine

# On définit la limite de mémoire pour Node dans le container
ENV NODE_OPTIONS="--max-old-space-size=450"

WORKDIR /app

# On copie les fichiers de config
COPY package.json package-lock.json* ./

# Installation des dépendances (SANS le --production pour pouvoir build l'admin)
RUN npm install

# Copie du reste du code
COPY . .

# Build de l'administration (On désactive l'optimisation pour la RAM)
RUN npx strapi build --no-optimization

EXPOSE 1337

CMD ["npm", "run", "start"]
