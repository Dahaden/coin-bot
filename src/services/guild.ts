import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { guildChannel } from "../db/schema";

type TransactionFnType = Parameters<typeof db.transaction>;
type TransactionType = Parameters<TransactionFnType[0]>[0];

export class GuildService {

    async setSpamChannelForGuild(guild: string, channel: string) {
        await db.transaction(async tx => {
            const existingSpamChannel = await this.getSpamChannelForGuild(guild, tx);
            if (existingSpamChannel.length > 0) {
                await db.delete(guildChannel).where(
                    and(
                        eq(guildChannel.guild, guild),
                        eq(guildChannel.type, "spam_channel")
                    )
                );
            }
            await db.insert(guildChannel).values({
                guild,
                channel,
                type: 'spam_channel'
            });
        });
    }

    async getSpamChannelForGuild(guild: string, database: TransactionType | typeof db = db) {
        return database.select().from(guildChannel)
            .where(
                and(
                    eq(guildChannel.guild, guild),
                    eq(guildChannel.type, "spam_channel")
                )
            );
    }
}