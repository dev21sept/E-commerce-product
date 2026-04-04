const dns = require('dns').promises;

async function checkDNS() {
  const host = 'cluster0.vui2pms.mongodb.net';
  try {
    const txt = await dns.resolveTxt(host);
    console.log('TXT Records:', JSON.stringify(txt, null, 2));
    
    // Attempting to resolve SRV record (which you say is failing)
    const srv = await dns.resolveSrv('_mongodb._tcp.' + host);
    console.log('SRV Records:', JSON.stringify(srv, null, 2));
    
  } catch (err) {
    console.error('DNS Error Trace:', err);
  }
}

checkDNS();
