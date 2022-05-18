const urlModel = require("../model/urlModel");
const nanoId = require("nanoid")
const validUrl = require("valid-url");
const redis = require("redis");
const { promisify } = require("util");


const isValid = function (value) {
    if (typeof value === "undefined" || typeof value === null) return false
    if (typeof value === "string" && value.trim().length == 0) return false
    return true
}


//Connect to redis
const redisClient = redis.createClient(
    13190,
    "redis-13190.c301.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("gkiOIPkytPI3ADi14jHMSWkZEo2J5TDG", function (err) {
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

const fetchAuthorProfile = async function (req, res) {
    let cahcedProfileData = await GET_ASYNC(`${req.params.authorId}`)
    if (cahcedProfileData) {
        res.send(cahcedProfileData)
    } else {
        let profile = await authorModel.findById(req.params.authorId);
        await SET_ASYNC(`${req.params.authorId}`, JSON.stringify(profile))
        res.send({ data: profile });
    }

};


const createUrl = async function (req, res) {
    try {
        const requestBody = req.body;
        //  IF  BODY EMPTY
        if (Object.keys(requestBody).length == 0)
            return res.status(400).send({ status: false, message: "Enter Data in Body" });

        // DATA  VALIDATION
        if (!isValid(requestBody.longUrl))
            return res.status(400).send({ status: false, message: "Enter Url in LongUrl key" });
        //   URL  VALIDATION 
        if (!validUrl.isUri(requestBody.longUrl))
            return res.status(400).send({ status: false, message: "Enter valid url" })

        // URL  SHORTENING 
        requestBody.urlCode = nanoId.nanoid(); //  URL CODE CREATION
        requestBody.shortUrl = "http://localhost:3000/" + requestBody.urlCode; // URL  SHORTING  CONCATINAION  

        let data
        //  IF ALL THING ALLREADY EXIST  FOR SAME URL
        const existUrl = await urlModel.findOne({ longUrl: requestBody.longUrl });
        if (existUrl) {
            data = {
                longUrl: existUrl.longUrl,
                shortUrl: existUrl.shortUrl,
                urlCode: existUrl.shortUrl
            }
            return res.status(200).send({ status: true, data: data })
        }

        //  document creation in DB
        const urlCreated = await urlModel.create(requestBody);
        data = {
            longUrl: urlCreated.longUrl,
            shortUrl: urlCreated.shortUrl,
            urlCode: urlCreated.urlCode
        }
        res.status(201).send({ status: true, data: data })
    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
};

const getUrl = async function (req, res) {
    try {
        const requestBody = req.params.urlCode;

        if (Object.keys(requestBody).length === 0)
            return res.status(400).send({ status: false.valueOf, message: "Enter Urlcode in params" })
        //  FINDING   THE  DOCUMENT  IN  DB
        const url = await urlModel.findOne({ urlCode: requestBody });
        if (!url)
            return res.status(404).send({ status: false, message: "Url Not Found for Given UrlCode" });
        //  SENDING   RESPONSE
        res.status(301).redirect(url.longUrl)
    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
};


module.exports = { createUrl, getUrl }