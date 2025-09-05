import { Role } from "discord.js";
import { getRoleService } from "../services";

export const addRole = async (role: Role) => {
    const roleService = getRoleService();
    const members = role.members.values().map((member) => ({ name: member.displayName, discordId: member.id }));
    await roleService.addUserRole({
        guild: role.guild.id,
        role: role.id,
        roleName: role.name,
        isMentionable: role.mentionable ? 'is_mentionable' : 'blocked_by_discord',
        users: [...members]
    });
}

export const updateRole = async (oldRole: Role, newRole: Role) => {
    const roleService = getRoleService();
    const oldUsers = oldRole.members.values().map((member) => ({ name: member.displayName, discordId: member.id }));
    const newUsers = newRole.members.values().map((member) => ({ name: member.displayName, discordId: member.id }));
    await roleService.updateUserRoles({
        guild: oldRole.guild.id,
        role_id: oldRole.id,
        isMentionable: newRole.mentionable ? 'is_mentionable' : 'blocked_by_discord',
        previousUsers: [...oldUsers],
        newUsers: [...newUsers]
    });
}