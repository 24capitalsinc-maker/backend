export const generateAccountNumber = (): string => {
    // Generates a 10-digit account number starting with '10' (optimanexgen)
    // '10' + 8 random digits
    return '10' + Math.floor(10000000 + Math.random() * 90000000).toString();
};
