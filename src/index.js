const express = require("express");
const cors = require("cors")
require("dotenv").config()
const bodyParser = require("body-parser");
const route = require("./route/router");
const mongoose = require("mongoose");
const app = express();

app.use(cors())

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(process.env.DB, {
    useNewUrlParser: true
})
    .then(() => console.log("MongoDB is Connected"))
    .catch(err => console.log(err.message))

app.use("/", route)

app.listen(process.env.PORT, function () {
    console.log("Express app is Running on port " + (process.env.PORT))
});
