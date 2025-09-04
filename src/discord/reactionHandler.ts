import { Message, MessageFlags, MessagePayload, MessageReaction, OmitPartialGroupDMChannel, PartialMessageReaction, PartialUser, User } from "discord.js";
import { getBank, getGuildService, getRoleService } from "../services";
import { roleIdToRoleMention, toUser } from "./util";
import { AbstractBankError } from "../errors";
import { ToStringAble } from "../type-utils";

export const reactionHandler = async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
    const guildId = reaction.message.guildId;
    if (!guildId) {
        throw new Error('Expected a guild ID');
    }

    const bank = getBank();
    const roleService = getRoleService();
    const emojis = await bank.getAllCurrenciesForGuild({ guild: guildId });
    const registeredEmojis = new Set(emojis.map(({ emoji }) => emoji));

    const usedEmoji = reaction.emoji.toString();

    if (registeredEmojis.has(usedEmoji) && !user.bot) {
        const messageWithAuthor = await reaction.message.fetch();
        if (!messageWithAuthor.author.bot) {
            const senderRoles = roleService.getUserRoles({ discordId: user.id, guild: guildId })
                .then(roles => roles.map(roleIdToRoleMention));
            const recipientRoles = roleService.getUserRoles({ discordId: messageWithAuthor.author.id, guild: guildId });
            try {
                await bank.transferFunds({
                    recipient: toUser(messageWithAuthor.author),
                    sender: toUser(user),
                    amount: 1,
                    emoji: usedEmoji,
                    guild: guildId
                });
                const senderMention = getUserOrRoleMention(user, senderRoles);
                const recipientMention = getUserOrRoleMention(messageWithAuthor.author, recipientRoles);
                await replyToMessage({
                    reaction,
                    message: messageWithAuthor,
                    replyMessage: `${await senderMention} sent 1 ${usedEmoji} to ${await recipientMention}`,
                    guildId
                });
            } catch (error) {
                if (error instanceof AbstractBankError) {
                    await replyToMessage({
                        reaction,
                        message: messageWithAuthor,
                        replyMessage: error,
                        guildId
                    });
                }
            }
        }
    }
};

const replyToMessage = async ({
    reaction,
    message,
    replyMessage,
    guildId
}: {
    reaction: MessageReaction | PartialMessageReaction,
    message: OmitPartialGroupDMChannel<Message>
    replyMessage: ToStringAble,
    guildId: string,
}) => {
    const guildService = getGuildService();
    const spamChannel = await guildService.getSpamChannelForGuild(guildId);

    if (spamChannel.length === 1) {
        const channel = await reaction.client.channels.fetch(spamChannel[0].channel);
        if (channel && channel.isSendable()) {
            await channel.send(MessagePayload.create(channel, {
                content: `${message.url} -> ${replyMessage}`,
                flags: MessageFlags.Ephemeral
            }));
        } else {
            console.log("Chanel is not sendable? or not found", channel);
        }
    } else {
        await message.reply(replyMessage.toString());
    }
}

const getUserOrRoleMention = async (user: PartialUser | User, roleIdsPromise: Promise<Array<string>>) => {
    const roles = await roleIdsPromise.then(roles => roles.map(roleIdToRoleMention));
    const choices = [user, ...roles];
    if (choices.length === 1) {
        return user;
    }
    return choices[Math.floor(Math.random() * choices.length)];
};