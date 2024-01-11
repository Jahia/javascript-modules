import {SafeString} from 'handlebars';
import {render} from '@jahia/server-helpers';
import setResult from '../../setResult';

const allowedRenderAttributes = ['content', 'node', 'path', 'editable', 'advanceRenderingConfig', 'templateType', 'view', 'parameters'];

export default function (options) {
    // Filter out available options hash
    const attrs = Object.keys(options.hash).reduce((acc, attr) => {
        if (allowedRenderAttributes.includes(attr)) {
            acc[attr] = options.hash[attr];
        } else {
            console.warn(`Render helper: ${attr} is not a valid attribute, attribute ignored`);
        }

        return acc;
    }, {});

    if (Object.keys(attrs).length === 0) {
        console.warn(`Render helper: no valid attribute found within ${JSON.stringify(options.hash)}`);
        return '';
    }

    const output = new SafeString(render.render(attrs, options.data.root.renderContext, options.data.root.currentResource));
    return setResult(output, this, options);
}
