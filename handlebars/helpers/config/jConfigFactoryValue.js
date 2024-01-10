import setResult from '../../setResult';
import {config} from '@jahia/server-helpers';

export default function (factoryPid, factoryIdentifier, key, options) {
    return setResult(config.getConfigFactoryValue(factoryPid, factoryIdentifier, key), this, options);
}
