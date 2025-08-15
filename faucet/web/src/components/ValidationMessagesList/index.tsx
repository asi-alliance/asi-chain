import { type ReactNode } from "react";
import "./style.css";

export type TValidationMessage = string;

export interface IValidationMessagesListProps {
    validationMessages: TValidationMessage[];
}

const ValidationMessagesList = ({
    validationMessages,
}: IValidationMessagesListProps): ReactNode => {
    if (!validationMessages?.length) {
        return null;
    }

    return (
        <ul className="validation-messages-block">
            {validationMessages.map((message: TValidationMessage) => (
                <li className="validation-message" key={message}>
                    {message}
                </li>
            ))}
        </ul>
    );
};

export default ValidationMessagesList;
