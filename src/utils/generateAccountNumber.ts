export const generateAccountNumber = (): string => {
    // Generates a 10-digit account number starting with '24' (Capital24)
    // '24' + 8 random digits
    return '24' + Math.floor(10000000 + Math.random() * 90000000).toString();
};
