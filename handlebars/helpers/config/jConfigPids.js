import setResult from '../../setResult';
import {config} from '@jahia/server-helpers';

export default function (options) {
    return setResult(config.getConfigPids(), this, options);
}
