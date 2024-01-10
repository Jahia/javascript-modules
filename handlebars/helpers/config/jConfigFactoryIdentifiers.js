import setResult from '../../setResult';
import {config} from '@jahia/server-helpers';

export default function (factoryPid, options) {
    return setResult(config.getConfigFactoryIdentifiers(factoryPid), this, options);
}
