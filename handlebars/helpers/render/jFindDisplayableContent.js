import setResult from '../../setResult';
import {server} from '@jahia/js-server-engine-private';
import getNodeFromPathOrId from '../../../utils/getNodeFromPathOrId';

export default function (options) {
    const node = getNodeFromPathOrId(options.hash, options.data.root.currentResource.getNode().getSession());
    if (node) {
        const displayableNode = server.render.findDisplayableNode(node, options.data.root.renderContext, null);
        if (displayableNode) {
            return setResult(server.render.transformToJsNode(displayableNode, false, false, false), this, options);
        }
    }
}
