import { jahiaComponent, RenderChildren } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

interface Props {
  notice: string;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "hydrogen:footer",
    displayName: "Default Footer",
  },
  ({ notice }: Props, { renderContext }) => {
    return (
      <footer className={classes.footer}>
        {/* In edition mode, links are piled up to make edition easier */}
        <nav style={{ flexDirection: renderContext.isEditMode() ? "column" : "row" }}>
          <RenderChildren />
        </nav>
        <p>
          © {new Date().getFullYear()} {notice}
        </p>
      </footer>
    );
  },
);
