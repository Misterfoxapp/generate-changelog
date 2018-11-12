const File = require('./file')
const ParseGitHubUrl = require('github-url-from-git')

/**
 * Get the package.json object located in the current directory.
 * @returns {Promise<Object>} package.json object
 */
exports.getUserPackage = () => {
    const userPackagePath = process.cwd() + '/package.json'

    return File.exists(userPackagePath)
        .then(() => require(userPackagePath))
        .catch(() => {
            throw new Error('valid package.json not found')
        })
}

/**
 * Grabs the repository URL if it exists in the package.json.
 * @returns {Promise<String|Null>} the repository URL or null if it doesn't exist
 */
exports.extractRepoUrl = () => {
    return exports.getUserPackage()
        .then(userPackage => {
            const url = userPackage.repository && userPackage.repository.url

            if (typeof url !== 'string') {
                return null
            }

            if (url.indexOf('github') === -1) {
                return url
            } else {
                return ParseGitHubUrl(url)
            }
        })
}

/**
 * Grabs the version if it exists in the package.json.
 * @returns {Promise<String|Null>} the version or null if it doesn't exist
 */
exports.getVersion = () => {
    return exports
        .getUserPackage()
        .then(userPackage => {
            if (!userPackage.version) {
                return null
            }

            return userPackage.version
        })
}
