import { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { getBank } from "../services";
import { toUser } from "./util";

export const reactionHandler = async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
    const bank = getBank();
    const emojis = await bank.getAllCurrenciesForGuild({ guild: reaction.message.guildId as string }); // TODO assert this
    const registeredEmojis = new Set(emojis.map(({ emoji }) => emoji));

    const usedEmoji = reaction.emoji.toString();

    if (registeredEmojis.has(usedEmoji) && !user.bot) {
        const messageWithAuthor = await reaction.message.fetch();
        if (!messageWithAuthor.author.bot) {
            await bank.transferFunds({
                recipient: toUser(messageWithAuthor.author),
                sender: toUser(user),
                amount: 1,
                emoji: usedEmoji,
                guild: messageWithAuthor.guildId as string
            });
            messageWithAuthor.reply(`${user.username} sent 1 ${usedEmoji} to ${messageWithAuthor.author.username}`);
        }
    }
};