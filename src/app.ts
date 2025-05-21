import 'dotenv/config';
import express from 'express';
import { WebSocketManager, WebSocketShardEvents, CompressionMethod } from '@discordjs/ws';
import { REST } from '@discordjs/rest';

import { applyRoutes } from './routes';
import { GatewayIntentBits } from 'discord.js';

const app = express()
app.use(express.json());
const port = 3000

applyRoutes(app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
const main = async () => {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
  // This example will spawn Discord's recommended shard count, all under the current process.
  const manager = new WebSocketManager({
    token: process.env.DISCORD_TOKEN!,
    intents: GatewayIntentBits.GuildMessageReactions,
    rest,
    // uncomment if you have zlib-sync installed and want to use compression
    compression: CompressionMethod.ZlibSync,
  });
  
  manager.on(WebSocketShardEvents.Dispatch, (event) => {
    // Process gateway events here.
  });
  
  await manager.connect();
}

main().catch(error => {
  console.error('Failed to create Websocket manager', error);
  throw error;
});