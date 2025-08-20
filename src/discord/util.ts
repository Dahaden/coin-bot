import { User as DiscordUser, PartialUser } from "discord.js";
import { User } from "../services/bank";

export const toUser = (user: DiscordUser | PartialUser): User => {
    return {
        discord_id: user.id,
        name: user.displayName,
        discord_user: user
    };
}