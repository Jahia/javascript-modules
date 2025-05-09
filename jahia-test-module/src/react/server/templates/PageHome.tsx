import { AddResources, Render, Area, jahiaComponent } from "@jahia/javascript-modules-library";
import { footer, header, login } from "./pageComponents";

jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "home",
    displayName: "Home page",
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
          <div className="main">
            <div className="article">
              <Area name={"pagecontent"} />
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
  ),
);
