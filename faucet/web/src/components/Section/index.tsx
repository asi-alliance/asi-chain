import { type ReactElement } from "react";
import "./style.css";

export interface ISectionProps {
    title: string;
    children: ReactElement;
}

const Section = ({ title, children }: ISectionProps): ReactElement => {
    return (
        <section>
            <h3>{title}</h3>
            <div className="section-content">{children}</div>
        </section>
    );
};

export default Section;
