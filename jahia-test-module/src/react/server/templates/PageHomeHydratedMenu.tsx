import { AddResources, Area, jahiaComponent, Render } from "@jahia/javascript-modules-library";
import { footer, header, hydratedNavMenu, login } from "./pageComponents";

jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "homeHydratedMenu",
    displayName: "Home page with hydrated menu",
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
          <div className="nav">
            <Render content={hydratedNavMenu} />
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
