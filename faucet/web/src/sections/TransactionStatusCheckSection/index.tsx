import Section from "@components/Section";
import TransactionHashInput from "@components/DebounceInput";
import useInputWithValidation from "@hooks/useInputWithValidation";
import ValidationMessagesList from "@components/ValidationMessagesList";
import TransactionStatusChecker from "@components/TransactionStatusChecker";
import { useFaucetTransactions } from "@context/FaucetTransactionsContext";
import { DEPLOY_ID_VALIDATION_CONFIG } from "@utils/config";
import { type ReactElement } from "react";
import "./style.css";

const TransactionStatusCheckSection = (): ReactElement => {
    const { lastTransactionHash, setLastTransactionHash } =
        useFaucetTransactions();

    const { setValue, isValueValid, validationMessages } =
        useInputWithValidation(DEPLOY_ID_VALIDATION_CONFIG);

    const updateTransactionHash = (hash: string): void => {
        setLastTransactionHash(hash);
        setValue(hash);
    };

    return (
        <Section title="TX status check">
            <div className="hash-section">
                <div className="hash-input-block">
                    <TransactionHashInput
                        key={lastTransactionHash}
                        placeholder="Deploy ID"
                        helperText="Paste or enter deploy_id"
                        initialValue={lastTransactionHash}
                        onChange={updateTransactionHash}
                    />
                </div>

                {isValueValid && (
                    <div className="hash-section-controls">
                        <TransactionStatusChecker />
                    </div>
                )}
                <div className="hash-validation-messages-block">
                    <ValidationMessagesList
                        validationMessages={validationMessages}
                    />
                </div>
            </div>
        </Section>
    );
};

export default TransactionStatusCheckSection;
