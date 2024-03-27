import {SafeString} from 'handlebars';
import setResult from '../../setResult';
import {server} from '@jahia/js-server-core-private';

export default function (options) {
    return setResult(new SafeString(server.render.renderArea(options.hash, options.data.root.renderContext)), this, options);
}
