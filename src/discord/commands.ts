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
    User as DiscordUser,
    MessageFlags,
    SlashCommandSubcommandGroupBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import { getBank, getGuildService, getRoleService } from '../services';
import { CreateCurrencyRequest, GetBalancesRequest, TransferRequest, User } from '../services/bank';
import { toUser } from './util';
import { AbstractBankError } from '../errors';
import { MentionableStateType } from '../db/schema';

type IntentCommandWithCallback<Event extends GatewayDispatchEvents, D = unknown, Payload extends _DataPayload<Event> = _DataPayload<Event, D>> = {
    commandConfig: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandGroupBuilder | SlashCommandSubcommandsOnlyBuilder,
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
                .setRequired(false)
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
        const emoji = event.options.getString('associated_emoji', false)
        const requestOptions: GetBalancesRequest = {
            user: user ? toUser(user) : undefined,
            emoji: emoji ?? undefined,
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

const SetSpamChannel: IntentCommandWithCallback<GatewayDispatchEvents.IntegrationCreate, APIChatInputApplicationCommandInteraction> = {
    commandConfig: new SlashCommandBuilder()
        .setName('spam_channel')
        .setDescription('Set specific channel for spam bot messages to go to')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Set the channel for spam messages to go to')
                .setRequired(true)
        ),
    callback: commandErrorWrapper(async (event) => {
        const guildService = getGuildService();
        const channel = event.options.getChannel('channel');
        if (!channel) {
            await event.reply({
                content: `Missing spam channel`,
                flags: MessageFlags.Ephemeral
            });
            throw new Error('Channel is required');
        }
        await guildService.setSpamChannelForGuild(
            event.guildId as string,
            channel.id
        );
        await event.reply({
            content: `Saved spam channel`,
            flags: MessageFlags.Ephemeral
        });
    })
};

const RoleComands: IntentCommandWithCallback<GatewayDispatchEvents.IntegrationCreate, APIChatInputApplicationCommandInteraction> = {
    commandConfig: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Commands with roles')
        .addSubcommand(subCommand =>
            subCommand.setName('create')
                .setDescription('Create a new role alias')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the new role')
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to pre populate in role, otherwise its you')
                        .setRequired(false)
                )
        )
        .addSubcommand(subCommand =>
            subCommand.setName('mute')
                .setDescription('Prevent role from being mentioned by bot')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role you want to mute')
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option.setName('unmute')
                        .setDescription('Use this to unmute a role')
                        .setRequired(false)
                )
        )
        .addSubcommandGroup(subGroup =>
            subGroup.setName('user')
                .setDescription('Actions for users on a role')
                .addSubcommand(subCommand =>
                    subCommand.setName('add')
                        .setDescription('Add user to role')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('Role you want to add user to')
                                .setRequired(true)
                        )
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to add to role, otherwise its you')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subCommand =>
                    subCommand.setName('remove')
                        .setDescription('Remove user to role')
                        .addRoleOption(option =>
                            option.setName('role')
                                .setDescription('Role you want to remove user from')
                                .setRequired(true)
                        )
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to remove from role, otherwise its you')
                                .setRequired(false)
                        )
                )
        ),
    callback: commandErrorWrapper(async (event) => {
        const guildId = event.guild?.id;
        if (!guildId) {
            throw new Error('Expected to get a guild id');
        }

        const subCommandGroup = event.options.getSubcommandGroup(false);
        const subCommand = event.options.getSubcommand(true);

        if (!subCommandGroup && subCommand === 'mute') {
            const role = event.options.getRole('role', true);
            const preventMention = !(event.options.getBoolean('unmute'));
            const roleService = getRoleService();
            const isMentionable: MentionableStateType = preventMention ? 'blocked_by_user' : role.mentionable ? 'is_mentionable' : 'blocked_by_discord';
            await roleService.setRoleMentionable(role.id, isMentionable);
            await event.reply({
                content: `${role} is ${isMentionable === 'is_mentionable' ? 'now mentionable.' : 'no longer mentionable.'}`,
                flags: MessageFlags.Ephemeral
            });
        } else if (!subCommandGroup && subCommand === 'create') {
            const roleName = event.options.getString('name', true);
            const user = event.options.getUser('user', false) || event.user;

            const role = await event.guild.roles.create({
                name: roleName,
                permissions: [],
                mentionable: true
            });
            await event.guild.members.addRole({
                role,
                user
            });
            await event.reply({
                content: `Created new role ${role} with ${user}`,
                flags: MessageFlags.Ephemeral
            });
        } else if (subCommandGroup === 'user') {
            const role = event.options.getRole('role', true);
            const user = event.options.getUser('user', false) || event.user;

            // What is permissions? We should check this before adding / removing users
            console.log('Wtf are the roles permissions?:', role.permissions);

            if (subCommand === 'add') {
                await event.guild.members.addRole({
                    role: role.id,
                    user
                });
                await event.reply({
                    content: `Added ${user} to ${role}`,
                    flags: MessageFlags.Ephemeral
                });
            } else if (subCommand === 'remove') {
                await event.guild.members.removeRole({
                    role: role.id,
                    user
                });
                await event.reply({
                    content: `Removed ${user} from ${role}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }),
};

export const ALL_COMMAND_CONFIGS = [
    CreateCurrencyCommand,
    GetAllCurrencies,
    GetBalancesCommand,
    SendCurrencyCommand,
    SetSpamChannel,
    RoleComands
];

const getRestClient = () => {
    return new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
}

export const installGlobalCommands = async () => {
    const commands = ALL_COMMAND_CONFIGS.map(c => c.commandConfig.toJSON());

    const rest = getRestClient();

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