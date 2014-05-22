var crypto = require('crypto');

var shasum = crypto.createHash('sha512WithRSAEncryption');
var salt = crypto.randomBytes(64).toString('hex');

console.log(salt);

var pwd = 'SecAdmin2';
var pwdplussalt = pwd + salt;

console.log(pwdplussalt);

shasum.update(pwdplussalt);

var res = shasum.digest('hex');

console.log(res);