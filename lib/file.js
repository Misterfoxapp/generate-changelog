const Bluebird = require('bluebird')
const Fs = Bluebird.promisifyAll(require('fs'))

const STDOUT_PATH = '-'

/**
 * Resolves if the file exists, rejects otherwise.
 * @param {String} path - path of the file to check
 * @returns {Promise}
 */
exports.exists = path => {
    return Fs.statAsync(path)
}

/**
 * Read a files contents if it exists, return the empty string otherwise.
 * @param {String} path - path of the file to read
 * @returns {Promise<String>} contents of the file
 */
exports.readIfExists = path => {
    return Fs
        .readFileAsync(path, 'utf8')
        .catch(() => '')
}

/**
 * Write the data to the specified file (or to stdout if file is '-').
 * @param {String} path - path of the file to write to or '-' for stdout
 * @param {String|Buffer} data - data to write
 * @returns {Promise}
 */
exports.writeToFile = (path, data) => {
    return Bluebird.resolve()
        .then(() => {
            if (path === STDOUT_PATH) {
                return Fs.writeAsync(process.stdout.fd, data)
            } else {
                return Fs.writeFileAsync(path, data)
            }
        })
}
