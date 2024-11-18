const fs = require('fs');
const path = require('path');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
const deps = require('./package.json').dependencies;

// Read all files in the client components directory in order to expose them with webpack module federation more easily
// Those components are exposed in order to be hydrate/rendered client side
const componentsDir = './src/client';
const exposes = {};
fs.readdirSync(componentsDir).forEach(file => {
    if (file !== 'index.js') {
        const componentName = path.basename(file, path.extname(file));
        exposes[componentName] = path.resolve(componentsDir, file);
    }
});
const moduleName = 'jahia-npm-module-example';

module.exports = (env, mode) => {
    let configs = [
        // Config for jahia's client-side components (HydrateInBrowser or RenderInBrowser)
        // This config can be removed if the module doesn't contain client-side components
        // More info here : https://academy.jahia.com/documentation/jahia/jahia-8/developer/javascript-module-development/client-side-javascript
        {
            name: 'client',
            entry: {
                'jahia-npm-module-example': path.resolve(__dirname, './src/client/index')
            },
            output: {
                path: path.resolve(__dirname, 'javascript/client')
            },
            resolve: {
                mainFields: ['module', 'main'],
                extensions: ['.mjs', '.js', '.jsx']
            },
            module: {
                rules: [
                    {
                        test: /\.jsx$/,
                        include: [path.join(__dirname, 'src/client')],
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    ['@babel/preset-env', {modules: false, targets: {safari: '7', ie: '10'}}],
                                    '@babel/preset-react'
                                ],
                                plugins: [
                                    'styled-jsx/babel'
                                ]
                            }
                        }
                    }
                ]
            },
            plugins: [
                // This plugin allows a build to provide or consume modules with other independent builds at runtime.
                new ModuleFederationPlugin({
                    name: moduleName,
                    library: {type: 'assign', name: `window.appShell = (typeof appShell === "undefined" ? {} : appShell); window.appShell['${moduleName}']`},
                    filename: '../client/remote.js',
                    exposes: exposes,
                    shared: {
                        react: {
                            requiredVersion: deps.react,
                            singleton: true
                        },
                        'react-i18next': {},
                        'i18next': {}
                    }
                })
            ],
            devtool: 'inline-source-map',
            mode: 'development'
        },
        // Config for jahia's server-side components (using SSR) and source code
        // Those components have access to jahia's custom types and functions (https://academy.jahia.com/documentation/jahia/jahia-8/developer/javascript-module-development/javascript-modules-reference-documentation)
        {
            name: 'server',
            entry: {
                main: path.resolve(__dirname, 'src/index')
            },
            output: {
                path: path.resolve(__dirname, 'dist')
            },
            externalsPresets: {node: true},
            externals: {
                '@jahia/js-server-core': 'jsServerCoreLibraryBuilder.getLibrary()',
                react: 'jsServerCoreLibraryBuilder.getSharedLibrary(\'react\')',
                'react-i18next': 'jsServerCoreLibraryBuilder.getSharedLibrary(\'react-i18next\')',
                i18next: 'jsServerCoreLibraryBuilder.getSharedLibrary(\'i18next\')',
                'styled-jsx/style': 'jsServerCoreLibraryBuilder.getSharedLibrary(\'styled-jsx\')',
            },
            resolve: {
                extensions: ['.js', '.jsx']
            },
            module: {
                rules: [
                    {
                        test: /\.jsx$/,
                        include: [path.join(__dirname, 'src')],
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    ['@babel/preset-env', {modules: false, targets: {safari: '7', ie: '10'}}],
                                    '@babel/preset-react'
                                ],
                                plugins: [
                                    'styled-jsx/babel'
                                ]
                            }
                        }
                    },
                    {
                        test: /\.s[ac]ss$/i,
                        use: [
                            'style-loader',
                            {
                                loader: 'css-loader',
                                options: {
                                    modules: true
                                }
                            },
                            'sass-loader'
                        ]
                    }
                ]
            },
            devtool: 'inline-source-map'
        }
    ];

    // In case of watch we add a final config that will do automatic shell commands to trigger the pack and deploy scripts
    // Also an additional sleep is added to avoid watch triggering too much in a short time
    // (Feel free to adjust the sleep time according to your needs)
    if (mode.watch) {
        // sleep time in seconds, can be adjusted
        const sleepTime = 5;

        configs.push({
            name: 'watch',
            mode: 'development',
            dependencies: ['client', 'server'], // Wait for all webpack configs to be done
            entry: {},
            output: {},
            plugins: [
                new ExtraWatchWebpackPlugin({
                    // This is an extra list of files to watch for changes,
                    // It should include all files that are not already part of any webpack build
                    // Also do not watch for webpack generated files places, it can cause infinite loops of watch triggers
                    // for example, if your css is generated by webpack compiling scss, then:
                    // - do not add extra watch for 'css/**/*' -> it's the output of webpack scss build
                    // - do not add extra watch for 'src/scss/**/*' either, as it's already watched by webpack related config.
                    files: [
                        'images/**/*',
                        'locales/**/*.json',
                        'resources/**/*.properties',
                        'settings/**/*',
                        'definitions.cnd',
                        'import.xml',
                        'package.json'
                    ]
                }),
                new WebpackShellPluginNext({
                    onAfterDone: {
                        scripts: [
                            'yarn jahia-pack',
                            'yarn jahia-deploy',
                            process.platform === 'win32' ? 'timeout ' + sleepTime : 'sleep ' + sleepTime,
                        ],
                        blocking: true,
                        parallel: false
                    }
                })
            ]
        });
    }

    return configs;
};
