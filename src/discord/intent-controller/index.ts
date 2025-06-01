import { GatewayDispatchPayload, GatewayDispatchEvents, APIChatInputApplicationCommandInteraction, Interaction, InteractionType, ChatInputCommandInteraction } from "discord.js";
import { ALL_COMMAND_CONFIGS } from "../commands";

export const intentHandler = (event: Interaction) => {
    // console.log(`Got event from Discord: ${JSON.stringify(event, null, 2)}`);

    if (event.isChatInputCommand()) {
        const command = ALL_COMMAND_CONFIGS.find(c => c.commandConfig.name === event.commandName);
        return command?.callback(event);
    } else {
        console.log(event.id)
    }
};