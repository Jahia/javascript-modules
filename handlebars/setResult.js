export default (result, context, options) => {
    if (options.hash.varName) {
        context[options.hash.varName] = result;
    } else {
        return result;
    }
};
