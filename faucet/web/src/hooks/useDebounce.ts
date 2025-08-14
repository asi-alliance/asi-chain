import { useEffect } from "react";

export type TDebounceCallback<T> = (value: T) => void;
export const DEFAULT_DEBOUNCE_DELAY = 500;

const useDebounce = <T>(
    value: T,
    callback: TDebounceCallback<T>,
    delay: number = DEFAULT_DEBOUNCE_DELAY
): void => {
    useEffect(() => {
        const handler = setTimeout(() => {
            callback(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, callback, delay]);
};

export default useDebounce;
