import {server} from '@jahia/js-server-engine-private';
import setResult from '../../setResult';

export default function (options) {
    return setResult(server.render.transformToJsNode(options.data.root.renderContext.getSite(), false, false, false), this, options);
}