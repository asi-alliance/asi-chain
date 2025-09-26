import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdvancedSearch from "./AdvancedSearch";
import ConnectionStatus from "./ConnectionStatus";

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (href: string) => {
        if (href === "/") {
            return location.pathname === "/";
        }
        return location.pathname.startsWith(href);
    };

    const navigation = [
        { name: "Blocks", href: "/" },
        { name: "Transactions", href: "/transactions" },
        { name: "REV Transfers", href: "/transfers" },
        { name: "Deployments", href: "/deployments" },
        { name: "Validators", href: "/validators" },
        { name: "Statistics", href: "/statistics" },
        { name: "Indexer", href: "/indexer-status" },
    ];

    const goHome = () => {
        navigate("/");
    };

    return (
        <div className="container">
            <header>
                <div className="header-container">
                    <div className="header-left" onClick={goHome}>
                        <div className="logo-image">
                            <svg
                                width="186"
                                height="126"
                                viewBox="0 0 186 126"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M0.473633 63.0687C0.473633 51.6685 9.70995 42.4211 21.1101 42.4211C32.5103 42.4211 41.7596 33.1829 41.7596 21.7827C41.7596 10.3844 51.0071 1.13504 62.4073 1.13504C73.8075 1.13504 83.0438 10.3844 83.0438 21.7827C83.0438 33.1829 73.8075 42.4211 62.4073 42.4211C51.0071 42.4211 41.7596 51.6685 41.7596 63.0687C41.7596 74.4689 51.0071 83.7052 62.4073 83.7052C73.8075 83.7052 83.0438 92.9545 83.0438 104.355C83.0438 115.753 73.8075 124.991 62.4073 124.991C51.0071 124.991 41.7596 115.753 41.7596 104.355C41.7596 92.9545 32.5103 83.7052 21.1101 83.7052C9.70995 83.7052 0.473633 74.4689 0.473633 63.0687Z"
                                    fill="var(--off-white)"
                                />
                                <path
                                    d="M185.525 63.0576C185.525 74.4577 176.289 83.7052 164.889 83.7052C153.489 83.7052 144.241 92.9434 144.241 104.344C144.241 115.742 134.992 124.991 123.592 124.991C112.191 124.991 102.955 115.742 102.955 104.344C102.955 92.9434 112.191 83.7052 123.592 83.7052C134.992 83.7052 144.241 74.4577 144.241 63.0576C144.241 51.6574 134.992 42.4211 123.592 42.4211C112.191 42.4211 102.955 33.1717 102.955 21.7716C102.955 10.3732 112.191 1.13504 123.592 1.13504C134.992 1.13504 144.241 10.3732 144.241 21.7716C144.241 33.1717 153.489 42.4211 164.889 42.4211C176.289 42.4211 185.525 51.6574 185.525 63.0576Z"
                                    fill="var(--off-white)"
                                />
                                <path
                                    d="M93.1989 82.8094C104.278 82.8094 113.26 73.8274 113.26 62.7482C113.26 51.6672 104.278 42.6852 93.1989 42.6852C82.1179 42.6852 73.1377 51.6672 73.1377 62.7482C73.1377 73.8274 82.1179 82.8094 93.1989 82.8094Z"
                                    fill="var(--off-white)"
                                />
                            </svg>
                        </div>
                        <h1 style={{ marginBottom: 0 }}>ASI Block Explorer</h1>
                    </div>
                    <div className="header-right">
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "1rem",
                                maxWidth: "400px",
                                flex: "1",
                            }}
                        >
                            <AdvancedSearch
                                onResultSelect={(result) => {
                                    // Navigate to search results page with the query
                                    navigate(
                                        `/search?q=${encodeURIComponent(
                                            result.title
                                        )}`
                                    );
                                }}
                                embedded={true}
                                placeholder="Search blocks, transfers, addresses..."
                            />
                        </div>
                        <ConnectionStatus
                            position="inline"
                            showDetails={false}
                            size="sm"
                        />
                    </div>
                </div>

                {/* Navigation Tabs */}
                <nav className="nav-tabs">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={`nav-tab ${
                                isActive(item.href) ? "active" : ""
                            }`}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>
            </header>

            <main className="fade-in">{children}</main>
        </div>
    );
};

export default Layout;
