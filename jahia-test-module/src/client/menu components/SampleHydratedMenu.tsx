import { useEffect, useState } from "react";

interface NavigationItem {
  displayName: string;
  url: string;
  children: NavigationItem[] | null;
}

interface MenuRootProps {
  navigationItem: NavigationItem;
}

const MenuRoot: React.FC<MenuRootProps> = ({ navigationItem }) => {
  return (
    <div className={"navBar"}>
      <ul className={`navmenu level_0`}>
        {navigationItem.children &&
          navigationItem.children.map((child) => (
            <MenuItem navigationItem={child} level={1} key={child!.toString()} />
          ))}
      </ul>
    </div>
  );
};

interface MenuItemProps {
  navigationItem: NavigationItem;
  level: number;
}

const MenuItem: React.FC<MenuItemProps> = ({ navigationItem, level }) => {
  const hasChildren = navigationItem.children && navigationItem.children.length > 0;
  return (
    <li className={`${hasChildren ? "hasChildren" : "noChildren"}`}>
      <div>
        <a href={navigationItem.url}>{navigationItem.displayName}</a>
      </div>
      <div className={"navBar"}>
        <ul className={`inner-box level_${level}`}>
          {hasChildren &&
            navigationItem.children!.map((child) => (
              <MenuItem navigationItem={child} level={level + 1} key={child!.toString()} />
            ))}
        </ul>
      </div>
    </li>
  );
};

interface Node {
  path: string;
  displayName: string;
}

interface BuildHierarchy {
  (nodes: Node[], rootPath: string): NavigationItem;
}

const buildHierarchy: BuildHierarchy = (nodes, rootPath) => {
  const nodeMap: { [key: string]: NavigationItem } = {};
  const root: NavigationItem = {
    displayName: "root", // this is actually not rendered
    url: rootPath,
    children: [],
  };

  // Initialize the node map and set up children arrays
  nodes.forEach((node) => {
    nodeMap[node.path] = {
      displayName: node.displayName,
      url: node.path + ".html",
      children: [],
    };
  });

  // Build the hierarchy
  nodes.forEach((node) => {
    const parentPath = node.path.substring(0, node.path.lastIndexOf("/"));
    if (nodeMap[parentPath]) {
      nodeMap[parentPath].children!.push(nodeMap[node.path]);
    } else {
      root.children!.push(nodeMap[node.path]);
    }
  });

  return root;
};

interface SampleHydratedMenuProps {
  staticMenu: NavigationItem;
  rootPath: string;
}

const SampleHydratedMenu: React.FC<SampleHydratedMenuProps> = ({ staticMenu, rootPath }) => {
  const [menu, setMenu] = useState<NavigationItem>(staticMenu);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function fetchMenu() {
      const response = await fetch("/modules/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query ($rootPath: String!) {
              jcr {
                nodeByPath(path: $rootPath) {
                  descendants(typesFilter: { types: ["jnt:page"] }) {
                    nodes {
                      name
                      path
                      displayName(language: "en")
                    }
                  }
                }
              }
            }
          `,
          variables: { rootPath },
        }),
      });

      const data = await response.json();
      const nodes: Node[] = data?.data?.jcr?.nodeByPath?.descendants?.nodes || null;
      if (nodes) {
        const hierarchicalMenu = buildHierarchy(nodes, rootPath);
        setMenu(hierarchicalMenu);
      }
    }
    fetchMenu()
      .then(() => setHydrated(true))
      .catch((error) => console.error("Error fetching menu:", error));
  }, []);

  return (
    <div className={hydrated ? "hydrated" : "static"}>
      <h2>This React component is hydrated client side ({hydrated ? "Loaded" : "Loading..."})</h2>
      {menu && <MenuRoot navigationItem={menu} />}
    </div>
  );
};

export default SampleHydratedMenu;
