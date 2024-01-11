import {config} from '@jahia/server-helpers';
import setResult from '../../setResult';

export default function (factoryPid, factoryIdentifier, options) {
    return setResult(config.getConfigFactoryValues(factoryPid, factoryIdentifier), this, options);
}
