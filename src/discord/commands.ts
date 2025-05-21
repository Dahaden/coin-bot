import 'dotenv/config';
import { REST, Routes, APIApplicationCommand, ApplicationCommandType, ApplicationCommandOptionType } from 'discord.js';

type CreateApplicationCommand = Omit<
    APIApplicationCommand, 
    'id' | 'application_id' | 'version' | 'default_member_permissions'
>;

export const installGlobalCommands = async () => {
    const commands: CreateApplicationCommand[] = [
        {
          name: 'create',
          description: 'Create a bank',
          type: ApplicationCommandType.ChatInput,
          options: [
            {
                name: 'bank_manager',
                description: 'Manager of the bank and initial coins',
                required: true,
                type: ApplicationCommandOptionType.User
            },
            {
                name: 'initial_coins',
                description: 'Number of coins this bank has',
                required: true,
                type: ApplicationCommandOptionType.Integer
            },
            {
                name: 'bank_name',
                description: 'Bank name',
                required: true,
                type: ApplicationCommandOptionType.String
            },
            {
                name: 'associated_emoji',
                description: 'Emoji used to send coins',
                required: true,
                type: ApplicationCommandOptionType.String
            }
          ]
        },
        {
            name: 'send',
            description: 'Send many coins to someone',
            type: ApplicationCommandType.ChatInput,
            options: [
                {
                    name: 'associated_emoji',
                    description: 'The emoji used for the bank',
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: 'user',
                    description: 'The user you want to send coins too',
                    required: true,
                    type: ApplicationCommandOptionType.User
                },
                {
                    name: 'Number of coins',
                    description: 'Number of coins you want to send',
                    required: true,
                    type: ApplicationCommandOptionType.Integer
                }
            ]
        }
      ];
      
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
      
      try {
        console.log('Started refreshing application (/) commands.');
      
        await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), { body: commands });
      
        console.log('Successfully reloaded application (/) commands.');
      } catch (error) {
        console.error(error);
      }
}