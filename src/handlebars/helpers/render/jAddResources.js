import {SafeString} from 'handlebars';
import {server} from '@jahia/js-server-engine-private';

export default function (options) {
    return new SafeString(server.render.addResources(options.hash, options.data.root.renderContext));
}

