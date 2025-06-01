import { User as DiscordUser, PartialUser } from "discord.js";
import { User } from "../services/bank";

export const toUser = ({ id, displayName }: DiscordUser | PartialUser): User => {
    return {
        discord_id: id,
        name: displayName
    };
}