import { z } from "zod";
import { db, TransactionType, bankTable, currencyTable, usersTable } from "../db";
import { and, desc, eq, or } from "drizzle-orm";
import { DontGiveYourselfMoneyError, InsufficientFundsError, NoEmojiExistsError } from "../errors";

const ZSafeNumber = z.number().min(1).max(Number.MAX_SAFE_INTEGER / 2);

const ZUser = z.object({
    discord_id: z.string(),
    name: z.string(),
    discord_user: z.unknown().optional(),
});
export type User = z.infer<typeof ZUser>;

const ZCreateCurrency = z.object({
    name: z.string(),
    guild: z.string(),
    emoji: z.string(),

    initialAmount: ZSafeNumber.min(1000),
    commisioner: ZUser,
});
export type CreateCurrencyRequest = z.infer<typeof ZCreateCurrency>;

const ZTransferRequest = z.object({
    sender: ZUser,
    recipient: ZUser,
    amount: ZSafeNumber,
    emoji: z.string(),
    guild: z.string(),
});
export type TransferRequest = z.infer<typeof ZTransferRequest>;

const ZGetBalancesRequest = z.object({
    emoji: z.string().optional(),
    guild: z.string(),
    user: ZUser.optional(),
});
export type GetBalancesRequest = z.infer<typeof ZGetBalancesRequest>;

const ZGetCurrencies = z.object({
    guild: z.string(),
});
export type GetCurrencies = z.infer<typeof ZGetCurrencies>;


export class Bank {

    async getAllCurrenciesForGuild(request: GetCurrencies) {
        ZGetCurrencies.parse(request);
        return db.select({
            emoji: currencyTable.emoji
        }).from(currencyTable)
            .where(
                eq(currencyTable.guild, request.guild)
            );
    }

    async getBalances(request: GetBalancesRequest) {
        ZGetBalancesRequest.parse(request);
        return await db.select({
            name: usersTable.name,
            emoji: currencyTable.emoji,
            coins: bankTable.coins
        }).from(bankTable)
            .innerJoin(usersTable, eq(bankTable.user_id, usersTable.id))
            .innerJoin(currencyTable, eq(bankTable.currency_id, currencyTable.id))
            .where(and(
                eq(currencyTable.guild, request.guild),
                ...(request.emoji ? [eq(currencyTable.emoji, request.emoji)] : []),
                ...(request.user ? [eq(usersTable.discord_id, request.user.discord_id)] : [])
            ))
            .orderBy(currencyTable.emoji, bankTable.coins);
    }

    async createCurrency(createCurrency: CreateCurrencyRequest) {
        ZCreateCurrency.parse(createCurrency);
        await db.transaction(async tx => {
            const currency: typeof currencyTable.$inferInsert = createCurrency;
            const result = await tx.insert(currencyTable)
                .values(currency)
                .returning({ inserted_id: currencyTable.id });
            const user_id = await this.getUser_id(createCurrency.commisioner, tx);
            await tx.insert(bankTable).values({
                user_id: user_id[0].user_id,
                currency_id: result[0].inserted_id,
                coins: createCurrency.initialAmount
            });
        }, {
            isolationLevel: 'read committed',
            accessMode: 'read write',
        });
    }

    async transferFunds(transferRequest: TransferRequest) {
        ZTransferRequest.parse(transferRequest);
        if (transferRequest.sender.discord_id === transferRequest.recipient.discord_id) {
            throw new DontGiveYourselfMoneyError({ emoji: transferRequest.emoji, user: this.discordUserOrName(transferRequest.sender) });
        }
        await db.transaction(async tx => {
            const result = await tx.select().from(bankTable)
                .innerJoin(currencyTable, eq(bankTable.currency_id, currencyTable.id))
                .innerJoin(usersTable, eq(bankTable.user_id, usersTable.id))
                .where(
                    and(
                        eq(currencyTable.guild, transferRequest.guild),
                        eq(currencyTable.emoji, transferRequest.emoji),
                        or(
                            eq(usersTable.discord_id, transferRequest.sender.discord_id),
                            eq(usersTable.discord_id, transferRequest.recipient.discord_id)
                        )
                    )
                );

            if (result.length === 0) {
                // Assume there is no bank for this emoji / guild combo
                throw new NoEmojiExistsError({ emoji: transferRequest.emoji, user: this.discordUserOrName(transferRequest.sender) });
            }

            const sender = result.find(r => r.users.discord_id === transferRequest.sender.discord_id);
            const recipient = result.find(r => r.users.discord_id === transferRequest.recipient.discord_id);

            if (!sender || sender.bank_table.coins < transferRequest.amount) {
                // Sender does not exist, or doesnt have enough money, cannot send money
                throw new InsufficientFundsError({ emoji: transferRequest.emoji, user: this.discordUserOrName(transferRequest.sender) });
            }
            if (!recipient) {
                // Need to create the recipient so they can get money
                const user_id = await this.getUser_id(transferRequest.recipient, tx);
                await tx.insert(bankTable).values({
                    currency_id: sender.bank_table.currency_id,
                    user_id: user_id[0].user_id,
                    coins: transferRequest.amount
                });
                await tx.update(bankTable)
                    .set({ coins: sender.bank_table.coins - transferRequest.amount, updated_at: new Date() })
                    .where(and(
                        eq(bankTable.currency_id, sender.bank_table.currency_id),
                        eq(bankTable.user_id, sender.bank_table.user_id)
                    ));
            } else {
                await tx.update(bankTable)
                    .set({ coins: sender.bank_table.coins - transferRequest.amount, updated_at: new Date() })
                    .where(and(
                        eq(bankTable.currency_id, sender.bank_table.currency_id),
                        eq(bankTable.user_id, sender.bank_table.user_id)
                    ));
                await tx.update(bankTable)
                    .set({ coins: recipient.bank_table.coins + transferRequest.amount, updated_at: new Date() })
                    .where(and(
                        eq(bankTable.currency_id, recipient.bank_table.currency_id),
                        eq(bankTable.user_id, recipient.bank_table.user_id)
                    ));
            }
        }, {
            isolationLevel: 'read committed',
            accessMode: 'read write',
        });
    }

    private async getUser_id({ discord_id, name }: User, tx: TransactionType) {
        return await tx.insert(usersTable)
            .values({ discord_id, name })
            .onConflictDoUpdate({
                target: usersTable.discord_id,
                set: { name }
            })
            .returning({ user_id: usersTable.id });
    }

    private discordUserOrName({ discord_user, name }: User) {
        return discord_user ? discord_user : name;
    }
}