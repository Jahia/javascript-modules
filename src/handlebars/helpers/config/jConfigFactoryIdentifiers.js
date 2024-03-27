import setResult from '../../setResult';
import {server} from '@jahia/js-server-core-private';

export default function (factoryPid, options) {
    return setResult(server.config.getConfigFactoryIdentifiers(factoryPid), this, options);
}
