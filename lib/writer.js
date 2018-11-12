const Bluebird = require('bluebird')

const DEFAULT_TYPE = 'other'
const PR_REGEX = new RegExp(/#[1-9][\d]*/g)
const TYPES = {
    breaking: 'Breaking Changes',
    build: 'Build System / Dependencies',
    ci: 'Continuous Integration',
    chore: 'Chores',
    docs: 'Documentation Changes',
    feat: 'New Features',
    fix: 'Bug Fixes',
    other: 'Other Changes',
    perf: 'Performance Improvements',
    refactor: 'Refactors',
    revert: 'Reverts',
    style: 'Code Style Changes',
    test: 'Tests'
}

/**
 * Generate the commit URL for the repository provider.
 * @param {String} baseUrl - The base URL for the project
 * @param {String} commitHash - The commit hash being linked
 * @return {String} The URL pointing to the commit
 */
exports.getCommitUrl = (baseUrl, commitHash) => {
    let urlCommitName = 'commit'

    if (baseUrl.indexOf('bitbucket') !== -1) {
        urlCommitName = 'commits'
    }

    if (baseUrl.indexOf('gitlab') !== -1 && baseUrl.slice(-4) === '.git') {
        baseUrl = baseUrl.slice(0, -4)
    }

    return baseUrl + '/' + urlCommitName + '/' + commitHash
}

/**
 * Generate the markdown for the changelog.
 * @param {String} version - the new version affiliated to this changelog
 * @param {Array<Object>} commits - array of parsed commit objects
 * @param {Object} options - generation options
 * @param {Boolean} options.patch - whether it should be a patch changelog
 * @param {Boolean} options.minor - whether it should be a minor changelog
 * @param {Boolean} options.major - whether it should be a major changelog
 * @param {String} options.repoUrl - repo URL that will be used when linking commits
 * @returns {Promise<String>} the \n separated changelog string
 */
exports.markdown = function (version, commits, options) {
    const content = []
    const date = new Date().toJSON().slice(0, 10)
    let heading

    if (options.major) {
        heading = '##'
    } else if (options.minor) {
        heading = '###'
    } else {
        heading = '####'
    }

    if (version) {
        heading += ' ' + version + ' (' + date + ')'
    } else {
        heading += ' ' + date
    }

    content.push(heading)
    content.push('')

    return Bluebird
        .resolve(commits)
        .bind({ types: {} })
        .each(function (commit) {
            const type = TYPES[commit.type] ? commit.type : DEFAULT_TYPE
            const category = commit.category

            this.types[type] = this.types[type] || {}
            this.types[type][category] = this.types[type][category] || []

            this.types[type][category].push(commit)
        })
        .then(function () {
            return Object
                .keys(this.types)
                .sort()
        })
        .each(function (type) {
            const types = this.types

            content.push('##### ' + TYPES[type])
            content.push('')

            Object
                .keys(this.types[type])
                .forEach(category => {
                    let prefix = '*'
                    const nested = types[type][category].length > 1
                    const categoryHeading = prefix + (category ? ' **' + category + ':**' : '')

                    if (nested && category) {
                        content.push(categoryHeading)
                        prefix = '  *'
                    } else {
                        prefix = categoryHeading
                    }

                    types[type][category]
                        .forEach(commit => {
                            let shorthash = commit.hash.substring(0, 8)
                            let subject = commit.subject

                            if (options.repoUrl) {
                                shorthash = '[' + shorthash + '](' + exports.getCommitUrl(options.repoUrl, commit.hash) + ')'

                                subject = subject.replace(PR_REGEX, pr => '[' + pr + '](' + options.repoUrl + '/pull/' + pr.slice(1) + ')')
                            }

                            if (commit.notion) {
                                const notionUrl = '[Notion.so](' + options.notion + commit.notion + ')'
                                content.push(prefix + ' ' + subject + ' [' + notionUrl + '] (' + shorthash + ')')
                            } else {
                                content.push(prefix + ' ' + subject + ' (' + shorthash + ')')
                            }
                        })
                })

            content.push('')
        })
        .then(() => {
            content.push('')
            return content.join('\n')
        })
}
