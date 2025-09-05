import { APIRole, User as DiscordUser, PartialUser, Role } from "discord.js";
import { User } from "../services/bank";

export const toUser = (user: DiscordUser | PartialUser): User => {
    return {
        discord_id: user.id,
        name: user.displayName,
        discord_user: user
    };
}

export const roleIdToRoleMention = (roleId: string) => {
    return `<@&${roleId}>`;
}

export const roleHasPermissions = (role: APIRole | Role) => {
    if (typeof role.permissions === 'string') {
        // What is permissions? We should check this before adding / removing users
        console.log('Wtf are the roles permissions?:', JSON.stringify(role.permissions));
        return false;
    } else {
        return role.permissions.valueOf() !== 0n;
    }
}