export default {
    prepare: (renderContext, resource, chain) => {
        console.log(renderContext, resource, chain);
    },
    execute: (previousOut, renderContext, resource, chain) => {
        console.log(renderContext, resource, chain);
        return previousOut.replace('toto', 'tutu');
    }
};
