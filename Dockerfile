FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# VITE_-prefixed vars must be present as build args — Vite inlines them into the
# frontend bundle at build time. Docker builds don't inherit Railway's runtime
# env vars automatically, so they must be declared as ARG and re-exported as ENV
# before `vite build` runs. Railway auto-forwards matching service variables as
# build args for Dockerfile builds.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_MIDTRANS_CLIENT_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_MIDTRANS_CLIENT_KEY=$VITE_MIDTRANS_CLIENT_KEY

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
