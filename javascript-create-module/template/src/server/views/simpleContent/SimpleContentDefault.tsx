import {
  AddContentButtons,
  getChildNodes,
  HydrateInBrowser,
  jahiaComponent,
  Render,
} from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import SampleClientComponent from "$client/SampleClientComponent.jsx";

jahiaComponent(
  {
    name: "default",
    nodeType: "$MODULE:helloWorld",
    displayName: "Hello World Component",
    componentType: "view",
  },
  ({ name }, { renderContext, currentNode }) => (
    <>
      <section className={classes.section}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2>
            Hello <mark className={classes.brush}>{name}</mark>!
          </h2>
          {renderContext.isEditMode() && (
            <div class={classes.addContent} style={{ alignItems: "center" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="80"
                height="16"
                viewBox="0 0 96.348 22.238"
                aria-hidden="true"
              >
                <g stroke-linecap="round">
                  <path
                    fill="none"
                    stroke="#1e1e1e"
                    stroke-width="2"
                    d="M86.345 11.23c-12.74-.17-63.15-.35-75.98-.4m74.57-.83c-12.85-.02-62.22 1.88-74.94 2.24"
                  />
                  <path
                    fill="none"
                    stroke="#1e1e1e"
                    stroke-width="2"
                    d="M33.195 2.91c-8.65 5.11-16.55 6.67-23.2 9.33m23.2-9.33c-6.99 1.8-13.6 4.46-23.2 9.33M33.765 20c-8.89-.83-16.99-5.23-23.77-7.76M33.765 20c-7.16-3.11-13.93-5.36-23.77-7.76"
                  />
                </g>
              </svg>
              Double-click to edit the name
            </div>
          )}
        </div>
        <p>
          <HydrateInBrowser child={SampleClientComponent} />
        </p>
        <p>
          Welcome to Jahia! You successfully created a new JavaScript Module and a Jahia Website
          built with it. Here are a few things you can do now:
        </p>
        <div className={classes.grid}>
          {getChildNodes(currentNode, -1, 0, (node) => node.isNodeType("jnt:content")).map(
            (node) => (
              <Render key={node.getIdentifier()} node={node} />
            ),
          )}
          <AddContentButtons />
        </div>
        <footer>
          <p>
            Illustrations by <a href="https://undraw.co/">Katerina Limpitsouni</a>
          </p>
        </footer>
      </section>
      {renderContext.isEditMode() && (
        <div class={classes.addContent} style={{ marginLeft: "calc(50% - 0.5rem)" }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="70"
            height="100"
            viewBox="0 3 70 105"
            aria-hidden="true"
          >
            <g stroke-linecap="round">
              <path
                fill="none"
                stroke="#1e1e1e"
                stroke-width="2"
                d="M57.945 10.544c-5.9 1.89-27.68-6.24-35.6 9.55-7.93 15.78-10.02 71.2-11.93 85.14m49.57-95.23c-5.95 2.17-29.94-3.95-38.27 11.63-8.33 15.58-9.43 68.03-11.71 81.87"
              />
              <path
                fill="none"
                stroke="#1e1e1e"
                stroke-width="2"
                d="M3.685 79.314c3.06 7.26 3.1 13.62 6.32 24.19m-6.32-24.19c3.29 9.67 4.37 19.65 6.32 24.19M20.715 80.914c-1.32 6.81-5.67 12.75-10.71 22.59m10.71-22.59c-3.47 8.99-9.13 18.33-10.71 22.59"
              />
            </g>
          </svg>
          Click this button to add a new content node
        </div>
      )}
    </>
  ),
);
