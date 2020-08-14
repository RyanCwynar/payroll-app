"use strict";

const express = require("express");

const app = express();
const bodyParser = require("body-parser");
const WooData = require("./woo-data");
const NodeCache = require("node-cache");
const { get } = require("lodash");
const cache = new NodeCache({ stdTTL: 10000 });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
let weeklyHours = {};
const getTotalWeeklyHours = () => {
  let sum = 0;
  for (const key in weeklyHours) {
    sum += weeklyHours[key];
  }
  return sum;
};

const section = (text) => {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text,
    },
  };
};

const printObj = (obj) => {
  let result = [];
  for (const key in obj) {
    if (typeof obj[key] !== "object")
      result.push(section(`*${key}*: ${obj[key]}`));
  }
  return result;
};

// Routes
app.get("/", (req, res) => {
  res.send("This is the FoB Slack Payroll API");
});

app.post("/", async (req, res) => {

  res.sendBlocks = function (data) {
    if (Array.isArray(data)) this.json({ blocks: data });
    else this.json({ blocks: [data] });
  };

  const inputs = req.body;
  if (inputs.token !== process.env.SLACK_TOKEN) {
    res.send("Invalid token");
    return;
  }
  if (inputs.channel_name !== "payroll") {
    res.send("Only use me in the #payroll channel");
    return;
  }
  const { user_name, text } = inputs;
  let args = text.split(" ").filter(Boolean);

  if (args.length == 0) {
    res.sendBlocks(printObj(inputs));
    return;
  }

  const action = args[0];
  // Quick actions
  let hours;
  switch (action) {
    case "hours":
      hours = Number(get(args, "[1]", 0));
      weeklyHours[user_name] = hours;
      res.sendBlocks(
        section(
          `You're currently reporting ${weeklyHours[user_name]} hours this week.`
        )
      );
      return;
    case "add-hours":
      hours = Number(get(args, "[1]", 0));
      if (weeklyHours[user_name]) hours += weeklyHours[user_name];
      weeklyHours[user_name] = hours;
      res.sendBlocks(
        section(
          `You're currently reporting ${weeklyHours[user_name]} hours this week.`
        )
      );
      return;
    case "current-hours":
      res.sendBlocks(
        section(
          `Total actual hours reported this week ${getTotalWeeklyHours()}`
        )
      );
      return;
    default:
  }

  // actions requiring a summary on hand
  if (!cache.has("summary")) {
    res.sendBlocks(section("*Compiling summary* check back in a minute"));
    const summary = await WooData.getSummary();
    cache.set("summary", summary);
    return
  }

  const summary = cache.get("summary");
  const ceiling = summary.ceiling_hours
  switch (action) {
    case "contributors":
      let result = [];
      for (const contributor of summary.contributors) {
        let copy = JSON.parse(JSON.stringify(contributor))
        if(user_name !== "ryancwynar")
          delete copy.total
        copy.weekly_hours = Math.round(ceiling * copy.percent)
        delete copy.percent
        delete copy.percent_formatted
        result.push(...printObj(copy));
        result.push({ type: "divider" });
      }
      res.sendBlocks(result);
      return;
    case "ceiling":
      res.sendBlocks(
        section(
          `There are ${summary.ceiling_hours} available from FoB this week`
        )
      );
      return;
    case "my-payout":
      let hours = Number(weeklyHours[user_name]);
      if (!hours) {
        res.sendBlocks(section("You didn't report any hours yet"));
        return;
      }
      const availableHours = summary ? summary.ceiling_hours : 0;
      const actualHours = getTotalWeeklyHours();

      if (availableHours < actualHours) {
        hours = (hours / actualHours) * availableHours;
      }
      const payout = Number(hours * 50).toFixed(2);
      res.sendBlocks(section(`Projected payout: $${payout}`));
      return;
    default:
  }
  res.sendBlocks(section("Unknown command"));
  return;
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Serverless Error");
});

module.exports = app;
