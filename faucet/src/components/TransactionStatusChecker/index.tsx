import ValidationMessagesList from "@components/ValidationMessagesList";
import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { useFaucetTransactions } from "@context/FaucetTransactionsContext";
import { getTransactionStatus } from "@api/index";

const POLL_INTERVAL = 30;

// const enum DeployStatuses {
//     Finalized = "Finalized",
//     FinalizationError = "FinalizationError",
//     Finalizing = "Finalizing",
//     DeployError = "DeployError",
//     Deploying = "Deploying",
//     Unknown = "Unknown",
// }

const TransactionStatusChecker = (): ReactElement => {
    const { lastTransactionHash } = useFaucetTransactions();
    const [validationMessages, setValidationMessages] = useState<string[]>([]);
    const [countdown, setCountdown] = useState(POLL_INTERVAL);
    const [status, setStatus] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    const reset = (): void => {
        // setStatus(null);
        setCountdown(POLL_INTERVAL);

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }
    };

    const pollStatus = useCallback(async () => {
        setStatus(null);
        setValidationMessages([]);

        if (!lastTransactionHash) {
            return;
        }

        try {
            const { status } = await getTransactionStatus(
                lastTransactionHash
            );

            console.log(status);

            // if (msg) {
            //     setValidationMessages([msg]);
            // }

            if (!status) {
                throw new Error("Error on get TX Status");
            }

            setStatus(status || "Unknown");

            // if (
            //     status === DeployStatuses.DeployError ||
            //     status === DeployStatuses.Finalized
            // ) {
            //     reset();
            // }
        } catch (error) {
            console.error(error);
            setStatus("Error fetching status");
        }
    }, [lastTransactionHash]);

    useEffect(() => {
        if (!lastTransactionHash) {
            reset();

            return;
        }

        pollStatus();
        setCountdown(POLL_INTERVAL);

        intervalRef.current = setInterval(() => {
            pollStatus();
            setCountdown(POLL_INTERVAL);
        }, POLL_INTERVAL * 1000);

        countdownRef.current = setInterval(() => {
            setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => reset();
    }, [lastTransactionHash, pollStatus]);

    if (!lastTransactionHash) {
        return <div></div>;
    }

    return (
        <div className="status-checker-container">
            <div className="status-checker">
                <div>
                    <strong>Status:</strong> {status || "—"}
                </div>
                {lastTransactionHash && (
                    <div>Next check in: {countdown} sec</div>
                )}
            </div>
            <ValidationMessagesList validationMessages={validationMessages} />
        </div>
    );
};

export default TransactionStatusChecker;
