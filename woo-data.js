require("dotenv").config();
var WooCommerceAPI = require("woocommerce-api");

const WooData = module.exports

var woo = new WooCommerceAPI({
  url: "https://fueledonbacon.com/",
  consumerKey: process.env.WOO_KEY,
  consumerSecret: process.env.WOO_SECRET,
  wpAPI: true,
  version: "wc/v1",
});

var getAddends = (subs) => {
  return subs
  .filter((curr) => {
    if (curr.status == "active") {
      return true
    }
    return false
  })
  .map(curr => ({
    name: `${curr.billing.first_name} ${curr.billing.last_name}`,
    company: curr.billing.company,
    total: (curr.billing_period == 'week') ? Number(curr.total) : Number(curr.total) / 4 
  }))
};

var sum = (items) => items.reduce((total, curr) => total + curr.total, 0)
var summary = (subs) => {
  const contributors = getAddends(subs)
  const total = sum(contributors)

  for(const contributor of contributors) {
    contributor.percent = Number(Number(contributor.total / total).toFixed(2))
    contributor.percent_formatted = `${contributor.percent * 100}%`
  }
  contributors.sort((a,b) => b.total - a.total)

  return { 
    contributors,
    revenue_weekly: total,
    ceiling_hours: Math.floor(total * 0.8 / 50)
  }
}

WooData.getSummary = async () =>{
  let response = await woo.getAsync("subscriptions")
  const subscriptions = JSON.parse(response.body);
  const data = summary(subscriptions)
  return data
}
