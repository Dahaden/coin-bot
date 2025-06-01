import 'dotenv/config';
import express from 'express';

import { applyRoutes } from './routes';
import { Client, Events, GatewayIntentBits, IntentsBitField, Partials } from 'discord.js';
import { installGlobalCommands, intentHandler } from './discord';
import { reactionHandler } from './discord/reactionHandler';

const app = express()
app.use(express.json());
const port = process.env.PORT || 3000;

applyRoutes(app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
const main = async () => {
  const intents = new IntentsBitField();
  intents.add(GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions);
  const client = new Client({
    intents,
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (event) => {
    await intentHandler(event);
  });

  client.on(Events.MessageReactionAdd, async (react, user) => {
    await reactionHandler(react, user);
  });

  await client.login(process.env.DISCORD_TOKEN);

  installGlobalCommands();

}

main().catch(error => {
  console.error('Failed to create Websocket manager', error);
  throw error;
});