"use strict";

const express = require("express");

const app = express();
const bodyParser = require("body-parser");
const WooData = require("./woo-data");
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 10000 });

app.use(bodyParser.json());
let weeklyHours = {};
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
  res.json({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*It's 80 degrees right now.*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Partly cloudy today and tomorrow",
        },
      },
    ],
  });
});

app.get("/hours/:person/:hours", (req, res) => {
  let { person, hours } = req.params;
  weeklyHours[person] = Number(hours);
  res.json(weeklyHours);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Serverless Error");
});

module.exports = app;
