import { type TValidationMessage } from "@components/ValidationMessagesList";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";

export interface IInputWithValidationConfig {
    shouldStartWith?: string;
    minimumLength?: number;
    maximumLength?: number;
    alphabetRegex?: RegExp;
    regexHint?: string;
}

export interface IInputWithValidation {
    value: string;
    isValueValid: boolean;
    setValue: Dispatch<SetStateAction<string>>;
    validationMessages: string[];
}

const useInputWithValidation = (
    config: IInputWithValidationConfig
): IInputWithValidation => {
    const [value, setValue] = useState<string>("");

    const { validationMessages, isValueValid } = useMemo(() => {
        const currentValue = value.trim();
        const validationMessages: TValidationMessage[] = [];

        if (!currentValue?.length) {
            return { validationMessages, isValueValid: false };
        }

        if (
            config.shouldStartWith &&
            !currentValue.startsWith(config.shouldStartWith)
        ) {
            validationMessages.push(
                `Your input must start with ${config.shouldStartWith}`
            );
        }

        if (
            config.minimumLength &&
            currentValue.length < config.minimumLength
        ) {
            validationMessages.push(
                `Length must be at least ${config.minimumLength} chars`
            );
        }

        if (
            config.maximumLength &&
            currentValue.length > config.maximumLength
        ) {
            validationMessages.push(
                `Length must be less than ${config.maximumLength + 1} chars`
            );
        }

        if (config.alphabetRegex && !config.alphabetRegex.test(currentValue)) {
            validationMessages.push(
                config.regexHint?.length
                    ? `Only ${config.regexHint} symbols allowed`
                    : `Must not contain unsupported characters`
            );
        }

        const isValueValid: boolean =
            !!value.length && !validationMessages?.length;

        return { validationMessages, isValueValid };
    }, [value, config]);

    return {
        value,
        setValue,
        isValueValid,
        validationMessages,
    };
};

export default useInputWithValidation;
