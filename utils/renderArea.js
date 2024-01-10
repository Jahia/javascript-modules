import {render} from '@jahia/server-helpers';

const allowedAreaProperties = ['areaView', 'allowedTypes', 'numberOfItems', 'subNodesView'];

export default function renderArea(props, renderContext) {
    const attrs = {
        content: {
            properties: {},
            name: props.name,
            nodeType: 'jnt:area'
        }
    };

    attrs.content.properties = Object.keys(props).reduce((acc, attr) => {
        if (allowedAreaProperties.includes(attr)) {
            // .toString is here because virtual JS Node property only handle string for now (even if JCR definition say long, or other type)
            acc['j:' + attr] = attr === 'numberOfItems' ? props[attr].toString() : props[attr];
        }

        return acc;
    }, {});

    if (!attrs.content.name) {
        console.warn('jArea: name is a mandatory property');
        return '';
    }

    return render.renderComponent(attrs, renderContext);
}
