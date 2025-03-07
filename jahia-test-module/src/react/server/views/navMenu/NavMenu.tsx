import { buildNavMenu, jahiaComponent } from "@jahia/javascript-modules-library";
import type { MenuEntry } from "@jahia/javascript-modules-library";
import { menuEntryCss } from "../../../../helpers/menuEntryCss.js";

const NavMenuEntry = ({
  menuEntry,
  first,
  last,
  level,
}: {
  menuEntry: MenuEntry;
  first: boolean;
  last: boolean;
  level: number;
}) => (
  <li className={menuEntryCss(menuEntry, first, last)}>
    <div
      dangerouslySetInnerHTML={{
        __html: menuEntry.render,
      }}
    />
    {menuEntry.children && (
      <div className="navBar">
        <ul className={"inner-box level_" + (level + 1)}>
          {menuEntry.children.map(function (childEntry, i) {
            return (
              <NavMenuEntry
                menuEntry={childEntry}
                first={i === 0}
                last={i === menuEntry.children!.length - 1}
                level={level}
                key={childEntry!.toString()}
              />
            );
          })}
        </ul>
      </div>
    )}
  </li>
);

jahiaComponent(
  {
    nodeType: "javascriptExample:navMenu",
    name: "default",
    displayName: "navMenu",
    componentType: "view",
    properties: {
      "cache.mainResource": "true",
    },
  },
  (_, { renderContext, currentResource }) => {
    const base = currentResource.getNode().getPropertyAsString("j:baselineNode");
    const maxDepth = currentResource.getNode().getProperty("j:maxDepth").getLong();
    const startLevel = currentResource.getNode().hasProperty("j:startLevel")
      ? currentResource.getNode().getProperty("j:startLevel").getLong()
      : 0;
    const menu = buildNavMenu(
      maxDepth,
      base,
      undefined,
      startLevel,
      renderContext,
      currentResource,
    );

    return (
      <div className={"navBar"}>
        <ul className="navmenu level_0">
          {menu.map(function (menuEntry, i) {
            return (
              <NavMenuEntry
                menuEntry={menuEntry}
                first={i === 0}
                last={i === menu.length - 1}
                level={0}
                key={menuEntry!.toString()}
              />
            );
          })}
        </ul>
      </div>
    );
  },
);
