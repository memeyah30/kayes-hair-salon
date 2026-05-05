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
          const idx = jsData.indexOf('/public/ratings');
          if (idx !== -1) {
            console.log(jsData.substring(idx - 100, idx + 200));
          } else {
            console.log('Not found');
          }
        });
      });
    }
  });
});
