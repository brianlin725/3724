# 1. Upgrade base image to Node 22 to satisfy @discordjs/voice requirements
FROM node:22-alpine

# 2. Add python3 so youtube-dl-exec can install and run correctly
RUN apk add --no-cache python3 ffmpeg libsodium

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Remember: Your docker-compose.yml overrides this for development
CMD ["node", "index.js"]