const fs = require('fs');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const deps = require('./package.json').devDependencies;

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
const moduleName = '$$MODULE_NAME$$';

const buildOutput = path.resolve(__dirname, 'dist/build');
const filesToCopyAsIs = ['static/', 'settings/', 'package.json', 'yarn.lock'];
const copyAsIsPatterns = filesToCopyAsIs.map(dir => ({
    from: dir,
    to: path.join(buildOutput, dir)
}));

module.exports = (env, argv) => {
    const isDevelopment = argv.mode === 'development';
    const mode = isDevelopment ? 'development' : 'production';
    console.log('Building in', mode, 'mode...');
    let optimization = isDevelopment ? {} : {
        minimizer: [
            // This is required to make hydration working, as its implementation relies on the class name of the React component.
            // See InBrowser.jsx in javascript-modules-library for details
            new TerserPlugin({
                terserOptions: {
                    // eslint-disable-next-line camelcase
                    keep_classnames: true,
                    // eslint-disable-next-line camelcase
                    keep_fnames: true
                }
            })
        ]
    };
    let configs = [
        // Config for jahia's client-side components (HydrateInBrowser or RenderInBrowser)
        // This config can be removed if the module doesn't contain client-side components
        // More info here : https://academy.jahia.com/documentation/jahia/jahia-8/developer/javascript-module-development/client-side-javascript
        {
            name: 'client',
            entry: {
                [moduleName]: path.resolve(__dirname, './src/client/index')
            },
            output: {
                path: path.join(buildOutput, 'javascript/client')
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
                                    'styled-jsx/babel',
                                    !isDevelopment && 'transform-react-remove-prop-types'
                                ].filter(Boolean)
                            }
                        }
                    }
                ]
            },
            devtool: isDevelopment ? 'inline-source-map' : 'source-map',
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
                        i18next: {}
                    }
                })
            ]
        },
        {
            name: 'copy-as-is',
            plugins: [
                new CopyWebpackPlugin({
                    patterns: copyAsIsPatterns
                })
            ]
        },
        // Config for jahia's server-side components (using SSR) and source code
        // Those components have access to jahia's custom types and functions (https://academy.jahia.com/documentation/jahia/jahia-8/developer/javascript-module-development/javascript-modules-reference-documentation)
        {
            name: 'server',
            entry: {
                main: path.resolve(__dirname, 'src/server')
            },
            output: {
                path: buildOutput
            },
            externals: {
                // Those libraries are supplied to webpack at runtime (by the javascript-modules project), and are not packaged in the output bundle
                '@jahia/javascript-modules-library': 'javascriptModulesLibraryBuilder.getLibrary()',
                react: 'javascriptModulesLibraryBuilder.getSharedLibrary(\'react\')',
                'react-i18next': 'javascriptModulesLibraryBuilder.getSharedLibrary(\'react-i18next\')',
                i18next: 'javascriptModulesLibraryBuilder.getSharedLibrary(\'i18next\')',
                'styled-jsx/style': 'javascriptModulesLibraryBuilder.getSharedLibrary(\'styled-jsx\')'
            },
            resolve: {
                mainFields: ['module', 'main'],
                extensions: ['.mjs', '.js', '.jsx']
            },
            module: {
                rules: [
                    {
                        test: /\.jsx$/,
                        include: [
                            path.join(__dirname, 'src/server'),
                            path.join(__dirname, 'src/client')
                        ],
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    ['@babel/preset-env', {modules: false, targets: {safari: '7', ie: '10'}}],
                                    '@babel/preset-react'
                                ],
                                plugins: [
                                    'styled-jsx/babel',
                                    !isDevelopment && 'transform-react-remove-prop-types'
                                ].filter(Boolean)
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
            devtool: isDevelopment ? 'inline-source-map' : 'source-map',
            optimization: optimization
        }
    ];

    // In case of watch we add a final config that will do automatic shell commands to trigger the pack and deploy scripts
    // Also an additional sleep is added to avoid watch triggering too much in a short time
    // (Feel free to adjust the sleep time according to your needs)
    if (argv.watch) {
        // Sleep time in seconds, can be adjusted
        const sleepTime = 5;

        configs.push({
            name: 'watch',
            dependencies: ['client', 'server', 'copy-as-is'], // Wait for all webpack configs to be done
            entry: {},
            output: {},
            plugins: [
                new ExtraWatchWebpackPlugin({
                    // This is an extra list of files to watch for changes,
                    // It should include all files that are not already part of any webpack build
                    // Also do not watch for webpack generated files places, it can cause infinite loops of watch triggers
                    // for example, if your css is generated by webpack compiling scss, then:
                    // - do not add extra watch for 'dist/build/static/css/**/*' -> it's the output of webpack scss build
                    // - do not add extra watch for 'src/scss/**/*' either, as it's already watched by webpack related config.
                    files: [
                    ]
                }),
                new WebpackShellPluginNext({
                    onAfterDone: {
                        scripts: [
                            'yarn run pack',
                            'yarn jahia-deploy',
                            process.platform === 'win32' ? 'timeout ' + sleepTime : 'sleep ' + sleepTime
                        ],
                        blocking: true,
                        parallel: false
                    }
                })
            ]
        });
    }

    configs.forEach(config => {
        // Ensure no default entry points are used
        if (!config.entry) {
            config.entry = {};
        }

        // Set the mode development/production
        config.mode = mode;
    });

    return configs;
};
