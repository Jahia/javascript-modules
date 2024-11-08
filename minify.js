const fs = require('fs');
const path = require('path');
const {minify} = require('terser');

const inputDir = path.join(__dirname, 'dist');

function minifyFiles(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filePath = path.join(directory, file);

        if (fs.statSync(filePath).isDirectory()) {
            minifyFiles(filePath);
        } else if (file.endsWith('.js')) {
            const code = fs.readFileSync(filePath, 'utf8');
            minify(code).then(result => {
                fs.writeFileSync(filePath, result.code, 'utf8');
                console.log(`${filePath} minified.`);
            }).catch(error => {
                console.error(`Error minifying ${filePath}:`, error);
            });
        }
    }
}

minifyFiles(inputDir);
