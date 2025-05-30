import { AddResources, Area, jahiaComponent, Render } from "@jahia/javascript-modules-library";
import { footer, header, login } from "./pageComponents";

jahiaComponent(
  {
    nodeType: "jnt:event",
    name: "default",
    displayName: "Default event template",
    componentType: "template",
  },

  (_, { currentResource }) => {
    return (
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
            <div className="main">
              <div className="article">
                <Render path={currentResource.getNode().getPath()} />
              </div>
              <div className="aside">
                <Area name={"aside"} />
              </div>
            </div>
            <div className="footer">
              <div className="footerContent">
                <Render content={footer} />
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  },
);
