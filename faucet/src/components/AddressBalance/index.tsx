import { getBalance } from "@api/index";
import { useCallback, useEffect, useState, type ReactElement } from "react";

export interface IAddressBalanceProps {
    address: string;
}

const AddressBalance = ({ address }: IAddressBalanceProps): ReactElement => {
    const [addressBalance, setAddressBalance] = useState<string>("");

    const updateAddressBalance = useCallback(async () => {
        const balance = await getBalance(address);
        
        if (!balance) {
            // validate output
            return;
        }
        
        setAddressBalance(balance);
    }, [address]);
    
    useEffect(() => {}, [address, updateAddressBalance]);

    if (!addressBalance) {
        return <></>;
    }

    return <div className="addressBalance">{addressBalance}</div>;
};

export default AddressBalance;
