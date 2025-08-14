import Header from "@components/Header";
import { type ReactNode, type ReactElement } from "react";
import "./style.css";

export interface IDefaultLayoutProps {
    children: ReactElement | ReactNode;
}

const DefaultLayout = ({ children }: IDefaultLayoutProps): ReactElement => {
    return (
        <div className="default-layout">
            <Header />
            <main className="content-container">{children}</main>
        </div>
    );
};

export default DefaultLayout;
