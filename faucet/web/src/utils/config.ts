import { type IInputWithValidationConfig } from "@hooks/useInputWithValidation";

const ADDRESS_START_STRING: string = "1111";
const ADDRESS_MINIMUM_LENGTH: number = 50;
const ADDRESS_MAXIMUM_LENGTH: number = 54;
const DEPLOY_ID_MINIMUM_LENGTH: number = 100;
const DEPLOY_ID_MAXIMUM_LENGTH: number = 160;
const ADDRESS_ALPHABET_REGEX: RegExp = /^[a-zA-Z0-9]+$/;
const DEPLOY_ID_ALPHABET_REGEX: RegExp = /^[a-zA-Z0-9]+$/;
const USER_GUIDE_URL: string = "https://asi-testnet.singularitynet.io/faucet/";

const BASE_URL: string = (
    (import.meta.env.VITE_BASE_URL || "").trim() || "http://localhost:3001"
).replace(/\/+$/, "");

const FAUCET_BALANCE_LIMIT: number = Number(
    (import.meta.env.VITE_FAUCET_BALANCE_LIMIT || "").trim() || "20000"
);

const REV_DECIMALS: number = Number(
    (import.meta.env.VITE_TOKEN_DECIMALS || "").trim() || "9"
);

const ADDRESS_VALIDATION_CONFIG: IInputWithValidationConfig = {
    shouldStartWith: ADDRESS_START_STRING,
    minimumLength: ADDRESS_MINIMUM_LENGTH,
    maximumLength: ADDRESS_MAXIMUM_LENGTH,
    alphabetRegex: ADDRESS_ALPHABET_REGEX,
    regexHint: "[0-9], [a-z], [A-Z]",
};

const DEPLOY_ID_VALIDATION_CONFIG: IInputWithValidationConfig = {
    minimumLength: DEPLOY_ID_MINIMUM_LENGTH,
    maximumLength: DEPLOY_ID_MAXIMUM_LENGTH,
    alphabetRegex: DEPLOY_ID_ALPHABET_REGEX,
    regexHint: "[0-9], [a-z], [A-Z]",
};

export {
    BASE_URL,
    FAUCET_BALANCE_LIMIT,
    ADDRESS_VALIDATION_CONFIG,
    DEPLOY_ID_VALIDATION_CONFIG,
    USER_GUIDE_URL,
    REV_DECIMALS,
};
