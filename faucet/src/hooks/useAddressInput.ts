import {
    Dispatch,
    SetStateAction,
    useCallback,
    useEffect,
    useState,
} from "react";

export interface IAddressInput {
    address: string;
    isAddressValid: boolean;
    setAddress: Dispatch<SetStateAction<string>>;
    validationMessages: string[];
}

export type TValidationMessage = string;
const ADDRESS_START_STRING: string = "1111";
const ADDRESS_MINIMUM_LENGTH: number = 50;
const ADDRESS_MAXIMUM_LENGTH: number = 54;
const ADDRESS_ALPHABET_REGEX = new RegExp(/^[a-zA-Z0-9]+$/);

const useAddressInput = () => {
    const [address, setAddress] = useState<string>("");
    const [isAddressValid, setIsAddressValid] = useState<boolean>(false);
    const [validationMessages, setValidationMessages] = useState<
        TValidationMessage[]
    >([]);

    const addValidationMessage = (message: TValidationMessage): void => {
        setValidationMessages((previousMessages) => [
            ...previousMessages,
            message,
        ]);
    };

    const validateAddress = useCallback((): void => {
        setValidationMessages([]);

        if (!address?.length) {
            return;
        }

        if (!address.startsWith(ADDRESS_START_STRING)) {
            addValidationMessage("Address must start with 1111");
        }

        if (
            address.length < ADDRESS_MINIMUM_LENGTH ||
            address.length > ADDRESS_MAXIMUM_LENGTH
        ) {
            addValidationMessage("Address length must be from 50 to 54 chars");
        }

        if (!ADDRESS_ALPHABET_REGEX.test(address)) {
            addValidationMessage("Only [0-9], [a-z], [A-Z] symbols allowed");
        }
    }, [address]);

    useEffect(() => {
        validateAddress();
    }, [address, validateAddress]);

    useEffect(() => {
        if (!validationMessages?.length && address?.length) {
            setIsAddressValid(true);
            return;
        }

        setIsAddressValid(false);
    }, [address, validationMessages]);

    return {
        address,
        setAddress,
        isAddressValid,
        validationMessages,
    };
};

export default useAddressInput;
