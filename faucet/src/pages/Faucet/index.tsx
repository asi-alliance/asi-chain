import DefaultLayout from "@layouts/DefaultLayout";
import FaucetSection from "@components/FaucetSection";
import FaucetTransactionsContext from "@context/FaucetTransactionsContext";
import TransactionStatusCheckSection from "@components/TransactionStatusCheckSection";
import { useState, type ReactElement } from "react";
import "./style.css";

const FaucetPage = (): ReactElement => {
    const [lastTransactionHash, setLastTransactionHash] = useState<string>("");

    return (
        <DefaultLayout>
            <FaucetTransactionsContext.Provider
                value={{ lastTransactionHash, setLastTransactionHash }}
            >
                <div className="faucet-page">
                    <FaucetSection />
                    <TransactionStatusCheckSection />
                </div>
            </FaucetTransactionsContext.Provider>
        </DefaultLayout>
    );
};

export default FaucetPage;
