module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    extends: '@jahia',
    plugins: ['json'],
    overrides: [
        {
            env: {
                node: true
            },
            files: ['.eslintrc.{js,cjs}'],
            parserOptions: {
                sourceType: 'script'
            }
        }
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    ignorePatterns: ['dist'],
    rules: {
        'react/boolean-prop-naming': [1, {rule: '^(is|has)[A-Z]([A-Za-z0-9]?)+'}]
    },
    root: true
};
