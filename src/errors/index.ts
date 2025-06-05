
export class AbstractBankError extends Error {
    private user: ToStringAble;

    constructor(context: ErrorMessageContext, errorMessages: Array<string | ErrorMessageFunction>) {
        super(pullRandomMessage(errorMessages, context));
        this.user = context.user;
        this.name = this.constructor.name;
    }

    toString() {
        return `${this.name} caused by ${this.user}: ${this.message}`;
    }
}

export class InsufficientFundsError extends AbstractBankError {
    constructor(context: ErrorMessageContext) {
        super(context, [
            ...GENERAL_ERROR_STATEMENTS,
            ...INSUFFICIENT_FUNDS_ERROR_STATEMENTS
        ]);
    }
}

export class DontGiveYourselfMoneyError extends AbstractBankError {
    constructor(context: ErrorMessageContext) {
        super(context, GENERAL_ERROR_STATEMENTS);
    }
}

export class NoEmojiExistsError extends AbstractBankError {
    constructor(context: ErrorMessageContext) {
        super(context, GENERAL_ERROR_STATEMENTS);
    }
}

type ToStringAble = { toString: () => string } | string;

type ErrorMessageContext = {
    emoji: string,
    user: ToStringAble
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
    ({ user }) => `Hey everyone ${user} is poor!`,
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