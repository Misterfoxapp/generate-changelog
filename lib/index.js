const Bluebird = require('bluebird')

const Git = require('./git')
const Package = require('./package')
const Writer = require('./writer')

/**
 * Generate the changelog.
 * @param {Object} options - generation options
 * @param {Boolean} options.patch - whether it should be a patch changelog
 * @param {Boolean} options.minor - whether it should be a minor changelog
 * @param {Boolean} options.major - whether it should be a major changelog
 * @param {String} options.repoUrl - repo URL that will be used when linking commits
 * @param {Array} options.exclude - exclude listed commit types (e.g. ['chore', 'style', 'refactor'])
 * @returns {Promise<String>} the \n separated changelog string
 */
exports.generate = options => {
    return Bluebird
        .all([
            exports.extractRepoUrl(),
            exports.calculateNewVersion(options),
            Git.getCommits(options)
        ])
        .spread((repoUrl, version, commits) => {
            options.repoUrl = options.repoUrl || repoUrl
            options.notion = options.notion || 'https://www.notion.so/foxintelligence/'
            options.notion = options.notion.endsWith('/')
                ? options.notion
                : options.notion + '/'

            return Writer.markdown(version, commits, options)
        })
}

/**
 * Grabs the repository URL.
 * @returns {Promise<String|Null>} the repository URL or null if it doesn't exist
 */
exports.extractRepoUrl = () => {
    return Package
        .extractRepoUrl()
        .catch(() => Git.extractRepoUrl())
}

/**
 * Calculate the new semver version depending on the options.
 * @param {Object} options - calculation options
 * @param {Boolean} options.patch - whether it should be a patch version
 * @param {Boolean} options.minor - whether it should be a minor version
 * @param {Boolean} options.major - whether it should be a major version
 * @returns {Promise<String>} - new version
 */
exports.calculateNewVersion = async options => {
    let version = options.ver
    if (!version) {
        version = await Package.getVersion()
    }

    if (!version) {
        return null
    }

    const split = version.split('.')

    if (options.major) {
        split[0] = (parseInt(split[0], 10) + 1).toString()
        split[1] = '0'
        split[2] = '0'
    } else if (options.minor) {
        split[1] = (parseInt(split[1], 10) + 1).toString()
        split[2] = '0'
    } else if (options.patch) {
        split[2] = (parseInt(split[2], 10) + 1).toString()
    }

    return split.join('.')
}
