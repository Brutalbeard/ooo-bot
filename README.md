# Stupid simple OOO for Glip

## About
Really dang basic. You put into your `.env` sheet the start date and end date, and message you want. 

If someone hits you with an @ mention within that window of time, they get your reply as a direct message.

That's it. 

## Install
Uses [Node JS](nodejs.org).

Download or clone the repo, then open up terminal and cd into the app's root. 

```
npm install
```

Most recent update added Redis support, to store configs from user. The user also can set their own OOO from Glip, by talking to themself.

Install Redis on your server, and this app expects that it will use all default settings from a new local Redis install.

## Setup
Make a copy of the `env_example` file, and rename it `.env`. Then edit the fields in it. 

## Run
With all that set up, you can kick it off from command line using `node .`

If you want to get fancy, you can use something like [PM2](https://pm2.keymetrics.io) to manage keeping the app alive for you. 

## Usage

To talk to your bot directly, you're actually going to talk to yourself in Glip. You can select your icon at the top right, and send yourself a message from there. 

Commands: 

1. ping
    * Responds with pong, just to let you know the service is up.
2. get ooo
    * Responds back with any current ooo settings stored in redis
3. new ooo
    * Lets you set a new out of office message using the following format
    * new ooo - 05/01/2020 - 05/05/2020 - I will be out of office until the 6th. Reach out to so and so
4. test
    * Responds to you directly as though you'd been @ mentioned

## Author
John Celoria jceloria@gmail.com