FROM node:20-alpine AS base
COPY . .
RUN npm install

# RUN npm install pm2@latest -g

# RUN pm2 start bot.js

# CMD ["pm2", "logs", "bot"]

CMD ["node", "bot.js"]