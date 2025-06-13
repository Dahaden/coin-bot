# Create DIST files
FROM node:22-alpine AS dist

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY yarn.lock package.json tsconfig.json ./
COPY src ./src

RUN yarn install

RUN yarn build:prod

# Get prod only dependencies
FROM node:22-alpine AS dependencies

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY yarn.lock package.json ./

RUN yarn install --production

# Final base image
FROM node:22-slim

RUN mkdir -p /home/node/app/node_modules
RUN mkdir -p /home/node/app/dist
RUN chown -R node:node /home/node/app

WORKDIR /home/node/app

USER node

COPY --from=dist /home/node/app/dist /home/node/app/dist

COPY --from=dependencies /home/node/app/yarn.lock /home/node/app/package.json ./
COPY --from=dependencies /home/node/app/node_modules ./node_modules

COPY ./bin ./bin

## For Drizzle, this should be moved to SQL migration files
RUN mkdir -p /home/node/app/src/db
COPY drizzle.config.ts ./
COPY src/db/schema.ts ./src/db/

ENV NODE_ENV=production
ENV PORT=3000

CMD [ "./bin/server-start.sh" ]