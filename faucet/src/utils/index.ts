const DECIMALS = 8;

export const formatBalance = (balance: number): number => {    
    return Math.round(balance / Math.pow(10, DECIMALS));
};
