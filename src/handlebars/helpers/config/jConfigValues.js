import setResult from '../../setResult';
import {server} from '@jahia/js-server-core-private';

export default function (configPid, options) {
    return setResult(server.config.getConfigValues(configPid), this, options);
}
