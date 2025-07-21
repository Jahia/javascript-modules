import { AddResources, Area, jahiaComponent, Render } from "@jahia/javascript-modules-library";
import { footer, header, login } from "./pageComponents";

jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "boundComponent",
    displayName: "Bound component page",
    componentType: "template",
  },
  () => (
    <html lang="en">
      <head>
        <AddResources type={"css"} resources={"styles.css"} />
      </head>
      <body>
        <div className="page">
          <div className="header">
            <div className="headerContent">
              <Render content={header} />
            </div>
            <div className="headerLogin">
              <Render content={login} />
            </div>
          </div>
        </div>
        <div className="main">
          <div className="article">
            <Area name={"events"} allowedNodeTypes={["jnt:event"]} />
          </div>
          <div className="aside">
            <Render
              content={{
                name: "boundComponentTest",
                nodeType: "javascriptExample:testBoundComponent",
                boundComponentRelativePath: "/events",
              }}
            />
          </div>
        </div>
        <div className="footer">
          <div className="footerContent">
            <Render content={footer} />
          </div>
        </div>
      </body>
    </html>
  ),
);
