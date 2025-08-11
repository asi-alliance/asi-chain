import UserManualEntry from "@components/UserManualEntry";
import { type ReactElement } from "react";
import "./style.css";

const Header = (): ReactElement => {
    return (
        <header>
            <div className="content-container">
                <div className="header-content">
                    <h2>
                        MettaCycle Faucet
                    </h2>
                    <UserManualEntry />
                </div>
            </div>
        </header>
    );
};

export default Header;
