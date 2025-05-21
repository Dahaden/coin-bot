import { GatewayDispatchPayload, GatewayDispatchEvents } from "discord.js";

export const intentHandler = (event: GatewayDispatchPayload) => {

    switch(event.t) {
        case GatewayDispatchEvents.MessageReactionAdd:
            break;
        case GatewayDispatchEvents.InteractionCreate:
            break;
        default:
            console.error(`Unknown intent event type: ${event.t}`, event);
    }
};

