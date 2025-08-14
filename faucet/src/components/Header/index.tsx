import UserManual from "@components/UserManual";
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
                    <UserManual />
                </div>
            </div>
        </header>
    );
};

export default Header;
