import setResult from '../../setResult';
import {server} from '@jahia/js-server-engine-private';

export default function (factoryPid, options) {
    return setResult(server.config.getConfigFactoryIdentifiers(factoryPid), this, options);
}
