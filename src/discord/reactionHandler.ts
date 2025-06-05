import { Message, MessageFlags, MessagePayload, MessageReaction, OmitPartialGroupDMChannel, PartialMessageReaction, PartialUser, User } from "discord.js";
import { getBank, getGuildService } from "../services";
import { toUser } from "./util";
import { AbstractBankError } from "../errors";

export const reactionHandler = async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
    const bank = getBank();
    const emojis = await bank.getAllCurrenciesForGuild({ guild: reaction.message.guildId as string }); // TODO assert this
    const registeredEmojis = new Set(emojis.map(({ emoji }) => emoji));

    const usedEmoji = reaction.emoji.toString();

    if (registeredEmojis.has(usedEmoji) && !user.bot) {
        const messageWithAuthor = await reaction.message.fetch();
        if (!messageWithAuthor.author.bot) {
            try {
                await bank.transferFunds({
                    recipient: toUser(messageWithAuthor.author),
                    sender: toUser(user),
                    amount: 1,
                    emoji: usedEmoji,
                    guild: messageWithAuthor.guildId as string
                });
                await replyToMessage({
                    reaction,
                    message: messageWithAuthor,
                    replyMessage: `${user} sent 1 ${usedEmoji} to ${messageWithAuthor.author}`
                });
            } catch (error) {
                if (error instanceof AbstractBankError) {
                    await replyToMessage({
                        reaction,
                        message: messageWithAuthor,
                        replyMessage: error.message
                    });
                }
            }
        }
    }
};

const replyToMessage = async ({
    reaction,
    message,
    replyMessage
}: {
    reaction: MessageReaction | PartialMessageReaction,
    message: OmitPartialGroupDMChannel<Message>
    replyMessage: string,
}) => {
    const guildService = getGuildService();
    const spamChannel = await guildService.getSpamChannelForGuild(reaction.message.guildId as string); // TODO assert this

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
        await message.reply(replyMessage);
    }
}