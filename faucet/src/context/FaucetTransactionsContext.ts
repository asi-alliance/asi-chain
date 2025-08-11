import { createContext, Dispatch, SetStateAction, useContext } from "react";

export interface IFaucetTransactionsContextValue {
    lastTransactionHash: string;
    setLastTransactionHash: Dispatch<SetStateAction<string>>;
}

const FaucetTransactionsContext = createContext(
    {} as IFaucetTransactionsContextValue
);

export const useFaucetTransactions = () => useContext(FaucetTransactionsContext);
export default FaucetTransactionsContext;
