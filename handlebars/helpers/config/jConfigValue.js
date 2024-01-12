import setResult from '../../setResult';
import {server} from '@jahia/js-server-engine-private';

export default function (configPid, key, options) {
    return setResult(server.config.getConfigValue(configPid, key), this, options);
}
