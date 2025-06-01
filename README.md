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

## TODOS

### Bugs

- Better error handling
- Preventing duplicate currencies

### Enhancements

- Better messages when creating / giving coins
    - Use in discord built mentions
- Create better slash commands specific to the currency created for the guild
- Configure specific channel for all bot messages
    - Link to original message from the bot transaction message
- Caching the currency check

### New features

- User Alias'
    - Users can have multiple alias' which will be randomly picked from in response messages
    - Use with discord roles and allow for multiple users to be in an alias
        - This will require additional permissions for the bot
- Commisioners
    - Commisioner will be responsible for giving out money
    - They will not have the money associated with them
    - Commisioner can be voted out if >50% of the active currency holders agree to a new commisioner
    - Bank run (the good kind?) 
        - Allow for users to get coins for a limited time
        - Unique messages only
- Allow trade between currencies
    - Commisioners of both currencies must debate the exhange rate
    - Fee to exchanging?
- Make it easier for custom reactions to be made
    - At first this can be util methods and better structure to make it easy to onboard global reactions
    - Eventually allow for guild specific actions to be created / stored in the db instead of code

### New features hard mode

- MultiApp / cross app
    - Allow for more than just discord to use this
    - Multiple entities can use the same currency
        - Like multiple guilds on discord
    - Users can connect their accounts across platforms
        - We dont want access to emails, so this will have to use unique codes