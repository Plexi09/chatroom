# Utiliser une image de base officielle Node.js
FROM node:20

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers de l'application
COPY . .

# Construire le frontend
RUN npm run build:frontend

# Exposer le port 3000
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]