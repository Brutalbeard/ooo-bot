const SDK = require('@ringcentral/sdk').SDK
const Subscriptions = require('@ringcentral/subscriptions').Subscriptions;
const { LocalStorage } = require('node-localstorage')
require('dotenv').config()
const moment = require('moment')

const localstorage = new LocalStorage('./auth')

const startDate = moment(process.env.START_DATE).startOf('day')
const endDate = moment(process.env.END_DATE).endOf('day')

const { setUserData, getUserData, openAllConnections } = require('./lib/redis')

const rcsdk = new SDK({
    server: process.env.RINGCENTRAL_PLATFORM_ADDRESS,
    clientId: process.env.RINGCENTRAL_CLIENT_ID,
    clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
    handleRateLimit: true,
    localStorage: localstorage
})

const subscriptions = new Subscriptions({
    sdk: rcsdk
});

let userExtensionId = undefined

rcsdk
    .platform()
    .login({
        username: process.env.RINGCENTRAL_USERNAME,
        extension: process.env.RINGCENTRAL_EXTENSION,
        password: process.env.RINGCENTRAL_PASSWORD
    })
    .then(() => {
        console.log("Logged in successfully")
        openAllConnections()
        main()
    })
    .catch(e => {
        console.error(e.message)
    })

async function main() {

    await rcsdk
        .platform()
        .get('/restapi/v1.0/account/~/extension/~')
        .then(res => {
            return res.json()
        })
        .then(res => {
            userExtensionId = res.id
        })
        .catch(e => {
            console.error("Issue pulling logged in user's info: ", e.message)
        })

    console.log("Owner id: ", userExtensionId)

    let subscription = subscriptions.createSubscription();

    subscription.on(subscription.events.notification, async msg => {

        if (msg.body.creatorId == userExtensionId && msg.body.text && /^ping/.test(msg.body.text)) {
            pong(msg.body.creatorId)
            return
        }

        if (msg.body.creatorId == userExtensionId && msg.body.text && /^new ooo/.test(msg.body.text)) {
            console.log("New ooo: ", msg.body)
            newOoo(msg.body.creatorId, msg.body.text)
            return
        }

        if (msg.body.creatorId == userExtensionId && msg.body.text && /^get ooo/.test(msg.body.text)) {
            console.log("Info on ooo: ", msg.body)
            info(msg.body.creatorId)
            return
        }

        if (msg.body.creatorId == userExtensionId && msg.body.text && /^test ooo/.test(msg.body.text)) {
            console.log("Info on ooo: ", msg.body)

            let oooInfo = await getUserData(userExtensionId).catch(e => {
                console.error("Issue getting user info: ", e)
                return undefined
            })

            autoResponse(userExtensionId, msg.body.creatorId, oooInfo)
            return
        }

        let wasMentioned = await wasIMentioned(msg.body)

        if (!wasIMentioned) { return }

        let oooInfo = await getUserData(userExtensionId).catch(e => {
            console.error("Issue getting user info: ", e)
            return undefined
        })

        if (!oooInfo) { return }

        let isBetween = moment().isBetween(oooInfo.startDate, oooInfo.endDate)

        if (wasMentioned === true && isBetween == true) {
            autoResponse(userExtensionId, msg.body.creatorId, oooInfo)
        }

    });

    subscription
        .setEventFilters(['/restapi/v1.0/glip/posts']) // a list of server-side events
        .register()
        .catch(e => {
            console.error("Issue setting subscription filters: ", e.message)
        })

    setTimeout(() => {
            subscription
                .renew()
                .catch(e => {
                    console.error("Issue renewing subscription")
                })
        }, 59 * 1000) // every 59 miunutes

}

async function wasIMentioned(msg) {

    if (!msg.mentions) { return false }

    let foundMeInMentions = msg.mentions.find(mention => {
        return mention.id == userExtensionId
    })

    if (foundMeInMentions) {
        return true
    } else {
        return false
    }

}

/**
 * Response pong to an activity test from user
 * 
 * @param string extensionId 
 */
async function pong(extensionId) {
    rcsdk
        .platform()
        .post(`/restapi/v1.0/glip/posts`, {
            text: "pong",
            personIds: [extensionId]
        })
        .catch(e => {
            console.error("Issue responding to @mention: ", e.message)
        })
}

/**
 * Responds to a user request about info on their current OOO setting
 * 
 * @param string extensionId 
 */
async function info(extensionId) {

    let oooInfo = await getUserData(extensionId.toString())

    let responseText = []

    Object.keys(oooInfo).forEach(key => {
        responseText.push(`${key}: ${oooInfo[key]}`)
    })

    rcsdk
        .platform()
        .post(`/restapi/v1.0/glip/posts`, {
            text: responseText.join(", "),
            personIds: [extensionId]
        })
        .catch(e => {
            console.error("Issue responding to @mention: ", e.message)
        })
}

/**
 * Response pong to an activity test from user
 * 
 * @param string extensionId 
 * @param string Message test to parse for valid start and end dates, and message to respond with
 */
async function newOoo(extensionId, message) {

    message = message.replace('newooo', '')

    let split = message.split('-')

    let errorMessage = []

    let oooInfo = {
        startDate: moment(split[1]).toISOString(),
        endDate: moment(split[2]).toISOString(),
        message: split[3]
    }

    if (!moment(oooInfo.startDate).isValid()) {
        errorMessage.push("Start date is not valid. Use MM/DD/YYYY")
    }

    if (!moment(oooInfo.endDate).isValid()) {
        errorMessage.push("End date is not valid. Use MM/DD/YYYY")
    }

    if (!oooInfo.message) {
        errorMessage.push("Something went wrong with the Out of Office message text")
    }

    if (errorMessage.length > 0) {
        errorMessage.push("\n\nMessage content should look like:\nnew ooo - 04/01/2020 - 04/05/2020 - This is the out of office response message")
    }

    console.log(oooInfo)

    console.log(errorMessage)

    if (moment(oooInfo).isBefore(moment())) {
        errorMessage.push("End date must be after today's date")
    }

    let expiresIn = moment(oooInfo.endDate) - moment()

    setUserData(extensionId, oooInfo, expiresIn)
        .catch(e => {
            errorMessage.push(e)
        })

    rcsdk
        .platform()
        .post(`/restapi/v1.0/glip/posts`, {
            text: errorMessage.length > 0 ? errorMessage.join(', ') : "Set successfully",
            personIds: [extensionId]
        })
        .catch(e => {
            console.error("Issue responding to @mention: ", e.message)
        })
}

async function autoResponse(extensionId, messageRecipient, ooInfo) {

    let oooInfo = await getUserData(extensionId)

    let respoonseMessage = `Automated Response: ${oooInfo.message}`

    rcsdk
        .platform()
        .post(`/restapi/v1.0/glip/posts`, {
            text: respoonseMessage,
            personIds: [messageRecipient]
        })
        .catch(e => {
            console.error("Issue responding to @mention: ", e.message)
        })
}