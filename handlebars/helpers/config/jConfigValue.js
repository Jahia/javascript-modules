import setResult from '../../setResult';
import {config} from '@jahia/server-helpers';

export default function (configPid, key, options) {
    return setResult(config.getConfigValue(configPid, key), this, options);
}
