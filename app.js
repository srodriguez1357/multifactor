const express = require("express");
const bodyParser = require('body-parser');
const JsonDB = require('node-json-db').JsonDB;
const Config = require('node-json-db/dist/lib/JsonDBConfig').Config;
const uuid = require("uuid");
const speakeasy = require("speakeasy");
var QRCode = require('qrcode');

const app = express();
var db = new JsonDB(new Config("myDataBase", true, false, '/'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/',(req, res) =>{
  res.render('index.ejs', {root: __dirname});
});


app.post("/api/regist", (req, res) => {
  const id = uuid.v4();
  try {
    const path = `/user/${id}`;
    // Create temporary secret until it it verified
    const temp_secret = speakeasy.generateSecret();
    res.json({ id, secret: temp_secret.base32 })
    QRCode.toDataURL(temp_secret.otpauth_url, function(err, data_url) {
      console.log(data_url);
      res.write('<img src="' + data_url + '">');
  });
    // Create user in the database
    db.push(path, { id, temp_secret });
    // Send user id and base32 key to user
    
  } catch(e) {
    console.log(e);
    res.status(500).json({ message: 'Error generating secret key'})
  }
})

app.post("/api/register", (req, res) => {
  res.render('newuser.ejs', {root: __dirname});
});

app.post("/api/newuser", (req, res) => {
  const { userId, secret } = req.body;
  const id = uuid.v4();
  try {
    const path = `/user/${userId}`;
    const temp_secret = speakeasy.generateSecret();
    db.push(path, { email:userId,pass:secret,token:temp_secret });
    res.json({ id, secret: temp_secret.base32 })
    QRCode.toDataURL(temp_secret.otpauth_url, function(err, data_url) {
        console.log(data_url);
        res.write('<img src="' + data_url + '">');
    });
    
    //res.render('main.ejs', {root: __dirname});
  } catch(e) {
    console.log(e);
    res.status(500).json({ message: 'Error generating secret key'})
  }
});

app.post("/api/verify", (req,res) => {
  const { userId, token } = req.body;
  try {
    const path = `/user/${userId}`;
    const user = db.getData(path);
    console.log({ user })
    const { base32: secret } = user.temp_secret;
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token
    });
    if (verified) {
      db.push(path, { id: userId, secret: user.temp_secret });
      res.json({ verified: true })
    } else {
      res.json({ verified: false})
    }
  } catch(error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving user'})
  };
})

app.post("/api/validate", (req,res) => {
  const { userId, token } = req.body;
  try {
    const path = `/user/${userId}`;
    const user = db.getData(path);
    console.log({ user })
    const { base32: secret } = user.secret;
    const tokenValidates = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1
    });
    if (tokenValidates) {
      res.json({ validated: true })
    } else {
      res.json({ validated: false})
    }
  } catch(error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving user'})
  };
})

const port = 9000;

app.listen(port, () => {
  console.log(`App is running on PORT: ${port}.`);
});