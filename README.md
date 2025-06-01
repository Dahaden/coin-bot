# coin-bot

## Prerequisites

1. Node v22
    1. fnm or nvm will be able to do this for you
1. Postgres
    1. Docker is the easiest way to get started https://www.docker.com/blog/how-to-use-the-postgres-docker-official-image/
1. Discord App tokens
    1. https://discord.com/developers/applications

## .env

Create a .env file and throw in 

```text
DATABASE_URL=postgres://<user>:<password>@<url>:5432/<postgresname>
DISCORD_TOKEN=<>
DISCORD_CLIENT_ID=<>
```

## Build and Run

`yarn install` to install all dependencies.
`yarn drizzle:apply` to run migrations or create the DB tables in your postgres instance.
`yarn dev` to run the application with live reload.

## Testing

TBD

## Build and deploy

`docker build .\ -t ghcr.io/dahaden/coin-bot` to create the docker image.
`docker push ghcr.io/dahaden/coin-bot:latest` to push this version to github so that it can be consumed.

Then Dave needs to restart the app on his home server.