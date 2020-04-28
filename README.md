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

## Setup
Make a copy of the `env_example` file, and rename it `.env`. Then edit the fields in it. 

## Run
With all that set up, you can kick it off from command line using `node .`

If you want to get fancy, you can use something like [PM2](https://pm2.keymetrics.io) to manage keeping the app alive for you. 

## Autho
John Celoria jceloria@gmail.com