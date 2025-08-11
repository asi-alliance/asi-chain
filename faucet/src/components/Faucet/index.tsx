import AddressBalance from "@components/AddressBalance";
import { type ReactElement } from "react";
import "./style.css";

export interface IFaucetProps {
    address: string;
}

const Faucet = ({ address }: IFaucetProps): ReactElement => {
    return (
        <div className="faucet">
            <div className="address-balance-block">
                Faucet
                <AddressBalance address={address} />
            </div>

        </div>
    );
};

export default Faucet;
