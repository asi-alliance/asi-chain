import Faucet from "@components/Faucet";
import Section from "@components/Section";
import useAddressInput from "@hooks/useAddressInput";
import AddressInput from "@components/DebounceInput";
import ValidationMessagesList from "@components/ValidationMessagesList";
import { type ReactElement } from "react";
import "./style.css";

const FaucetSection = (): ReactElement => {
    const { address, setAddress, isAddressValid, validationMessages } =
        useAddressInput();    

    return (
        <Section title="Address">
            <div className="faucet-section">
                <div className="address-input-block">
                    <AddressInput
                        onChange={setAddress}
                        placeholder={"Address"}
                        helperText={"Paste or Enter network Address"}
                    />
                </div>
                <div className="faucet-initiator-block">
                    {isAddressValid && <Faucet address={address} />}
                </div>
                <div className="address-validation-messages-block">
                    <ValidationMessagesList
                        validationMessages={validationMessages}
                    />
                </div>
            </div>
        </Section>
    );
};

export default FaucetSection;
