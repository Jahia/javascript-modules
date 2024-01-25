import setResult from '../../setResult';
import {server} from '@jahia/js-server-engine-private';

export default function (factoryPid, factoryIdentifier, key, options) {
    return setResult(server.config.getConfigFactoryValue(factoryPid, factoryIdentifier, key), this, options);
}
