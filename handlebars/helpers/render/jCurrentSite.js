import {render} from '@jahia/server-helpers';
import setResult from '../../setResult';

export default function (options) {
    return setResult(render.transformToJsNode(options.data.root.renderContext.getSite(), false, false, false), this, options);
}
