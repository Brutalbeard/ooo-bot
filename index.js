const SDK = require('@ringcentral/sdk').SDK
const Subscriptions = require('@ringcentral/subscriptions').Subscriptions;
const { LocalStorage } = require('node-localstorage')
const dotenv = require('dotenv')
const moment = require('moment')

dotenv.config()
const localstorage = new LocalStorage('./auth')

const startDate = moment(process.env.START_DATE).startOf('day')
const endDate = moment(process.env.END_DATE).endOf('day')

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

    // Clean out old subs. Nice to have when developing.
    await rcsdk
        .platform()
        .get('/restapi/v1.0/subscription')
        .then(res => {
            return res.json()
        })
        .then(res => {
            cleanSubs(res.records)
        })
        .catch(e => {
            console.error(e.message)
        })

    let subscription = subscriptions.createSubscription();

    subscription.on(subscription.events.notification, async msg => {
        if (await wasIMentioned(msg.body) === true && moment().isBetween(startDate, endDate) == true) {
            rcsdk
                .platform()
                .post(`/restapi/v1.0/glip/posts`, {
                    text: process.env.RESPONSE_MESSAGE,
                    personIds: [msg.body.creatorId]
                })
                .catch(e => {
                    console.error("Issue responding to @mention: ", e.message)
                })
        }

        if (msg.body.creatorId == userExtensionId && msg.body.text.includes("ping")) {
            rcsdk
                .platform()
                .post(`/restapi/v1.0/glip/posts`, {
                    text: "pong",
                    personIds: [msg.body.creatorId]
                })
                .catch(e => {
                    console.error("Issue responding to @mention: ", e.message)
                })
        }

    });

    subscription
        .setEventFilters(['/restapi/v1.0/glip/posts']) // a list of server-side events
        .register()
        .catch(e => {
            console.error("Issue setting subscription filters: ", e.message)
        })

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

async function cleanSubs(subsList) {

    subsList.forEach(sub => {
        rcsdk
            .platform()
            .delete(`/restapi/v1.0/subscription/${sub.id}`)
            .catch(e => {
                console.error("Issue deleing sub: ", e.message)
            })
    })

}