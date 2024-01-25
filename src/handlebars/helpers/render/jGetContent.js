import setResult from '../../setResult';
import {server} from '@jahia/js-server-engine-private';
import getNodeFromPathOrId from '../../../utils/getNodeFromPathOrId';

export default function (options) {
    const node = getNodeFromPathOrId(options.hash, options.data.root.currentResource.getNode().getSession());
    if (node) {
        return setResult(server.render.transformToJsNode(node, options.hash.includeChildren ? options.hash.includeChildren : false, options.hash.includeDescendants ? options.hash.includeDescendants : false, options.hash.includeAllTranslations ? options.hash.includeAllTranslations : false), this, options);
    }
}
