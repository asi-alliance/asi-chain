import AddressBalance from "@components/AddressBalance";
import LoaderWithLabel from "@components/LoaderWithLabel";
import ValidationMessagesList from "@components/ValidationMessagesList";
import { BALANCE_FAUCET_CEILING, FaucetCoins, FaucetPhases } from "@utils/constants";
import { useFaucetTransactions } from "@context/FaucetTransactionsContext";
import { TValidationMessage } from "@hooks/useAddressInput";
import { faucetTokens, getBalance } from "@api/index";
import { convertCogsToBalance } from "@utils/methods";
import {
    type ReactElement,
    useCallback,
    useEffect,
    useState,
    useRef,
} from "react";
import "./style.css";

export interface IFaucetProps {
    address: string;
}

const Faucet = ({ address }: IFaucetProps): ReactElement => {
    const [errorsList, setErrorsList] = useState<TValidationMessage[]>([]);
    const [addressBalance, setAddressBalance] = useState<number | null>(null);
    const [isAddressBalanceFetching, setIsAddressBalanceFetching] =
        useState<boolean>(false);
    const [faucetPhase, setFaucetPhase] = useState<FaucetPhases>(
        FaucetPhases.ELIGIBILITY_TEST
    );

    const { setLastTransactionHash } = useFaucetTransactions();

    const requestIdRef = useRef(0);

    const updateAddressBalance = useCallback(async () => {
        const requestId = ++requestIdRef.current;

        if (!address) {
            setAddressBalance(null);
            setFaucetPhase(FaucetPhases.ELIGIBILITY_TEST);
            return;
        }

        try {
            setIsAddressBalanceFetching(true);

            const balance = await getBalance(address);

            if (requestId !== requestIdRef.current) {
                return;
            }

            if (balance == null) {
                throw new Error(
                    "Unable to acquire address balance. Please try again…"
                );
            }

            const formattedBalance = convertCogsToBalance(balance);

            setAddressBalance(formattedBalance);

            if (formattedBalance <= BALANCE_FAUCET_CEILING) {
                setFaucetPhase(FaucetPhases.READY_TO_CLAIM);
                setErrorsList([]);
            } else {
                setFaucetPhase(FaucetPhases.ELIGIBILITY_TEST);
                setErrorsList(["Your address is not eligible"]);
            }
        } catch (error) {
            if (requestId !== requestIdRef.current) {
                return;
            }

            console.error(error);

            const message =
                error instanceof Error
                    ? error.message
                    : String(error ?? "Something went wrong...");

            setErrorsList([message]);
            setFaucetPhase(FaucetPhases.ERROR);
        } finally {
            if (requestId === requestIdRef.current) {
                setIsAddressBalanceFetching(false);
            }
        }
    }, [address]);

    useEffect(() => {
        setErrorsList([]);
        setFaucetPhase(FaucetPhases.ELIGIBILITY_TEST);
        updateAddressBalance();
    }, [address, updateAddressBalance]);

    const faucet = async (): Promise<void> => {
        try {
            setFaucetPhase(FaucetPhases.IN_PROGRESS);

            const deployId: string = await faucetTokens(address);

            if (!deployId) {
                throw new Error(
                    "Unable to acquire 'deploy_id'. Please try again..."
                );
            }

            setLastTransactionHash(deployId);
            setFaucetPhase(FaucetPhases.COMPLETED);
        } catch (error) {
            console.error(error);

            const message =
                error instanceof Error
                    ? error.message
                    : String(error ?? "Something went wrong...");

            setErrorsList([message]);
            setFaucetPhase(FaucetPhases.ERROR);
        }
    };

    if (isAddressBalanceFetching) {
        return (
            <LoaderWithLabel
                label="Fetching address balance..."
                aria-busy="true"
            />
        );
    }

    if (faucetPhase === FaucetPhases.IN_PROGRESS) {
        return (
            <LoaderWithLabel label="Initiating faucet..." aria-busy="true" />
        );
    }

    return (
        <div className="faucet">
            <div className="faucet-content">
                {addressBalance != null && (
                    <div className="faucet-with-balance">
                        <div className="address-balance-block">
                            <AddressBalance
                                value={addressBalance}
                                coin={FaucetCoins.REV}
                            />
                        </div>

                        <div className="faucet-initiator">
                            <button
                                onClick={faucet}
                                disabled={
                                    faucetPhase !== FaucetPhases.READY_TO_CLAIM
                                }
                                aria-disabled={
                                    faucetPhase !== FaucetPhases.READY_TO_CLAIM
                                }
                            >
                                FAUCET
                            </button>
                        </div>
                    </div>
                )}

                <div>
                    {faucetPhase === FaucetPhases.COMPLETED && (
                        <div className="faucet-success" role="status">
                            Tokens requested successfully.
                        </div>
                    )}

                    {faucetPhase === FaucetPhases.ERROR && (
                        <div className="faucet-failed" role="alert">
                            Request failed.
                        </div>
                    )}

                    <div className="faucet-errors">
                        <ValidationMessagesList
                            validationMessages={errorsList}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Faucet;
