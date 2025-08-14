import useDebounce from "@hooks/useDebounce";
import { useState, type ReactElement } from "react";
import "./style.css";

export interface IDebounceInputProps {
    helperText: string;
    placeholder: string;
    initialValue?: string;
    onChange: (value: string) => void;
}

const DebounceInput = ({
    placeholder,
    helperText,
    initialValue = "",
    onChange,
}: IDebounceInputProps): ReactElement => {
    const [value, setValue] = useState<string>(initialValue);

    useDebounce(value, (newValue) => {
        onChange(newValue);
    });

    return (
        <div className="debounce-input-container">
            <div className="input-holder">
                <input
                    type="text"
                    id="addressInput"
                    name="addressInput"
                    value={value}
                    placeholder={placeholder}
                    onChange={(event) => setValue(event.target.value)}
                />
            </div>
            <p className="helper-text">{helperText}</p>
        </div>
    );
};

export default DebounceInput;
