const https = require('https');

https.get('https://kayes-hair-salon.vercel.app', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      https.get('https://kayes-hair-salon.vercel.app' + match[1], (jsRes) => {
        let jsData = '';
        jsRes.on('data', chunk => jsData += chunk);
        jsRes.on('end', () => {
          const apiMatch = jsData.match(/https:\/\/[^"]+\.up\.railway\.app/);
          console.log('API URL:', apiMatch ? apiMatch[0] : 'not found');
        });
      });
    }
  });
});
