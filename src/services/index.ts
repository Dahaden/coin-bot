import { Bank } from './bank';
import { GuildService } from './guild';
import { Role } from './roles';

export const getBank = () => {
    return new Bank();
}

export const getGuildService = () => {
    return new GuildService();
}

export const getRoleService = () => {
    return new Role();
}