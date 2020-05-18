const redis = require('redis')
const bluebird = require('bluebird')

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let oooClient

/**
 * Opens all redis connections at application startup
 */
async function openAllConnections() {
    oooClient = await redis
        .createClient({
            db: 0
        })
}

async function getUserData(extensionId) {

    let oooInfo = await oooClient
        .getAsync(extensionId)
        .then(res => {
            return res
        })
        .catch(e => {
            throw new Error(`Issue setting user info for key for ${extensionId}` + e)
        })

    oooInfo = JSON.parse(oooInfo)

    return oooInfo
}

async function setUserData(extensionId, oooInfo, expiresIn) {

    let stringifiedOooInfo = JSON.stringify(oooInfo)

    await oooClient.setAsync(extensionId, stringifiedOooInfo, "EX", expiresIn)
        .catch(e => {
            throw new Error(`Issue setting user info for key for ${extensionId}` + e)
        })
}

async function clearUserData(extensionId) {

    await oooClient.delAsync(extensionId)
        .catch(e => {
            throw new Error(`Issue setting user info for key for ${extensionId}` + e)
        })
}

module.exports = {
    setUserData,
    getUserData,
    clearUserData,
    openAllConnections
}