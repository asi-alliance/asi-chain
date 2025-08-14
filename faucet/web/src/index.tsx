import Application from "@components/Application";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

const rootElement: HTMLElement | null = document.getElementById("root");

if (!rootElement) {
    throw new Error("Cannot acquire #root element, Aborting...");
}

const reactRoot: Root = createRoot(rootElement);

reactRoot.render(
    <StrictMode>
        <Application />
    </StrictMode>
);
