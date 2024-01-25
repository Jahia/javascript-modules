import setResult from '../../setResult';
import {server} from '@jahia/js-server-engine-private';

export default function (options) {
    return setResult(server.render.transformToJsNode(options.data.root.renderContext.getMainResource().getNode(),
        false,
        false,
        false), this, options);
}
