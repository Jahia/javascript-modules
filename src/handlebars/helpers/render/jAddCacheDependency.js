import {server} from '@jahia/js-server-engine-private';

export default function (options) {
    server.render.addCacheDependency(options.hash, options.data.root.renderContext);
    return '';
}
