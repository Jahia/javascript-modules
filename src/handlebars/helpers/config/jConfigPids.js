import setResult from '../../setResult';
import {server} from '@jahia/js-server-core-private';

export default function (options) {
    return setResult(server.config.getConfigPids(), this, options);
}
