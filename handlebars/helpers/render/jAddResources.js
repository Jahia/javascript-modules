import {SafeString} from 'handlebars';
import {render} from '@jahia/server-helpers';

export default function (options) {
    return new SafeString(render.addResourcesTag(options.hash, options.data.root.renderContext));
}

