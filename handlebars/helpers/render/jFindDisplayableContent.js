import setResult from '../../setResult';
import {render} from '@jahia/server-helpers';
import getNodeFromPathOrId from '../../../utils/getNodeFromPathOrId';

export default function (options) {
    const node = getNodeFromPathOrId(options.hash, options.data.root.currentResource.getNode().getSession());
    if (node) {
        const displayableNode = render.findDisplayableNode(node, options.data.root.renderContext, null);
        if (displayableNode) {
            return setResult(render.transformToJsNode(displayableNode, false, false, false), this, options);
        }
    }
}
