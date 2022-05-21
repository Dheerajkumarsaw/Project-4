const urlModel = require("../model/urlModel");
const nanoId = require("nanoid")
const redis = require("redis");
const { promisify } = require("util");

const isValid = function (value) {
    if (typeof value === "undefined" || typeof value === null) return false
    if (typeof value === "string" && value.trim().length == 0) return false
    return true
};
//  ====================   REDISLAB   CONNECTION   ========================================
//Connect to redis
const redisClient = redis.createClient(
    18167,
    "redis-18167.c212.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("a9a8JWjTaMvy4sAp00Cgdr4fw3Rut0yA", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

// ==================================    POST API  ==========================================================
const createUrl = async function (req, res) {
    try {
        const requestBody = req.body;
        //  IF  BODY EMPTY
        if (Object.keys(requestBody).length == 0)
            return res.status(400).send({ status: false, message: "Enter Data in Body" });

        // DATA  VALIDATION
        if (!isValid(requestBody.longUrl))
            return res.status(400).send({ status: false, message: "Enter Url in LongUrl key" });

        //  REGEX  FOR URL  VALIDATION
        let regx = /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})?$/;
        if (!regx.test(requestBody.longUrl)) {
            return res.status(400).send({ status: false, message: "Enter valid url" })
        };
        //  FUNCTION  FOR  MAKING  RESPONSE
        let data = function (value) {
            return {
                longUrl: value.longUrl,
                shortUrl: value.shortUrl,
                urlCode: value.urlCode
            }
        };
        //  CHECKING  EXISTANCE  IN  CACHE
        let cacheUrl = await GET_ASYNC(`${requestBody.longUrl}`);
        if (cacheUrl) {
            return res.status(200).send({ status: true, message: "Allready Created Coming From Cache", data: JSON.parse(cacheUrl) })
        } else {
            //  IF ALL THING ALLREADY EXIST  FOR SAME URL
            const existUrl = await urlModel.findOne({ longUrl: requestBody.longUrl }).select({ longUrl: 1, shortUrl: 1, urlCode: 1, _id: 0 });
            if (existUrl) {
                await SET_ASYNC(`${requestBody.longUrl}`, JSON.stringify(data(existUrl)));
                return res.status(200).send({ status: true, message: "Allready Created Coming From Cache", data: data(existUrl) })
            }
        };

        //  ======================   URL  SHORTENING   ===========================

        requestBody.urlCode = nanoId.nanoid(); //  URL CODE CREATION
        requestBody.shortUrl = "http://localhost:3000/" + requestBody.urlCode; // URL  SHORTING  CONCATINAION  
        //  document creation in DB
        const urlCreated = await urlModel.create(requestBody);
        await SET_ASYNC(`${requestBody.longUrl}`, JSON.stringify(data(urlCreated)));
        await SET_ASYNC(`${urlCreated.urlCode}`, JSON.stringify(urlCreated.longUrl));
        res.status(201).send({ status: true, data: data(urlCreated) });
    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
};

// ==============================================   GET   API   ====================================================

const getUrl = async function (req, res) {
    try {
        const requestBody = req.params.urlCode;

        if (Object.keys(requestBody).length === 0)
            return res.status(400).send({ status: false.valueOf, message: "Enter Urlcode in params" });
        //  cache  existance checcking 
        const cacheUrl = await GET_ASYNC(`${requestBody}`);
        if (cacheUrl) {
            res.status(302).redirect(JSON.parse(cacheUrl));
        } else {
            //  FINDING   THE  DOCUMENT  IN  DB
            const url = await urlModel.findOne({ urlCode: requestBody });
            if (!url)
                return res.status(404).send({ status: false, message: "Url Not Found for Given UrlCode" });
            // SETTING IN CACHE
            await SET_ASYNC(`${requestBody}`, JSON.stringify(url.longUrl));
            //  SENDING   RESPONSE
            res.status(301).redirect(url.longUrl)
        }
    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
};


module.exports = { createUrl, getUrl }

