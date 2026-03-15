export const generateTransactionRef = (): string => {
    return 'TRX-' + Math.random().toString(36).substring(2, 11).toUpperCase();
};
