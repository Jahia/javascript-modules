module.exports = (on, config) => {
    config.baseUrl = process.env.JAHIA_URL
    config.env.SUPER_USER_PASSWORD = process.env.SUPER_USER_PASSWORD
    config.env.PREPACKAGED_SITE_URL = process.env.CYPRESS_PREPACKAGED_SITE_URL

    return config
}
