import DefaultLayout from "@layouts/DefaultLayout";
import FaucetSection from "@sections/FaucetSection";
import FaucetTransactionsContext from "@context/FaucetTransactionsContext";
import TransactionStatusCheckSection from "@sections/TransactionStatusCheckSection";
import { useState, type ReactElement } from "react";
import "./style.css";

const FaucetPage = (): ReactElement => {
    const [lastTransactionHash, setLastTransactionHash] = useState<string>("");
    const [isFlowCompleted, setIsFlowCompleted] = useState<boolean>(false);

    return (
        <DefaultLayout>
            <FaucetTransactionsContext.Provider
                value={{ lastTransactionHash, isFlowCompleted, setLastTransactionHash, setIsFlowCompleted }}
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
