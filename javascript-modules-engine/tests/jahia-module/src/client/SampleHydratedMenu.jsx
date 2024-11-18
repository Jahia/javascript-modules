import React, {useEffect, useState} from 'react';

const MenuRoot = ({navigationItem /** @type {NavigationItem} */}) => {
    return (
        <div className={'navBar'}>
            <ul className={`navmenu level_0`}>
                {navigationItem.children &&
                    navigationItem.children.map((child, i) => (
                        <MenuItem navigationItem={child} level={1} key={i}/>
                    ))}
            </ul>
        </div>
    );
}
const MenuItem = ({navigationItem /** @type {NavigationItem} */, level}) => {
    const hasChildren = navigationItem.children && navigationItem.children.length > 0;
    return (
        <li className={`${hasChildren ? 'hasChildren' : 'noChildren'}`}>
            <div>
                <a href={navigationItem.url}>{navigationItem.displayName}</a>
            </div>
            <div className={'navBar'}>
                <ul className={`inner-box level_${level}`}>
                    {hasChildren &&
                        navigationItem.children.map((child, i) => (
                            <MenuItem navigationItem={child} level={level + 1} key={i}/>
                        ))}
                </ul>
            </div>
        </li>
    );
}

/**
 * Converts a flat list of nodes into a hierarchical structure.
 * @param {Array} nodes - The flat list of nodes.
 * @param rootPath - The root path of the hierarchy.
 * @returns {NavigationItem} The root NavigationItem with its children.
 */
const buildHierarchy = (nodes, rootPath) => {
    const nodeMap = {};
    let root = {
        displayName: 'root', // this is actually not rendered
        url: rootPath,
        children: []
    };

    // Initialize the node map and set up children arrays
    nodes.forEach(node => {
        nodeMap[node.path] = {
            displayName: node.displayName,
            url: node.path + '.html',
            children: []
        };
    });


    // Build the hierarchy
    nodes.forEach(node => {
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
        if (nodeMap[parentPath]) {
            nodeMap[parentPath].children.push(nodeMap[node.path]);
        } else {
            root.children.push(nodeMap[node.path]);
        }
    });

    return root;
};

const SampleHydratedMenu = ({staticMenu /** @type {NavigationItem} */, rootPath}) => {
    const [menu, setMenu] = useState(staticMenu);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {

        async function fetchMenu() {
            const response = await fetch('/modules/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    query: `query {
                              jcr {
                                nodeByPath(path: "${rootPath}") {
                                  descendants(typesFilter: {types: ["jnt:page"]}) {
                                    nodes {
                                      name
                                      path
                                      displayName(language:"en")
                                    }
                                  }
                                }
                              }
                            }`
                })
            });

            const data = await response.json();
            const nodes = data?.data?.jcr?.nodeByPath?.descendants?.nodes || null;
            if (nodes) {
                const hierarchicalMenu = buildHierarchy(nodes, rootPath);
                setMenu(hierarchicalMenu);
            }
        }
        fetchMenu()
            .then(() => setHydrated(true))
            .catch(error => console.error('Error fetching menu:', error));
    }, []);
    return (
      <div className={hydrated ? 'hydrated' : 'static'}>
            <h2>This React component is hydrated client side ({hydrated ? 'Loaded' : 'Loading...'})</h2>
            {menu && <MenuRoot navigationItem={menu}/>}
        </div>
    )
}

export default SampleHydratedMenu;