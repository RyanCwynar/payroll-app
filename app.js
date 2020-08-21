"use strict";

const express = require("express");

const app = express();
const bodyParser = require("body-parser");
const WooData = require("./woo-data");
const Sheet = require('./sheets.js');
const NodeCache = require("node-cache");
const { get } = require("lodash");
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

const userIdMap = {
  U015RC0VA67: {
    name: "Ryan Humphries",
    row: 4
  },
  UAGA7ERLM: {
    name: "Nick Matos",
    row: 2
  },
  U39LD2HA6: {
    name: "Ryan Cwynar",
    row: 3
  },
  U8NBNFBHB: {
    name: "Nick Benik",
    row: 1
  },
  U0JL9488J: {
    name: "Ben Saint Denis",
    row: 0
  }
}

const section = (text) => {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text,
    },
  };
};

const getCoord = (key) => {
  switch(key){
    case "summary":
      return [0, 3]
    case "ceiling":
      return [0,4]
  }
  return [10,10]
}

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
  if (!inputs || !inputs.token || inputs.token !== process.env.SLACK_TOKEN) {
    res.send("Invalid token");
    return;
  }
  if (inputs.channel_name !== "payroll") {
    res.send("Only use me in the #payroll channel");
    return;
  }
  const { user_name, text, user_id } = inputs;
  let args = text.split(" ").filter(Boolean);

  if (args.length == 0) {
    res.sendBlocks(printObj(inputs));
    return;
  }

  const action = args[0];
  const row = userIdMap[user_id].row

  // Quick actions
  let hours;
  switch (action) {
    case "hours":
      hours = get(args, "[1]", false);
      if(hours === false){
        hours = Sheet.get(row)
      }
      else{
        await Sheet.update(row, Number(hours))
      }
      res.sendBlocks( section( `You're currently reporting ${hours} hours this week.`));
      return;
    case "add-hours":
      hours = Number(get(args, "[1]", 0));
      let current = await Sheet.get(row)
      if (current)
        hours += current;
      await Sheet.update(row, hours)
      res.sendBlocks( section( `You're currently reporting ${hours} hours this week.`));
      return
    case "current-hours":
      const total = await Sheet.getTotal()
      res.sendBlocks( section( `Total actual hours reported this week ${total}`));
      return
    default:
  }

  let summary = false

  if (!cache.has("summary")) {
    res.sendBlocks(section("*Compiling summary* Send this command again in a second"));
    const summary = await WooData.getSummary();
    await Sheet.updateCell(0,10, JSON.stringify(summary))
    cache.set("summary", summary);
    return
  }

  summary = cache.get("summary")
  const ceiling = summary.ceiling_hours

  switch (action) {
    case "contributors":
      let result = [];
      for (const contributor of summary.contributors) {
        let copy = JSON.parse(JSON.stringify(contributor))
        if (user_name !== process.env.ADMIN_USERNAME)
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
      res.sendBlocks(section(`There are ${ceiling} available from FoB this week`));
      return;
    case "my-payout":
      hours = await Sheet.get(row)
      if (!hours) {
        res.sendBlocks(section("You didn't report any hours yet"));
        return
      }

      const availableHours = ceiling || 0;
      const actualHours = cache.has("current-hours") ? cache.get("current-hours") : await Sheet.getTotal()

      if (availableHours < actualHours) {
        hours = (hours / actualHours) * availableHours;
      }

      const payout = Number(hours * 50).toFixed(2);
      res.sendBlocks(section(`Projected payout: $${ payout }`));
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
