import {render} from '@jahia/server-helpers';

export default function (options) {
    render.addCacheDependencyTag(options.hash, options.data.root.renderContext);
    return '';
}
