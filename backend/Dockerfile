FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p data && npx drizzle-kit migrate
EXPOSE 3000
CMD ["node", "dist/index.js"]
