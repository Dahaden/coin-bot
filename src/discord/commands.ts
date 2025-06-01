import 'dotenv/config';
import {
    REST,
    Routes,
    _DataPayload,
    GatewayDispatchEvents,
    APIChatInputApplicationCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    ChatInputCommandInteraction,
    User as DiscordUser
} from 'discord.js';
import { getBank } from '../services';
import { CreateCurrencyRequest, GetBalancesRequest, TransferRequest, User } from '../services/bank';
import { toUser } from './util';
import { AbstractBankError } from '../errors';

type IntentCommandWithCallback<Event extends GatewayDispatchEvents, D = unknown, Payload extends _DataPayload<Event> = _DataPayload<Event, D>> = {
    commandConfig: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder,
    callback: (event: ChatInputCommandInteraction) => Promise<void>,
};

const commandErrorWrapper = <T extends ChatInputCommandInteraction>(callback: (event: T) => Promise<void>) => async (event: T) => {
    try {
        await callback(event);
    } catch (error) {
        if (!event.replied) {
            if (error instanceof AbstractBankError) {
                await event.reply(error.message);
            } else if (error instanceof Error) {
                await event.reply(`Not sure what went wrong...: ${error.message}`)
            }
        }
    }
}

const CreateCurrencyCommand: IntentCommandWithCallback<GatewayDispatchEvents.IntegrationCreate, APIChatInputApplicationCommandInteraction> = {
    commandConfig: new SlashCommandBuilder()
        .setName('create')
        .setDescription('Create a currency')
        .addUserOption(option =>
            option.setRequired(true)
                .setName('currency_commissioner')
                .setDescription('Commissioner who will own the initial coins')
        ).addStringOption(option =>
            option.setName('currency_name')
                .setDescription('Currency name')
                .setRequired(true)
        ).addStringOption(option =>
            option.setName('associated_emoji')
                .setDescription('Emoji used to send coins')
                .setRequired(true)
        ).addIntegerOption(option =>
            option.setName('initial_coins')
                .setDescription('Number of coins this currency has')
                .setRequired(true)
        ),
    callback: commandErrorWrapper(async (event) => {
        const bank = getBank();
        const currencyCommissioner = event.options.getUser('currency_commissioner', true);
        if (currencyCommissioner.bot) {
            await event.reply("Bot cannot be commissioner, dummy");
            return;
        }

        const requestOptions: CreateCurrencyRequest = {
            commisioner: toUser(currencyCommissioner),
            initialAmount: event.options.getInteger('initial_coins', true),
            name: event.options.getString('currency_name', true),
            emoji: event.options.getString('associated_emoji', true),
            guild: event.guildId as string, // TODO assert this
        };
        await bank.createCurrency(requestOptions);
        await event.reply("Created");

        // Create custom guild commands to make it easier to send currencies
    })
};

const SendCurrencyCommand: IntentCommandWithCallback<GatewayDispatchEvents.IntegrationCreate, APIChatInputApplicationCommandInteraction> = {
    commandConfig: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Send many coins to someone')
        .addUserOption(option =>
            option.setRequired(true)
                .setName('user')
                .setDescription('The user you want to send coins too')
        ).addStringOption(option =>
            option.setName('associated_emoji')
                .setDescription('Emoji used to send coins')
                .setRequired(true)
        ).addIntegerOption(option =>
            option.setName('number_of_coins')
                .setDescription('Number of coins you want to send')
                .setRequired(true)
        ),
    callback: commandErrorWrapper(async (event) => {
        const bank = getBank();
        const recipient = event.options.getUser('user', true);
        if (recipient.bot) {
            await event.reply("Bot cannot be given money, dummy");
            return;
        } else if (event.member === null || event.member.user.bot) {
            await event.reply("How can a bot give money?");
            return;
        }

        const requestOptions: TransferRequest = {
            recipient: toUser(recipient),
            amount: event.options.getInteger('number_of_coins', true),
            emoji: event.options.getString('associated_emoji', true),
            sender: toUser(event.member.user as DiscordUser), // TODO Assert this
            guild: event.guildId as string, // TODO assert this
        };
        await bank.transferFunds(requestOptions);
        await event.reply(`Sent ${requestOptions.amount} to ${recipient.displayName}`);
    })
};

const GetBalancesCommand: IntentCommandWithCallback<GatewayDispatchEvents.IntegrationCreate, APIChatInputApplicationCommandInteraction> = {
    commandConfig: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('See balances for currency')
        .addStringOption(option =>
            option.setName('associated_emoji')
                .setDescription('Emoji used to send coins')
                .setRequired(true)
        ).addUserOption(option =>
            option.setRequired(false)
                .setName('user')
                .setDescription('The user you see how many coins they have')
        ),
    callback: commandErrorWrapper(async (event) => {
        const bank = getBank();
        const user = event.options.getUser('user');
        if (user?.bot) {
            await event.reply("Bot cannot have money, dummy");
            return;
        }
        const emoji = event.options.getString('associated_emoji', true)
        const requestOptions: GetBalancesRequest = {
            user: user ? toUser(user) : undefined,
            emoji,
            guild: event.guildId as string, // TODO assert this
        };
        const balances = await bank.getBalances(requestOptions);
        await event.reply(`Balance for ${emoji}.\n${balances.map(({ name, coins }) => `${name}: ${coins}`).join('\n')}`);
    })
};

const GetAllCurrencies: IntentCommandWithCallback<GatewayDispatchEvents.IntegrationCreate, APIChatInputApplicationCommandInteraction> = {
    commandConfig: new SlashCommandBuilder()
        .setName('currencies')
        .setDescription('See all currencies registered'),
    callback: commandErrorWrapper(async (event) => {
        const bank = getBank();
        const user = event.options.getUser('user');
        const emojis = (await bank.getAllCurrenciesForGuild({
            guild: event.guildId as string, // TODO assert this
        })).map(({ emoji }) => emoji).join('');

        if (emojis.length > 0) {
            await event.reply(`Currencies: ${emojis}`);
        } else {
            await event.reply('Found no currencies. Create one with /create')
        }
    })
};

export const ALL_COMMAND_CONFIGS = [
    CreateCurrencyCommand,
    SendCurrencyCommand,
    GetBalancesCommand,
    GetAllCurrencies
];

export const installGlobalCommands = async () => {
    const commands = ALL_COMMAND_CONFIGS.map(c => c.commandConfig.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
            headers: {
                "Content-Type": "application/json"
            },
            body: commands
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}