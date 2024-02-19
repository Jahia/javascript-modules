import {SafeString} from 'handlebars';
import setResult from '../../setResult';
import {server} from '@jahia/js-server-engine-private';

export default function (options) {
    return setResult(new SafeString(server.render.renderAbsoluteArea(options.hash, options.data.root.renderContext)), this, options);
}
