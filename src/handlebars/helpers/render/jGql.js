import {server} from '@jahia/js-server-core-private';

export default function (options) {
    const query = options.fn(this);
    const {varName, ...rest} = options.hash;
    let {data} = server.gql.executeQuerySync({
        query,
        ...rest
    });

    const effectiveVarName = varName || 'gql';
    this[effectiveVarName] = data;
}
