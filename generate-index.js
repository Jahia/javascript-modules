/**
 * This script is used to merge the index.d.ts from the manual types with the types coming from the generated types
 */
const fs = require('fs');
const path = require('path');

const typesDir = path.join(__dirname, 'dist', 'types');

function processDirectory(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        if (file.endsWith('.d.ts') && file !== 'index.d.ts') {
            const moduleName = file.replace(/\.d\.ts$/, '');
            const exportStatement = `export * from './${moduleName}';\n`;
            fs.appendFileSync(path.join(typesDir, 'index.d.ts'), exportStatement);
        }
    }
}

processDirectory(typesDir);
