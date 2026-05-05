const axios = require('axios');
axios.get('https://tholitssystemcapstone-production.up.railway.app/api/public/ratings')
  .then(res => {
    console.log('Is Array?', Array.isArray(res.data));
    console.log('Data:', res.data);
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
