import {server} from '@jahia/js-server-engine-private';
import setResult from '../../setResult';

export default function (factoryPid, factoryIdentifier, options) {
    return setResult(server.config.getConfigFactoryValues(factoryPid, factoryIdentifier), this, options);
}
