const dns = require('dns');

dns.resolveSrv('_mongodb._tcp.cluster0.vui2pms.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('DNS SRV Error:', err);
  } else {
    console.log('SRV Records:', JSON.stringify(addresses, null, 2));
  }
});
