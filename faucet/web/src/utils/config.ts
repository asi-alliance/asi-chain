const BASE_URL = (
    (import.meta.env.VITE_BASE_URL || "").trim() || "http://localhost:3000"
).replace(/\/+$/, "");

const FAUCET_BALANCE_REV_LIMIT = Number(
    (import.meta.env.VITE_FAUCET_BALANCE_REV_LIMIT || "").trim() || "2000"
);

const REV_DECIMALS = Number(
    (import.meta.env.VITE_REV_DECIMALS || "").trim() || "9"
);

export { BASE_URL, FAUCET_BALANCE_REV_LIMIT, REV_DECIMALS };