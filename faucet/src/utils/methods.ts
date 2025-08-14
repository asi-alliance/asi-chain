import { REV_DECIMALS } from "./config";

const POWER_BASE: number = 10;

const convertCogsToBalance = (cogs: number): number => {
    return Math.round(cogs / Math.pow(POWER_BASE, REV_DECIMALS));
};

const convertBalanceToCogs = (balance: number): number => {
    return Math.round(balance * Math.pow(POWER_BASE, REV_DECIMALS));
};

const isErrorStatus = (status: string) =>
    /_ERROR$/i.test(status) || /Error$/i.test(status);

export { convertBalanceToCogs, convertCogsToBalance, isErrorStatus };
