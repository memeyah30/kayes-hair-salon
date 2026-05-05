const https = require('https');

https.get('https://tholitssystemcapstone-production.up.railway.app/api/public/ratings', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log("PRODUCTION API RETURNS:", data);
  });
}).on('error', err => {
  console.error("ERROR:", err.message);
});
