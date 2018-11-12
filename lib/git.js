const Bluebird = require('bluebird')
const CP = Bluebird.promisifyAll(require('child_process'))

const SEPARATOR = '===END==='
const COMMIT_PATTERN = /^(\w*)(?:\(([^)]*?)\)|):(.*?(?:\[([^\]]+?)\]|))\s*$/
const FORMAT = '%H%n%s%n%b%n' + SEPARATOR

/**
 * Get all commits from the last tag (or the first commit if no tags).
 * @param {Object} options - calculation options
 * @returns {Promise<Array<Object>>} array of parsed commit objects
 */
exports.getCommits = options => {
    options = options || {}
    return new Bluebird(resolve => {
        if (options.tag) {
            return resolve(options.tag)
        }
        return resolve(CP.execAsync('git describe --tags --abbrev=0'))
    })
        .catch(() => '')
        .then(tag => {
            tag = tag.toString().trim()
            let revisions

            if (tag.indexOf('..') !== -1) {
                revisions = tag
            } else {
                revisions = tag ? tag + '..HEAD' : ''
            }

            return CP.execAsync(
                'git log -E --format=' + FORMAT + ' ' + revisions,
                {
                    maxBuffer: Number.MAX_SAFE_INTEGER
                }
            )
        })
        .catch(() => {
            throw new Error('no commits found')
        })
        .then(commits => commits.split('\n' + SEPARATOR + '\n'))
        .map(raw => {
            if (!raw) {
                return null
            }

            const lines = raw.split('\n')
            const commit = {}

            commit.hash = lines.shift()
            commit.subject = lines.shift()
            commit.body = lines.join('\n')

            const parsed = commit.subject.match(COMMIT_PATTERN)

            if (!parsed || !parsed[1] || !parsed[3]) {
                return null
            }

            commit.type = parsed[1].toLowerCase()
            commit.category = parsed[2] || ''

            const matches = / \[([^\]]+)\]/.exec(parsed[3])
            if (matches && matches.length === 2) {
                commit.subject = parsed[3].replace(' [' + matches[1] + ']', '')
                commit.notion = matches[1]
            } else {
                commit.subject = parsed[3]
            }

            if (parsed[4]) {
                parsed[4]
                    .toLowerCase()
                    .split(',')
                    .forEach(flag => {
                        flag = flag.trim()

                        switch (flag) {
                            case 'breaking':
                                commit.type = flag
                                break
                        }
                    })
            }

            return commit
        })
        .filter(commit => {
            if (!commit) {
                return false
            }
            return options.exclude ? options.exclude.indexOf(commit.type) === -1 : true
        })
}

/**
 * Grabs the repository URL.
 * @returns {Promise<String|Null>} the repository URL or null if it doesn't exist
 */
exports.extractRepoUrl = () => {
    return CP
        .execAsync('git remote -v')
        .then(remotes => {
            return remotes.split('\t')[2].split(' ')[0]
        })
}
