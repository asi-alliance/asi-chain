import { FAUCET_BALANCE_LIMIT } from "./config";

const BALANCE_FAUCET_CEILING: number = FAUCET_BALANCE_LIMIT;
const MINUTES_TO_MS_MULTIPLIER: number = 60 * 1000;
const MAX_POLL_MS: number = 7 * MINUTES_TO_MS_MULTIPLIER;
const POLL_INTERVAL_SEC: number = 30;

const enum FaucetCoins {
    REV = "REV",
    ASI = "ASI",
}

const enum FaucetPhases {
    ELIGIBILITY_TEST = "ELIGIBILITY_TEST",
    READY_TO_CLAIM = "READY_TO_CLAIM",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    ERROR = "ERROR",
}

enum DeployStatuses {
    DEPLOYING = "Deploying",
    FINALIZED = "Finalized",
    FINALIZING = "Finalizing",
    FINALIZATION_ERROR = "FinalizationError",
    DEPLOY_ERROR = "DeployError",
    UNKNOWN = "Unknown",
}

export {
    MAX_POLL_MS,
    POLL_INTERVAL_SEC,
    BALANCE_FAUCET_CEILING,
    MINUTES_TO_MS_MULTIPLIER,
    FaucetCoins,
    FaucetPhases,
    DeployStatuses,
};
