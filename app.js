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
app.post("/ceiling", async (req, res) => {
  if (cache.has("summary")) {
    const summary = cache.get("summary")
    res.send(`There are ${summary.ceiling_hours} available from FoB this week`)
  } else {
    res.send("check back in a minute");
    let summary = await WooData.getSummary();
    cache.set("summary", summary);
  }
});

app.post("/hours", (req, res) => {
  let { user_name, text } = req.body;
  weeklyHours[user_name] = Number(text);
  res.json({ weeklyHours, totalHours: getTotalWeeklyHours() });
});
app.post("/add-hours", (req, res) => {
  let { user_name, text } = req.body;
  if(weeklyHours[user_name])
    weeklyHours[user_name] += Number(text);
  else
    weeklyHours[user_name] = Number(text);
  res.send(`You're at ${weeklyHours[user_name]} so far this week`);
});

app.post("/current-hours", (req, res) => {
  res.send(`Total actual hours report this week ${getTotalWeeklyHours()}`);
});

app.post("/my-payout", async (req, res) => {
  const { user_name } = req.body
  let hours = Number(weeklyHours[user_name])
  if(!hours){
    res.send("You didn't report any hours yet")
    return
  }
  const summary = cache.get("summary")
  const availableHours = (summary) ? summary.ceiling_hours : 0
  if(!availableHours){
    res.send("check back in a minute");
    let summary = await WooData.getSummary();
    cache.set("summary", summary);
    return
  }
  const actualHours = getTotalWeeklyHours()
  
  if(availableHours < actualHours){
    hours = hours / actualHours * availableHours
  }
  const payout = Number(hours * 50).toFixed(2)
  res.send(`Projected payout: $${payout}`)
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Serverless Error");
});

module.exports = app;
