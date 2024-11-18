const path = require('path');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const deps = require('./package.json').dependencies;
const {CycloneDxWebpackPlugin} = require('@cyclonedx/webpack-plugin');

/** @type {import('@cyclonedx/webpack-plugin').CycloneDxWebpackPluginOptions} */
const cycloneDxWebpackPluginOptions = {
    specVersion: '1.4',
    rootComponentType: 'library',
    outputLocation: './bom'
};

module.exports = (env, argv) => {
    const isDevelopment = argv.mode === 'development';
    const mode = isDevelopment ? 'development' : 'production';
    return {
        entry: {
            reactAppShell: path.resolve(__dirname, 'src/client-javascript/main')
        },
        output: {
            path: path.resolve(__dirname, 'src/main/resources/javascript/apps')
        },
        resolve: {
            mainFields: ['module', 'main'],
            extensions: ['.mjs', '.js', '.jsx']
        },
        module: {
            rules: [
                {
                    test: /\.jsx$/,
                    include: [path.join(__dirname, 'src'), path.join(__dirname, 'views')],
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {modules: false, targets: {safari: '7', ie: '10'}}],
                                '@babel/preset-react'
                            ]
                        }
                    }
                }
            ]
        },
        plugins: [
            new ModuleFederationPlugin({
                name: 'reactAppShell',
                exposes: {
                    // For now, we don't need to expose anything to client side
                    // '.': './src/client-javascript/exposed'
                },
                shared: {
                    react: {
                        requiredVersion: deps.react,
                        singleton: true,
                    },
                    'react-i18next': {},
                    'react-dom': {},
                    'i18next': {},
                    '@apollo/client': {},
                    '@apollo/react-hooks': {},
                    '@jahia/data-helper': {}
                }
            }),
            new CycloneDxWebpackPlugin(cycloneDxWebpackPluginOptions)
        ],
        devtool: isDevelopment ? 'inline-source-map' : 'source-map',
        mode: mode
    };
};
