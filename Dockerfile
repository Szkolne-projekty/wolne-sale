# --- Build Stage ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Run Stage ---
FROM node:24-alpine AS run
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/build ./build
ENV NODE_ENV=production
ENV PORT=25567
EXPOSE 25567
CMD ["node", "build"]