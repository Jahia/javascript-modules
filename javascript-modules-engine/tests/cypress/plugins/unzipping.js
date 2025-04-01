const decompress = require('decompress')

const unzipArtifact = ({ artifactFilename, filteredPath }) =>
    decompress('./artifacts/' + artifactFilename, './artifacts', {
        filter: (file) => {
            return filteredPath === file.path
        },
    })

module.exports = {
    unzipArtifact,
}
