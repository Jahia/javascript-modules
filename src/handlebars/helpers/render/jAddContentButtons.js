import {SafeString} from 'handlebars';
import {server} from '@jahia/js-server-core-private';

export default function (options) {
    const {nodeTypes, childName, editCheck} = options.hash;
    return new SafeString(server.render.createContentButtons(childName || '*', nodeTypes, Boolean(editCheck), options.data.root.renderContext, options.data.root.currentResource));
}
