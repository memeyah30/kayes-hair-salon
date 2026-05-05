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
          const regex = /api\.get\("\/public\/ratings"\)(.*?)setReviews/s;
          const m = jsData.match(regex);
          console.log(m ? m[0] : 'Not found');
        });
      });
    }
  });
});
