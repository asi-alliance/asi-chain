import LoaderWithLabel from "@components/LoaderWithLabel";
import ValidationMessagesList from "@components/ValidationMessagesList";
import { ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { useFaucetTransactions } from "@context/FaucetTransactionsContext";
import { getTransactionStatus } from "@api/index";
import { isErrorStatus } from "@utils/methods";
import {
    MINUTES_TO_MS_MULTIPLIER,
    POLL_INTERVAL_SEC,
    DeployStatuses,
    MAX_POLL_MS,
} from "@utils/constants";
import "./style.css";

const TransactionStatusChecker = (): ReactElement => {
    const { lastTransactionHash } = useFaucetTransactions();

    const [validationMessages, setValidationMessages] = useState<string[]>([]);
    const [countdown, setCountdown] = useState(POLL_INTERVAL_SEC);
    const [status, setStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const pollIntervalRef = useRef<number | null>(null);
    const countdownRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const inFlightRef = useRef(false);
    const mountedRef = useRef(true);

    const clearTimers = (): void => {
        if (pollIntervalRef.current !== null) {
            clearInterval(pollIntervalRef.current);

            pollIntervalRef.current = null;
        }

        if (countdownRef.current !== null) {
            clearInterval(countdownRef.current);

            countdownRef.current = null;
        }
    };

    const reset = useCallback((hard = false): void => {
        clearTimers();
        setCountdown(POLL_INTERVAL_SEC);

        if (hard) {
            setStatus(null);
            setValidationMessages([]);
        }

        startTimeRef.current = null;
    }, []);

    const stopWithMessage = useCallback((message?: string): void => {
        clearTimers();

        if (message) {
            setValidationMessages(message ? [message] : []);
        }
    }, []);

    const pollStatus = useCallback(async () => {
        if (!lastTransactionHash || inFlightRef.current) {
            return;
        }

        inFlightRef.current = true;

        setIsLoading(true);
        setValidationMessages([]);

        try {
            const { status, msg: errorMessage } = await getTransactionStatus(
                lastTransactionHash
            );

            if (!mountedRef.current) {
                return;
            }

            const nextStatus = status ?? DeployStatuses.UNKNOWN;

            setStatus(nextStatus);
            setValidationMessages(errorMessage ? [errorMessage] : []);

            if (isErrorStatus(nextStatus)) {
                stopWithMessage(
                    errorMessage ||
                        "Polling stopped due to error status returned by node."
                );
            }

            if (status === DeployStatuses.FINALIZED) {
                clearTimers();
            }
        } catch (error) {
            console.error(error);

            if (!mountedRef.current) {
                return;
            }

            setStatus("Error fetching status");
            stopWithMessage(
                "Polling stopped: network or server error while fetching status."
            );
        } finally {
            inFlightRef.current = false;

            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [lastTransactionHash, stopWithMessage]);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;

            clearTimers();
        };
    }, []);

    useEffect(() => {
        if (!lastTransactionHash) {
            reset(true);
            return;
        }

        reset();

        startTimeRef.current = Date.now();

        void pollStatus();

        setCountdown(POLL_INTERVAL_SEC);

        pollIntervalRef.current = window.setInterval(() => {
            if (
                startTimeRef.current &&
                Date.now() - startTimeRef.current >= MAX_POLL_MS
            ) {
                stopWithMessage(
                    `Polling stopped after ${
                        MAX_POLL_MS / MINUTES_TO_MS_MULTIPLIER
                    } minutes.`
                );

                return;
            }

            void pollStatus();
            setCountdown(POLL_INTERVAL_SEC);
        }, POLL_INTERVAL_SEC * 1000);

        countdownRef.current = window.setInterval(() => {
            setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => reset();
    }, [lastTransactionHash, pollStatus, reset, stopWithMessage]);

    if (!lastTransactionHash) {
        return <div />;
    }

    return (
        <div className="status-checker-container">
            <div className="status-checker">
                {isLoading ? (
                    <LoaderWithLabel
                        label="Checking status…"
                        aria-busy="true"
                    />
                ) : (
                    <>
                        <div className={status ?? ""}>
                            <strong>Status:</strong> {status ?? "—"}
                        </div>
                        {lastTransactionHash && !!pollIntervalRef.current && (
                            <div>Next check in: {countdown} sec</div>
                        )}
                    </>
                )}
            </div>
            <ValidationMessagesList validationMessages={validationMessages} />
        </div>
    );
};

export default TransactionStatusChecker;
