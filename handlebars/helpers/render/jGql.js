import {gql} from '@jahia/server-helpers';

export default function (options) {
    const query = options.fn(this);
    const {varName, ...rest} = options.hash;
    let {data} = gql.executeQuerySync({
        query,
        ...rest
    });

    const effectiveVarName = varName || 'gql';
    this[effectiveVarName] = data;
}
