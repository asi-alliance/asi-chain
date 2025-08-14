import { type Dispatch, type SetStateAction, useMemo, useState } from "react";

export interface IAddressInput {
    address: string;
    isAddressValid: boolean;
    setAddress: Dispatch<SetStateAction<string>>;
    validationMessages: string[];
}

export type TValidationMessage = string;

const ADDRESS_START_STRING = "1111";
const ADDRESS_MINIMUM_LENGTH = 50;
const ADDRESS_MAXIMUM_LENGTH = 54;
const ADDRESS_ALPHABET_REGEX = /^[a-zA-Z0-9]+$/;

const useAddressInput = () => {
    const [address, setAddress] = useState<string>("");

    const { messages, isValid } = useMemo(() => {
        const v = address.trim();
        const msgs: TValidationMessage[] = [];

        if (v.length) {
            if (!v.startsWith(ADDRESS_START_STRING)) {
                msgs.push("Address must start with 1111");
            }

            if (
                v.length < ADDRESS_MINIMUM_LENGTH ||
                v.length > ADDRESS_MAXIMUM_LENGTH
            ) {
                msgs.push(
                    `Address length must be from ${ADDRESS_MINIMUM_LENGTH} to ${ADDRESS_MAXIMUM_LENGTH} chars`
                );
            }

            if (!ADDRESS_ALPHABET_REGEX.test(v)) {
                msgs.push("Only [0-9], [a-z], [A-Z] symbols allowed");
            }
        }

        return { messages: msgs, isValid: v.length > 0 && msgs.length === 0 };
    }, [address]);

    return {
        address,
        setAddress,
        isAddressValid: isValid,
        validationMessages: messages,
    };
};

export default useAddressInput;
