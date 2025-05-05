import { AddResources, Area, jahiaComponent, Render } from "@jahia/javascript-modules-library";
import { footer, header, login } from "./pageComponents";

jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "simple",
    displayName: "Simple page",
    componentType: "template",
  },
  () => {
    const inlineScript = `<script type="text/javascript">
                console.log('Executing inline script...');
                document.addEventListener('DOMContentLoaded', function () {
                var newDiv = document.createElement('div');
                newDiv.id = 'testInlineScript';
                document.body.appendChild(newDiv);
            });
        </script>`;

    return (
      <html lang="en">
        <head>
          <AddResources type={"css"} resources={"styles.css"} />
        </head>
        <body>
          <AddResources type={"inline"} key={"inline-script-test"} inlineResource={inlineScript} />
          <AddResources type={"javascript"} resources={"body-script.js"} targetTag={"body"} />
          <AddResources type={"javascript"} resources={"head-script.js"} />
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
