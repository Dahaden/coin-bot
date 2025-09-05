import { z } from "zod"
import { db, role, userRoles, usersTable } from "../db";
import { and, eq, inArray, InferInsertModel, sql } from "drizzle-orm";
import { MentionableStateType, mentionableStateValues } from "../db/schema";


const AddUserRoleOptionZ = z.object({
    role: z.string(),
    roleName: z.string(),
    guild: z.string(),
    isMentionable: z.enum(mentionableStateValues),
    users: z.object({
        discordId: z.string(),
        name: z.string(),
    }).array(),
});
type AddUserRoleOption = z.infer<typeof AddUserRoleOptionZ>;

const GetUserRoleOptionZ = z.object({
    discordId: z.string(),
    guild: z.string(),
});
type GetUserRoleOption = z.infer<typeof GetUserRoleOptionZ>;

const UpdateUserRolesOptionZ = z.object({
    guild: z.string(),
    role_id: z.string(),
    previousUsers: z.object({
        discordId: z.string(),
        name: z.string(),
    }).array(),
    newUsers: z.object({
        discordId: z.string(),
        name: z.string(),
    }).array(),
    isMentionable: z.enum(mentionableStateValues)
});
type UpdateUserRolesOption = z.infer<typeof UpdateUserRolesOptionZ>;

type InsertRoles = InferInsertModel<typeof role>;
type InsertUserRoles = InferInsertModel<typeof userRoles>;

type Transaction = Parameters<Parameters<(typeof db)['transaction']>[0]>[0];

export class Role {

    async getIdForRoleNameIfExists({ guild, roleName }: { guild: string, roleName: string }) {
        const result = await db.select({ discordId: role.role_discord_id }).from(role).where(
            and(
                eq(role.guild, guild),
                eq(role.role_name, roleName)
            )
        ).limit(1);
        return result.length > 0 ? result[0].discordId : undefined;
    }

    async addUserRole(userRole: AddUserRoleOption) {
        return await db.transaction(async (tx) => {
            const roles = await tx.insert(role).values({
                guild: userRole.guild,
                role_name: userRole.roleName,
                role_discord_id: userRole.role,
                is_mentionable: userRole.isMentionable,
            }).returning({ role_id: role.id });
            const { role_id } = roles[0];
            if (userRole.users.length > 0) {
                const users = await this.getUsers(tx, userRole.users);
                await tx.insert(userRoles).values(users.map<InsertUserRoles>(({ id }) => ({
                    user_id: id,
                    role_id,
                })))
            }
        });
    }

    async getUserRoles({ discordId, guild }: GetUserRoleOption) {
        return (await db.select({ role_id: role.role_discord_id }).from(role)
            .innerJoin(usersTable, eq(usersTable.discord_id, discordId))
            .innerJoin(userRoles, eq(userRoles.user_id, usersTable.id))
            .where(and(
                eq(usersTable.discord_id, discordId),
                eq(role.guild, guild),
                eq(userRoles.active, true),
                eq(role.is_mentionable, 'is_mentionable')
            ))).map(({ role_id }) => role_id);
    }

    // Update members in role for an old and new role
    async updateUserRoles({ guild, role_id, previousUsers, newUsers, isMentionable }: UpdateUserRolesOption) {
        const previousUserSet = new Set(previousUsers.map(({ discordId }) => discordId));
        const newUserSet = new Set(newUsers.map(({ discordId }) => discordId));

        const removedUsers = previousUserSet.difference(newUserSet);
        const addedUsers = newUserSet.difference(previousUserSet);

        const allUpdatedUserDiscordIds = previousUserSet.symmetricDifference(newUserSet);

        const allUsersToUpdate = [...previousUsers, ...newUsers].filter(({ discordId }) => allUpdatedUserDiscordIds.has(discordId));

        await db.transaction(async (tx) => {

            const userIdsPromise = this.getUsers(tx, allUsersToUpdate);

            const roleIdPromise = tx.select({ id: role.id, isMentionable: role.is_mentionable })
                .from(role)
                .where(and(
                    eq(role.role_discord_id, role_id),
                    eq(role.guild, guild)
                ))
                .then(foundRoles => {
                    if (foundRoles.length > 0) {
                        return Promise.reject(new Error(`Found multiple roles for id ${role_id}`));
                    } else if (foundRoles.length === 0) {
                        return Promise.reject(new Error(`404 Role not found for id ${role_id}`));
                    }
                    return foundRoles[0];
                });
            const removedUserIdsPromise = removedUsers.size === 0 ?
                Promise.resolve([]) :
                userIdsPromise
                    .then(userIds => userIds.filter(({ discordId }) => removedUsers.has(discordId)).map(({ id }) => id));

            const addedUserIdsPromise = addedUsers.size === 0 ?
                Promise.resolve([]) :
                userIdsPromise
                    .then(userIds => userIds.filter(({ discordId }) => addedUsers.has(discordId)).map(({ id }) => id));

            const removedUsersPromise = Promise.all([roleIdPromise, removedUserIdsPromise]).then(([role, userIds]) => {
                tx.update(userRoles)
                    .set({ active: false, updated_at: new Date() })
                    .where(and(
                        eq(userRoles.role_id, role.id),
                        inArray(userRoles.user_id, userIds)
                    ));
            });

            const addedUsersPromise = Promise.all([roleIdPromise, addedUserIdsPromise]).then(([role, userIds]) => {
                tx.insert(userRoles)
                    .values(userIds.map(userId => ({
                        role_id: role.id,
                        user_id: userId,
                        active: true,
                        updated_at: new Date()
                    }))).onConflictDoUpdate({
                        target: [userRoles.role_id, userRoles.user_id],
                        set: {
                            active: sql.raw(`excluded.${userRoles.active.name}`),
                            updated_at: sql.raw(`excluded.${userRoles.updated_at.name}`)
                        }
                    });
            });

            const roleUpdatePromise = roleIdPromise.then((roleRow) => {
                if (roleRow.isMentionable === isMentionable || roleRow.isMentionable === 'blocked_by_user') {
                    return;
                }
                return tx.update(role).set({ is_mentionable: isMentionable }).where(eq(role.id, roleRow.id));
            });

            return Promise.all([removedUsersPromise, addedUsersPromise, roleUpdatePromise]);
        });
    }

    async setRoleMentionable(roleId: string, isMentionable: MentionableStateType) {
        await db.update(role)
            .set({ is_mentionable: isMentionable })
            .where(eq(role.role_discord_id, roleId));
    }

    private async getUsers(database: Transaction, discordUsers: Array<{ name: string, discordId: string }>) {
        const foundUsers = await database.select({
            id: usersTable.id,
            discordId: usersTable.discord_id
        })
            .from(usersTable)
            .where(
                inArray(usersTable.discord_id, discordUsers.map(({ discordId }) => discordId))
            );
        const usersToCreate = discordUsers.filter(({ discordId }) =>
            foundUsers.some(({ discordId: foundDiscordId }) => discordId === foundDiscordId)
        );

        if (usersToCreate.length === 0) {
            return foundUsers;
        }

        const createdUsers = await database.insert(usersTable)
            .values(usersToCreate.map(({ name, discordId }) => ({
                discord_id: discordId,
                name
            }))).returning({ id: usersTable.id, discordId: usersTable.discord_id });

        return [...foundUsers, ...createdUsers];
    }
}