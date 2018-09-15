var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var fs = require('fs');
var path = require('path');
var dotenv = require('dotenv');
var softether = require('./worker');

// variable constants
dotenv.config();
var APP_PORT = 3000;
var SE_ADDRESS = process.env.SE_ADDRESS;
var SE_PORT = process.env.SE_PORT;
var SE_PASSWORD = process.env.SE_PASSWORD;
var SE_HUBNAME = process.env.SE_HUBNAME;

// use body parser
app.use(bodyParser.json());

// create vpncmd instance
var vpncmd = new softether({
  "softetherPath": "/usr/local/vpnserver/vpncmd",
  "softetherURL": SE_ADDRESS,
  "softetherPort": SE_PORT,
  "softetherPassword": SE_PASSWORD,
  "softetherHub": SE_HUBNAME
});

function toFloat(str) {
  return parseFloat(String(str).replace(/[^\d\.\-]/g, ''));
}

// routes
app.get('/', (req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Are you lost my friend? Please contact Kenma for more details :)');
});

app.get('/sessions', (req, res) => {
  vpncmd.listSession().then((sessions) => {
    vpncmd.getServerStatus().then((statuslist) => {
      var list = sessions.map((session) => {
        // look for SecureNAT or LocalBridge and update their transfers
        // based on the serverData only
        if (['SecureNAT', 'LocalBridge'].includes(session.UserName)) {
          let totalbytes = statuslist.find(status => status.Item === 'OutgoingUnicastTotalSize');
          let totalpackets = statuslist.find(status => status.Item === 'OutgoingUnicastPackets');
          session.TransferBytes = totalbytes.Value.replace('bytes', '');
          session.TransferPackets = totalpackets.Value.replace('packets', '');
        }

        return {
          username: session.UserName,
          transferBytes: toFloat(session.TransferBytes),
          transferPackets: toFloat(session.TransferPackets)
        };
      });

      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(list));
    });
  });
});

app.get('/server', (req, res) => {
  vpncmd.getServerStatus().then((status) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(status));
  });
});

app.get('/users', (req, res) => {
  vpncmd.listUsers().then((users) => {
    var list = users.map((user) => {
      return {
        username: user.UserName,
        logins: user.NumLogins,
        lastLogin: user.LastLogin,
        expiration: user.ExpirationDate,
        transferBytes: toFloat(user.TransferBytes),
        transferPackets: toFloat(user.TransferPackets),
      };
    });

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(list));
  });
});

app.listen(APP_PORT);

console.log(`Server is now running at ${SE_ADDRESS}:${APP_PORT}`);

exports = module.exports = app;
