'use strict';

const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const WooData = require('./woo-data');

app.use(bodyParser.json())
let weeklyHours = {}
// Routes
app.get('/', (req, res) => {
  
  res.json({ message: 'We are here' });
});

app.get('/summary', async (req, res) =>{
  let summary = await WooData.getSummary()
  res.json(summary)
})

app.get('/hours/:person/:hours', (req, res) => {
  let { person, hours } = req.params
  weeklyHours[person] = Number(hours)
  res.json(weeklyHours);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Serverless Error');
});

module.exports = app;
