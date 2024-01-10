export default function (...arrayEntries) {
    // Last argument is the options object.
    const result = [];

    // Skip the last argument.
    for (var i = 0; i < arrayEntries.length - 1; ++i) {
        result.push(arrayEntries[i]);
    }

    return result;
}
