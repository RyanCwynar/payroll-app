"use strict";

const express = require("express");

const app = express();
const bodyParser = require("body-parser");
const WooData = require("./woo-data");
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 10000 });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
let weeklyHours = {};
const getTotalWeeklyHours = ()=>{
  let sum = 0
  for(const key in weeklyHours){
    sum += weeklyHours[key]
  }
  return sum
}
// Routes
app.get("/", (req, res) => {
  res.json({ message: "We are here" });
});

app.all("/summary", async (req, res) => {
  if (cache.has("summary")) {
    res.json(cache.get("summary"));
  } else {
    res.send("check back in a minute");
    let summary = await WooData.getSummary();
    cache.set("summary", summary);
  }
});

app.post("/test", (req, res) => {
  let { user_name, text } = req.body;
  weeklyHours[user_name] = Number(text);
  res.json({ weeklyHours, totalHours: getTotalWeeklyHours() });
});

app.post("/total-hours", (req, res) => {
  res.json({ totalHours: getTotalWeeklyHours() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Serverless Error");
});

module.exports = app;
