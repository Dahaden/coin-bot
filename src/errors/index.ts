
export class AbstractBankError extends Error {

}

export class InsufficientFundsError extends AbstractBankError {
    constructor(context: ErrorMessageContext) {
        super(pullRandomMessage([
            ...GENERAL_ERROR_STATEMENTS,
            ...INSUFFICIENT_FUNDS_ERROR_STATEMENTS
        ], context)
        );
    }
}

export class DontGiveYourselfMoneyError extends AbstractBankError {
    constructor(context: ErrorMessageContext) {
        super(pullRandomMessage(GENERAL_ERROR_STATEMENTS, context));
    }
}

export class NoEmojiExistsError extends AbstractBankError {
    constructor(context: ErrorMessageContext) {
        super(pullRandomMessage(GENERAL_ERROR_STATEMENTS, context));
    }
}

type ErrorMessageContext = {
    emoji: string,
    user: string
};
type ErrorMessageFunction = (context: ErrorMessageContext) => string;

const GENERAL_ERROR_STATEMENTS: Array<string | ErrorMessageFunction> = [
    'Thats the pits',
    'rats...',
    "Don't be a weasel",
    '(╯°□°）╯︵ ┻━┻',
    ({ emoji }) => `(╯°□°）╯︵ ${emoji}`
];

const INSUFFICIENT_FUNDS_ERROR_STATEMENTS: Array<string | ErrorMessageFunction> = [
    ({ user }) => `Hey @everyone ${user} is poor!`,
    ({ emoji }) => `mOAR ${emoji} iS rEQUiRed`.split('')
        .map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase())
        .join()
];

const pullRandomMessage = (errorMessages: Array<string | ErrorMessageFunction>, context: ErrorMessageContext) => {
    const position = Math.floor(Math.random() * errorMessages.length);
    if (typeof errorMessages[position] === 'string') {
        return errorMessages[position];
    } else {
        return errorMessages[position](context)
    }
};