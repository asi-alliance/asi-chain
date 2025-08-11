import Section from "@components/Section";
import TransactionHashInput from "@components/DebounceInput";
import { useFaucetTransactions } from "@context/FaucetTransactionsContext";
import { type ReactElement } from "react";

const TransactionStatusCheckSection = (): ReactElement => {
    const { lastTransactionHash, setLastTransactionHash } = useFaucetTransactions();

    return (
        <Section title="TX status check">
            <div className="hash-section">
                <div className="hash-input-block">
                    <TransactionHashInput
                        placeholder={"Deploy ID"}
                        helperText={"Paste or enter deploy_id"}
                        initialValue={lastTransactionHash}
                        onChange={setLastTransactionHash}
                    />
                </div>
            </div>
        </Section>
    );
};

export default TransactionStatusCheckSection;
