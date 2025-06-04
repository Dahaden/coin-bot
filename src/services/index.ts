import { Bank } from './bank';
import { GuildService } from './guild';

export const getBank = () => {
    return new Bank();
}

export const getGuildService = () => {
    return new GuildService();
}