import Faucet from "@components/Faucet";
import Section from "@components/Section";
import AddressInput from "@components/DebounceInput";
import useInputWithValidation from "@hooks/useInputWithValidation";
import ValidationMessagesList from "@components/ValidationMessagesList";
import { ADDRESS_VALIDATION_CONFIG } from "@utils/config";
import { type ReactElement } from "react";
import "./style.css";

const FaucetSection = (): ReactElement => {
    const {
        value: address,
        setValue: setAddress,
        isValueValid: isAddressValid,
        validationMessages,
    } = useInputWithValidation(ADDRESS_VALIDATION_CONFIG);

    return (
        <Section title="Address">
            <div className="faucet-section">
                <div className="address-input-block">
                    <AddressInput
                        onChange={setAddress}
                        placeholder={"Address"}
                        helperText={"Paste or Enter your wallet address"}
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
