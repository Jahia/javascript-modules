import {
  AddContentButtons,
  getChildNodes,
  jahiaComponent,
  Render,
} from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

jahiaComponent(
  {
    name: "default",
    nodeType: "$MODULE:helloWorld",
    displayName: "Hello World Component",
    componentType: "view",
  },
  ({ name }, { renderContext, currentNode }) => (
    <section className={classes.section}>
      <h2>
        Hello <mark className={classes.brush}>{name}</mark>!
        {renderContext.isEditMode() && <span> ↫ Double click to change it</span>}
      </h2>
      <p>
        Welcome to Jahia! You successfully created a new JavaScript Module and a Jahia Website built
        with it. Here are a few things you can do now:
      </p>
      <div className={classes.grid}>
        {getChildNodes(currentNode, -1, 0, (node) => node.isNodeType("jnt:content")).map((node) => (
          <Render key={node.getIdentifier()} node={node} />
        ))}
        <AddContentButtons />
      </div>
      <footer>
        <p>
          Illustrations by <a href="https://undraw.co/">Katerina Limpitsouni</a>
        </p>
      </footer>
    </section>
  ),
);
