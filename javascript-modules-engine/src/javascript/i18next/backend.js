import {server} from '@jahia/js-server-core-private';

const backend = {
    type: 'backend',

    init: function () {
    },

    read: function (language, namespace, callback) {
        const bundle = server.osgi.getBundle(namespace);
        if (bundle) {
            // See NpmProtocolConnection.java that is moving the settings/locales to META-INF/locales
            // (Maybe we will move locales registration in the src and make the registration programmatically like JS views,
            // using the registry. But for now, we are using the META-INF/locales folder and .json files)
            let content = server.osgi.loadResource(bundle, 'META-INF/locales/' + language + '.json', true);
            if (content) {
                callback(null, JSON.parse(content));
            } else {
                // No locales found
                callback(null, {});
            }
        } else {
            callback('cannot find bundle: ' + namespace);
        }
    },

    create: function () {
    }
};

export default backend;
