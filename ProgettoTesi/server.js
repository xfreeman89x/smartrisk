//****************//
// inizialitazion //
//****************//

// modules and variables
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var string = require('string');
var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var https = require('https');
var connect = require('connect');
var exec = require('child_process').exec;
var xml2js = require('xml2js');
var ipModule = require('ip');
var async = require('async');

// path to private key and certificate
var pathSSH = __dirname + '/ssh/';

//array containing private key and certificate
var options = {
	key: fs.readFileSync(pathSSH + 'nodo.key'),
	cert: fs.readFileSync(pathSSH + 'nodoCert.pem'),
	ca: fs.readFileSync(pathSSH + 'cacert.pem'),
	requestCert: true,
	rejectUnauthorized: true
};

// secret key to "crypt" sessions
var SITE_SECRET = 'supercalifragilistichespiralitoso';

// area of memory where sessions are stored
var sessionStore = new connect.session.MemoryStore();

var port = 3000;

// initialization of express
var app = express();

// creating mysql instance
var pool = mysql.createPool({
	host: 'localhost',
	user: 'root',
	password: '1234',
	database: 'smartrisk'
});

//****************************************************//
// configure section - configuring express enviroment //
//****************************************************//

// directory of resources
app.set('views', __dirname + '/client');

// render engine to load webpage
app.engine('.html', require('ejs').renderFile);

// public contents (css, js, images, ecc)
app.use(express.static(__dirname + '/client/public'));

// this object parse cookie headers and populates req.cookie
app.use(cookieParser(SITE_SECRET));

// this object is a json interpreter
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(session({
	secret: 'supercalifragilistichespiralitoso',
	key: 'express.sid',
	store: sessionStore,
	cookie: {
		// this feature set httpOnly flag that helps
		// to mitigate the risk of client side script
		// accessing the protected cookie
		httpOnly: true,
		
		// cookie communication is limited to encrypted
		// transmission. This flag could help to mitigate
		// man-in-the-middle attacks
		secure: true
	}
}));

//*****************//
// starting server //
//*****************//

// creating server instance...
var server = https.createServer(options, app);

// ...listening at port XXXXX
server.listen(port, function(){
	console.log("Express server listening on port " + port);
});

//***************************************//
// routing GET/POST request from clients //
//***************************************//
app.get('/', function(req, res) {
	res.render('index.html');
});

app.get('/login', function(req, res) {
	if(req.session.user) {
		res.render('home.html');
	}
	else {
		res.render('login.html');
	}
});

app.get('/home', function(req, res) {
	if(req.session.user) {
		res.render('home.html');
	}
	else {
		res.render('index.html');
	}
});

app.get('/prepare-for-assessment', function(req, res) {
	if(req.session.user) {
		res.render('prepare-for-assessment.html');
	}
	else {
		res.render('index.html');
	}
});

app.get('/conduct-assessment', function(req, res) {
	if(req.session.user && req.session.currentAssessment) {
		res.render('conduct-assessment.html');
	}
	else {
		res.render('index.html');
	}
});

app.get('/communicate-result', function(req, res) {
	if(req.session.user) {
		res.render('communicate-result.html');
	}
	else {
		res.render('index.html');
	}
});

app.get('/logout', function(req, res) {
	req.session.user = false;
	req.session.currentAssessment = '';
	res.render('login.html');
});

app.post('/login', function(req, res) {
	// stripping strings to mitigate
	// SQL Injection and Cross Site Scripting
	var username = req.body.username;
	username = string(username).trim().s;
	username = string(username).stripTags().s;
	username = string(username).stripPunctuation().s;
	
	var password = req.body.password;
	password = string(password).trim().s;
	password = string(password).stripTags().s;
	password = string(password).stripPunctuation().s;

	var shasum = crypto.createHash('sha512WithRSAEncryption');
	
	if(username != '' && password != '') {
		pool.getConnection(function(err, connection) {
			connection.query("SELECT * FROM utenti WHERE Username = '" + username + "';", function(err, result, fields) {
				if(err) {
					console.log(err);
					connection.release();
					throw err;
				}
				if(result[0] != null) {  // result isEmpty()
					var salt = result[0].Salt;
					shasum.update(password + salt);
					var pwd = shasum.digest('hex');
					if(pwd === result[0].Pwd) { // authenticated
						connection.release();
						// user is authenticated until end of session
						req.session.user = true;
						req.session.username = result[0].Username;
						req.session.userid = result[0].UserId;
						req.session.currentAssessment = null;
						// user profile folder check/creation
						req.session.folder = __dirname + "/users/" + req.session.username;
						if(!fs.existsSync(req.session.folder)) { // if it doesn't exists, it's going to be created...
							fs.mkdirSync(req.session.folder);
						}
						// ajax response
						res.writeHead(200, {'Content-Type':'text/plain'});
						res.end('2');	// OK
					}
					else { // wrong password
						connection.release();
						// ajax response
						res.writeHead(200, {'Content-Type':'text/plain'});
						res.end('1');	// ERR
					}
				}
				else { // failed authentication
					connection.release();
					// ajax response
					res.writeHead(200, {'Content-Type':'text/plain'});
					res.end('1');
				}
			});
		});
	}
	else {
		// ajax response
		res.writeHead(200, {'Content-Type':'text/plain'});
		res.end('1');
	}
});

app.post('/home', function(req, res) {
	if(req.body.request === 'username') {
		res.writeHead(200, {'Content-Type':'text/plain'});
		res.end(req.session.username);
	}
});

app.post('/prepare-for-assessment', function(req, res) {
	if(req.body.request === 'sessionData') {
		// check current assessment to manage one single session
		if(req.session.currentAssessment == null) {
			res.json({response: 'none'});
		}
		else {
			res.json({response: req.session.currentAssessment});
		}
	}
	else if(req.body.request === 'detach') {
		req.session.currentAssessment = null;
		res.json({response: 'detached'});
	}
	else if(req.body.request === 'new') {
		var nome = req.body.nome;
		nome = string(nome).trim().s;
		nome = string(nome).stripTags().s;
		nome = string(nome).stripPunctuation().s;
		
		var organizzazione = req.body.organizzazione;
		organizzazione = string(organizzazione).trim().s;
		organizzazione = string(organizzazione).stripTags().s;
		organizzazione = string(organizzazione).stripPunctuation().s;
		if(organizzazione == '') { // mysql query format
			organizzazione = 'NULL';
		}
		else {
			organizzazione = "'" + organizzazione + "'";
		}
		
		var responsabile = req.body.responsabile;
		responsabile = string(responsabile).trim().s;
		responsabile = string(responsabile).stripTags().s;
		responsabile = string(responsabile).stripPunctuation().s;
		if(responsabile == '') {
			responsabile = 'NULL';
		}
		else {
			responsabile = "'" + responsabile + "'";
		}	
		
		var descrizione = req.body.descrizione;
		descrizione = string(descrizione).trim().s;
		descrizione = string(descrizione).stripTags().s;
		descrizione = string(descrizione).stripPunctuation().s;
		if(descrizione == '') {
			descrizione = 'NULL';
		}
		else {
			descrizione = "'" + descrizione + "'";
		}
			
		if(nome != '') {
			if(req.session.currentAssessment == null) {
				var sqlQuery1 = "SELECT Nome FROM assessment WHERE Nome = '"+nome+"' AND UserId = '"+req.session.userid+"';";
				var sqlQuery2 = "INSERT INTO assessment(Nome, UserId, Organizzazione, RespSicurezza, Descrizione) VALUES ('"+nome+"',"+req.session.userid+","+organizzazione+","+responsabile+","+descrizione+");";
				pool.getConnection(function(err, connection) {
					connection.query(sqlQuery1, function(err1, result1, fields1) {
						if(err1) {
							console.log(err1);
							connection.release();
							throw err1;
						}
						else {
							if(result1[0] == null) { // se non esiste un assessment con il seguente nome...
								connection.query(sqlQuery2, function(err2, result2, fields2) { // lo inserisco
									if(err2) {
										console.log(err2);
										connection.release();
										throw err2;
									}
									else {
										connection.release();
										req.session.currentAssessment = nome;
										console.log(req.session.currentAssessment);
										res.writeHead(200, {'Content-Type':'text/plain'});
										res.end('newAssessmentOk');
									}
								});
							}
							else { // se esiste gia' non lo posso creare
								connection.release();
								res.writeHead(200, {'Content-Type':'text/plain'});
								res.end('AlreadyExist');
							}
						}
					});
				});
			}
			else {
				res.writeHead(200, {'Content-Type':'text/plain'});
				res.end('AnotherAssessmentIsRunning');
			}
		}
		else {
			res.writeHead(200, {'Content-Type':'text/plain'});
			res.end('NothingToCreate');
		}
	}
	else if(req.body.request === 'load' || req.body.request === 'delete') {
		var sqlQuery = "SELECT Nome, Organizzazione, RespSicurezza, Descrizione FROM assessment WHERE UserId = '"+req.session.userid+"';";
		pool.getConnection(function(err, connection) {
			connection.query(sqlQuery, function(err, result, fields) {
				if(err) {
					console.log(err);
					connection.release();
					throw err;
				}
				else {
					connection.release();
					if(result.length > 0) {
						res.json({response: result});
					}
					else {
						res.json({response: 'none'});
					}					
				}				
			});
		});
	}
	else if(req.body.request === 'commit-load') {
		var nome = req.body.arg;
		nome = string(nome).trim().s;
		nome = string(nome).stripTags().s;
		nome = string(nome).stripPunctuation().s;
		
		if(nome != '') {
			if(req.session.currentAssessment == null) {
				sqlQuery = "SELECT Nome FROM assessment WHERE Nome = '"+nome+"' AND UserId = '"+req.session.userid+"';";
				pool.getConnection(function(err, connection) {
					connection.query(sqlQuery, function(err, result, fields) {
						if(err) {
							res.json({response: 'genericError'});
							connection.release();
							throw err;
						}
						else {
							if(result[0] != null) {
								connection.release();
								req.session.currentAssessment = result[0].Nome;
								res.json({response: 'assessmentLoaded'});
							}
							else {
								connection.release();
								res.json({response: 'genericError'});
							}
						}
					});
				});
			}
			else {
				res.json({response: 'AnotherAssessmentIsRunning'});
			}			
		}
	}
	else if(req.body.request === 'commit-delete') {
		var nome = req.body.arg;
		nome = string(nome).trim().s;
		nome = string(nome).stripTags().s;
		nome = string(nome).stripPunctuation().s;
		
		if(nome != '') {
			if(nome != req.session.currentAssessment) { // ok, let's delete selected assessment
				sqlQuery = "DELETE FROM assessment WHERE Nome = '"+nome+"' AND UserId = '"+req.session.userid+"';";
				pool.getConnection(function(err, connection) {
					connection.query(sqlQuery, function(err, result, fields) {
						if(err) {
							res.json({response: 'genericError'});
							connection.release();
							throw err;
						}
						else {
							connection.release();
							res.json({response: 'assessmentDeleted'});
						}
					});
				});
			}
			else { // cannot delete selected assessment because is in use
				res.json({response: 'AnotherAssessmentIsRunning'});
			}
		}
	}
});

app.post('/conduct-assessment', function(req, res) {
	if(req.body.request === 'sessionData') {
		// check current assessment to manage one single session
		if(req.session.currentAssessment == null) {
			res.json({response: 'none'});
		}	
		else {
			res.json({response: req.session.currentAssessment});
		}
	}
	else if(req.body.request === 'detach') {
		req.session.currentAssessment = null;
		res.json({response: 'detached'});
	}
	else if(req.body.request === 'assetTree') {
		var temp = [];
		var treeArrayJson = '{"values":[';
		var serializedValues = ["organization", "person", "network", "system", "computing-device"];
		var inputValues = {
			"organization" : ["#", "#", "#", "#"],
			"person" : ["IdPerson", "part-of", "IdOrganization", "organization"],
			"network" : ["IdAsset", "organization-is-owner-of", "IdOrganization", "organization"],
			"system" : ["IdSystem", "connected-to-network", "IdNetwork", "network"],
			"computing-device" : ["IdComputingDevice", "computing-device-connected-to", "IdSystem", "system"]
		};
		var outputValues = {
			"organization" : "Name",
			"person" : "Name",
			"network" : "NetworkName",
			"system" : "SystemName",
			"computing-device" : "Hostname"
		};
		var outputParentValues = {
			"organization" : "#",
			"person" : "Name",
			"network" : "Name",
			"system" : "NetworkName",
			"computing-device" : "SystemName"
		};
		pool.getConnection(function(err, connection) {
			var sqlQuery1 = "SELECT IdAsset, AssetType " +
							"FROM asset " +
							"WHERE UserId = " + req.session.userid + " AND " +
							"NomeAssessment = '" + req.session.currentAssessment + "';";
			connection.query(sqlQuery1, function(err, result, fields) {
				if(err) {
					console.log(err);
					connection.release();
					throw err;
				}
				else {
					// console.log(result);
					for(var i = 0; i < result.length; i++) {
						var type = result[i].AssetType;
						if(typeof temp[type] === 'undefined') {
							temp[type] = [];
						}
						temp[type].push(result[i].IdAsset);
					}
					// console.log(temp);
					// serializing assets to make them ordered respect of their dependencies
					var serializedAsset = [];
					for(var i = 0; i < serializedValues.length; i++) {
						if(typeof(temp[serializedValues[i]]) !== 'undefined') {
							for(var j = 0; j < temp[serializedValues[i]].length; j++) {
								var obj = { "AssetType" : serializedValues[i], "IdAsset" : temp[serializedValues[i]][j] };
								serializedAsset.push(obj);
							}
						}
					}
					// console.log(serializedAsset);
					async.eachSeries(serializedAsset,
						function(asset, callback) {
							var selectValue = outputValues[asset.AssetType];
							var selectParentValue = outputParentValues[asset.AssetType];
							var sqlQuery2 = "SELECT " + selectValue + " " +
										"FROM `" + asset.AssetType + "` " +
										"WHERE IdAsset = " + asset.IdAsset + ";";
							connection.query(sqlQuery2, function(err, result, fields) {
								if(err) {
									console.log(err);
									connection.release();
									throw err;
								}
								else {
									// console.log("Name: " + result[0][selectValue]);
									treeArrayJson += '{"name" : "' + result[0][selectValue] + '",';
									treeArrayJson += '"type" : "' + asset.AssetType + '",';
									if(asset.AssetType !== 'organization') {
										var idLastSelect = inputValues[asset.AssetType][0];
										var fromLastValue = inputValues[asset.AssetType][1];
										var idSelect = inputValues[asset.AssetType][2];
										var fromValue = inputValues[asset.AssetType][3];
										var sqlQuery3 = "SELECT " + selectParentValue + " " +
														"FROM `" + fromValue + "` " +
														"WHERE " + idSelect + " IN (SELECT " + idSelect + " " +
																				   "FROM `" + fromLastValue + "` " +
																				   "WHERE " + idLastSelect + " IN (SELECT " + idLastSelect + " " +
																				   								  "FROM `" + asset.AssetType + "` " +
																				   								  "WHERE IdAsset = " + asset.IdAsset + "));";
										connection.query(sqlQuery3, function(err, result, fields) {
											if(err) {
												console.log(err);
												connection.release();
												throw err;
											}
											else {
												// console.log("Parent: " + result[0][selectParentValue]);
												treeArrayJson += '"parent" : "' + result[0][selectParentValue] + '"},';
												callback();
											}
										});
									}
									else {
										// console.log("Parent: #");
										treeArrayJson += '"parent" : "#"},';
										callback();
									}
								}
							});
						},
						function() {
							connection.release();
							if(treeArrayJson.lastIndexOf(',') !== -1) {
								treeArrayJson = treeArrayJson.substring(0, treeArrayJson.lastIndexOf(','));
							}
							treeArrayJson += ']}';
							var jsonRes;
							try {
								jsonRes = JSON.parse(treeArrayJson);
							}
							catch (e) {
								console.error("Parsing error: ", e);
								res.json({error: "parsing error"});
							}
							res.json(jsonRes);
						}
					);
				}
			});
		});
	}
	else if(req.body.request === 'asset') {
		if(req.session.currentAssessment != null) {
			var options = '{"values":["Organization", "Person", "Network", "System", ' +
				'"Computing Device", "Circuit", "Software", "Service", "Database", "Website"]}';
			var jsonRes = eval("(" + options + ")");
			res.json(jsonRes);
		}
		else {
			res.json({result: 'errorSession'});
		}
	}
	/*
	 *  Inizio - Divisione in gerarchie degli asset
	 *  
	 *  				Organization
	 *  				  |		 |
	 *  			  Person	Network
	 *  						 	|
	 *  						   System
	 *  							  |
	 *  						Computing-Device
	 *  						 |			  |
	 *  					Software		Circuit
	 *  					   |
	 *  					Service
	 *  					 |   |
	 *  			  Database   Website
	 */
	else if(req.body.request == 'assetType') {
		var option = req.body.arg;
		option = string(option).trim().s;
		option = string(option).stripTags().s;
		option = string(option).stripPunctuation().s;
		var v1, v2, v3, relation, info, destRelation, jsonStr, fieldName;
		switch(option) {
			case "organization":
				v1 = "organization";
				v2 = "o";
				v3 = true;
				relation = "";
				fieldName = "Name";
				info = '"values":["name", "email", "phone", "website"]';
				break;
			case "network":
				v1 = "organization"; // dependency
				v2 = "o"; // abbreviation
				v3 = false; // root
				relation = "owned by";
				fieldName = "Name"; // name of database column
				info = '"values":["network_name", "start_address", "end_address", "cidr"]';
				break;
			case "person":
				v1 = "organization";
				v2 = "o";
				v3 = false;
				relation = "is part of";
				fieldName = "Name";
				info = '"values":["name", "email", "phone", "birthdate"]';
				break;
			case "system":
				v1 = "network";
				v2 = "n";
				v3 = false;
				relation = "connected to";
				fieldName = "NetworkName";
				info = '"values":["system_name", "version"]';
				break;
			case "computing device":
				v1 = "system";
				v2 = "sys";
				v3 = false;
				relation = "connected to";
				fieldName = "SystemName"; // "fdqn", "url", // casomai inserire dopo se di utilita'
				info = '"values":["hostname", "ip_address", "distinguished_name", "mac_address", "motherboard_guid"]';
				break;
			case "software":
				v1 = "`computing-device`";
				v2 = "cd";
				v3 = false;
				relation = "installed on";
				fieldName = "Hostname";
				info = '"values":["installation_id", "cpe", "license"]';
				break;
			case "circuit":
				v1 = "`computing-device`";
				v2 = "cd";
				v3 = false;
				relation = "terminated in";
				fieldName = "Hostname";
				info = '"values":["circuit_name"]';
				break;
			case "service":
				v1 = "software";
				v2 = "sw";
				v3 = false;
				relation = "provided by";
				fieldName = "Cpe";
				info = '"values":["ip", "fdqn", "protocol"]';
				break;
			case "website":
				v1 = "service";
				v2 = "s";
				v3 = false;
				relation = "served by";
				fieldName = "Fdqn";
				info = '"values":["document_root", "locale"]';
				break;
			case "database":
				v1 = "service";
				v2 = "s";
				v3 = false;
				relation = "served by";
				fieldName = "Fdqn";
				info = '"values":["instance_name"]';
				break;
			default:
				v1 = "";
				v2 = "";
				v3 = false;
				relation = "";
				fieldName = "";
				info = '"values":[]';
		}
		if(req.session.currentAssessment != null && v1 != "") {
			var sqlQuery = "SELECT IdAsset, " + fieldName + " " +
						   "FROM " + v1 + " " +
						   "WHERE IdAsset IN (SELECT IdAsset " +
						   					  "FROM asset " + 
						   					  "WHERE UserId = " + req.session.userid + " " +
						   					  "AND NomeAssessment = '" + req.session.currentAssessment + "');";
			pool.getConnection(function(err, connection) {
				connection.query(sqlQuery, function(err, result, fields) {
					if(err) {
						console.log(err);
						connection.release();
						throw err;
					}
					else {
						connection.release();
						if(v3 == true) { // root
							if(result.length == 0) {
								destRelation = '"' + relation + '":[]';
								jsonStr = '{result: "enable", ' + '"relation":' + '"' + relation + '"' + ', ' + info + ', '+ destRelation + '}';
								var jsonRes = eval("(" + jsonStr + ")");
								res.json(jsonRes);
							}
							else if(result.length == 1) {
								res.json({result: 'disable'});
							}
							else {
								res.json({result: 'error'});
							}
						}
						else if(v3 == false) { // children
							if(result.length == 0) {
								res.json({result: 'disable'});
							}
							else if(result.length > 0) {
								var nameNull = false;
								destRelation = '"' + relation + '":[';
								for(var i = 0; i < result.length; i++) {
									if(result[i][fieldName] != null) {
										destRelation += '"' + result[i][fieldName] + '",';
									}
									else {
										//nameNull = true;
									}
								}
								if(nameNull == false) {
									destRelation = destRelation.substring(0, destRelation.lastIndexOf(','));
									destRelation += ']';
									jsonStr = '{result: "enable", ' + '"relation":' + '"' + relation + '"' + ', ' + info + ', '+ destRelation + '}';
									var jsonRes = eval("(" + jsonStr + ")");
									res.json(jsonRes);
								}
								else {
									res.json({result: 'error'});
								}
							}
						}
					}				
				});
			});
		}
		else {
			res.json({result: 'errorSession'});
		}		
	}
	/*
	 * Fine - Divisione in gerarchie degli asset
	 */
	else if(req.body.request === 'scan') {
		if(req.session.currentAssessment != null) {
			var sqlQuery = "SELECT * " +
						   "FROM network " +
						   "WHERE IdNetwork IN (SELECT IdNetwork " +
						                       "FROM `connected-to-network` " +
						                       "WHERE IdSystem IN (SELECT IdSystem " +
						                       					  "FROM system " +
						                       					  "WHERE SystemName = '" + req.body.arg + "'));";
			pool.getConnection(function(err, connection) {
				connection.query(sqlQuery, function(err, result, fields) {
					if(err) {
						console.log(err);
						connection.release();
						res.json({result: 'errorQuery'});
						throw err;
					}
					else {
						connection.release();
						if(result.length == 0) {
							res.json({result: 'errorQuery'});
						}
						if(result.length > 0) {
							var ipBufferStart, ipBufferEnd;
							if(result[0].Cidr == null) {
								var ipStart = result[0].IpNetStart;
								var ipEnd = result[0].IpNetEnd;
								ipBufferStart = ipModule.toBuffer(ipStart);
								ipBufferEnd = ipModule.toBuffer(ipEnd);
							}
							else {
								var ipCidr = result[0].Cidr;
								var ipAddr = ipCidr.substring(0, ipCidr.lastIndexOf('/'));
								var prefix = ipCidr.substring(ipCidr.lastIndexOf('/') + 1);
								var subnet = ipModule.fromPrefixLen(prefix);
								var ipStart = ipModule.subnet(ipAddr, subnet).firstAddress;
								var ipEnd = ipModule.subnet(ipAddr, subnet).lastAddress;
								ipBufferStart = ipModule.toBuffer(ipStart);
								ipBufferEnd = ipModule.toBuffer(ipEnd);
							}
							var vettDiff = new Array(4);
							var strNmap = '';
							for(var i = 0; i < 4; i++) {
								vettDiff[i] = Math.abs(ipBufferStart[i] - ipBufferEnd[i]);
								if(vettDiff[i] == 0) {
									strNmap += ipBufferStart[i] + ".";
								}
								else {
									strNmap += ipBufferStart[i] + "-" + ipBufferEnd[i] + ".";
								}
							}
							strNmap = strNmap.substring(0, strNmap.lastIndexOf("."));
							var timeAppend = (new Date()).getTime();
							var cmd = "nmap -sP -PP " + strNmap + " -oX " + 
								req.session.folder + "/temp" + timeAppend + ".xml";
							var child = exec(cmd, function(error, stdout, stderr) {
								var parser = new xml2js.Parser();
								var data = fs.readFileSync(req.session.folder + '/temp' + timeAppend + '.xml');
								parser.parseString(data, function(err, result) { // sync call default: online documentation
									if(result.nmaprun.host != null) {
										var ipTrovato = false;
										var hosts = '{"hosts":[';
										for(iHost = 0; iHost < result.nmaprun.host.length; iHost++) {
											for(iAddr = 0; iAddr < result.nmaprun.host[iHost].address.length; iAddr++) {
												if(result.nmaprun.host[iHost].address[iAddr]["$"].addrtype == 'ipv4') {
													hosts += '{"addr_ipv4":"' + result.nmaprun.host[iHost].address[iAddr]["$"].addr + '"},';
													ipTrovato = true;
												}
											}
										}
										// deleting temp file
										fs.unlinkSync(req.session.folder + '/temp' + timeAppend + '.xml');
										// console.log('successfully deleted' + req.session.folder + '/temp' + timeAppend + '.xml');
										if(ipTrovato == true) {
											hosts = hosts.substring(0, hosts.lastIndexOf(','));
										}										
										hosts += ']}';
										var jsonHosts = eval("(" + hosts + ")");
										res.json(jsonHosts);
									}
									else {
										res.json({result: 'invalidIpAddress'});
									}
								});
							});
						}
					}
				});
			});		
		}
		else {
			res.json({result: 'errorSession'});
		}
	}
	else if(req.body.request === 'addAsset') {
		// type of asset to add
		var option = req.body.arg1;
		option = string(option).trim().s;
		option = string(option).stripTags().s;
		option = string(option).stripPunctuation().s;
		// date for timestamp
		var now = new Date();
		var year = now.getFullYear();
		var month = ("0" + parseInt(now.getMonth() + 1)).slice(-2);
		var day = ("0" + now.getDate()).slice(-2);
		var hours = ("0" + now.getHours()).slice(-2);
		var minutes = ("0" + now.getMinutes()).slice(-2);
		var seconds = ("0" + now.getSeconds()).slice(-2);
		var timestamp = year + "-" + month + "-" + day + " " + 
			hours + ":" + minutes + ":" + seconds;
		switch(option) {
			case "organization":
				var name, email, phone, website;
				var errorEmail = false, errorPhone = false, errorWebsite = false;
				var errorReq = false;
				
				if(req.body.arg2['name'] != null) {
					name = req.body.arg2['name'];
					name = string(name).trim().s;
					name = string(name).stripTags().s;
					name = string(name).stripPunctuation().s;
					if(name == '') {
						name = 'NULL';
					}
					else {
						name = "'" + name + "'"; // database format
					}					
				}
				else {
					 errorReq = true;
				}				
				
				if(req.body.arg2['email'] != null) {
					email = req.body.arg2['email'];
					email = string(email).trim().s;
					email = string(email).stripTags().s;
					email = string(email).replaceAll(" ", "");
					email = string(email).replaceAll("'", "");
					email = string(email).replaceAll('"', "");
					if(email == '') {
						email = 'NULL'
					}
					else {	
						var emailPattern = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@" + 
							"(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?");
						if(emailPattern.test(email) == false) {
							errorEmail = true;
						}
						else {
							email = "'" + email + "'"; // database format
						}
					}
						
				}
				else {
					errorReq = true;
				}					
				
				if(req.body.arg2['phone'] != null) {
					phone = req.body.arg2['phone'];
					phone = string(phone).trim().s;
					phone = string(phone).stripTags().s;
					phone = string(phone).stripPunctuation().s;
					if(phone == '') {
						phone = 'NULL';
					}
					else {
						var phonePattern = new RegExp("^([0-9]{9,14})$");
						if(phonePattern.test(phone) == false) {
							errorPhone = true;
						}
						else {
							phone = "'" + phone + "'"; // database format
						}
					}
					
				}
				else {
					errorReq = true;
				}
				
				if(req.body.arg2['website'] != null) {
					website = req.body.arg2['website'];
					website = string(website).trim().s;
					website = string(website).stripTags().s;
					website = string(website).replaceAll(" ", "");
					website = string(website).replaceAll("'", "");
					website = string(website).replaceAll('"', "");
					if(website == '') {
						website ='NULL';
					}
					else {
						var urlPattern = new RegExp("^((http|https):\/\/)?((w{3}.)|(w{3}2.))?[a-zA-Z_0-9\-]{1,50}[.]" + 
							"[a-zA-Z]{2,5}((\/)?|(\/[a-zA-Z_0-9\-.?\/]{1,50})?)?$");
						if(urlPattern.test(website) == false) {
							errorWebsite = true;
						}
						else {
							website = "'" + website + "'"; // database format
						}
					}
				}
				else {
					errorReq = true;
				}
				if(errorReq == false && errorEmail == false && errorPhone == false && errorWebsite == false) {	
					pool.getConnection(function(err, connection) {
						connection.beginTransaction(function(err) {
							if(err) {
								throw err;
								res.json({result: 'error'});
							}
							else {
								var sqlQuery1 = "INSERT INTO asset(IdAsset, NomeAssessment, UserId, Resource, " + 
									"ExtendedInfo, Timestamp, IdLocation, AssetType) " +
									"VALUES (NULL, '" + req.session.currentAssessment + "'," + 
									req.session.userid + ", '" + req.session.currentAssessment + ":organization." + 
									timestamp.replace(" ", "_") + "', NULL, '" + timestamp + "', NULL, 'organization');";
								connection.query(sqlQuery1, function(err, result, fields) {
									if(err) {
										console.log('query1: failure');
										connection.rollback(function() {
											throw err;
										});
										res.json({result: 'error'});
									}
									else {
										var lastInsertIdQuery = "SELECT LAST_INSERT_ID();";
										connection.query(lastInsertIdQuery, function(err, result, fields) {
											if(err) {
												console.log('query insert id: failure');
												connection.rollback(function() {
													throw err;
												});
												res.json({result: 'error'});
											}
											else {
												var idAsset = result[0]["LAST_INSERT_ID()"];
												if(name == 'NULL') {
													name = "'defaultOrganization" + idAsset + "'"
												}
												var sqlQuery2 = "INSERT INTO organization(IdOrganization, IdAsset, Name, Email, PhoneNumber, WebsiteUrl)" +
												"VALUES (NULL, LAST_INSERT_ID(), " +  name + "," + email + "," + phone + "," + website + ");";
												connection.query(sqlQuery2, function(err, result, fields) {
													if(err) {
														console.log('query2: failure');
														connection.rollback(function() {
															throw err;
														});
														res.json({result: 'error'});
													}
													else {
														connection.commit(function(err) {
															if(err) {
																console.log('commit: failure');
																connection.rollback(function() {
																	throw err;
																});
																res.json({result: 'error'});
															}
															else {
																res.json({result: 'ok'});
															}
														});
													}
												});
											}
										});
									}
								});
							}
						});
					});
				}
				else if(errorReq == true) {
					res.json({result: 'errorReq'});
				}
				else if(errorEmail == true) {
					res.json({result: 'errorEmail'});
				}
				else if(errorPhone == true) {
					res.json({result: 'errorPhone'});
				}
				else if(errorWebsite == true) {
					res.json({result: 'errorWebsite'});
				}				
				break;
			case "person":
				var name, email, phone, birthdate, destination;
				var errorEmail = false, errorPhone = false, errorBirthdate = false, errorDestination = false;
				var errorReq = false;
				
				if(req.body.arg2['name'] != null) {
					name = req.body.arg2['name'];
					name = string(name).trim().s;
					name = string(name).stripTags().s;
					name = string(name).stripPunctuation().s;
					if(name == '') {
						name = 'NULL';
					}
					else {
						name = "'" + name + "'"; // database format
					}					
				}
				else {
					 errorReq = true;
				}				
				
				if(req.body.arg2['email'] != null) {
					email = req.body.arg2['email'];
					email = string(email).trim().s;
					email = string(email).stripTags().s;
					email = string(email).replaceAll(" ", "");
					email = string(email).replaceAll("'", "");
					email = string(email).replaceAll('"', "");
					if(email == '') {
						email = 'NULL'
					}
					else {	
						var emailPattern = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@" + 
							"(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?");
						if(emailPattern.test(email) == false) {
							errorEmail = true;
						}
						else {
							email = "'" + email + "'"; // database format
						}
					}
						
				}
				else {
					errorReq = true;
				}					
				
				if(req.body.arg2['phone'] != null) {
					phone = req.body.arg2['phone'];
					phone = string(phone).trim().s;
					phone = string(phone).stripTags().s;
					phone = string(phone).stripPunctuation().s;
					if(phone == '') {
						phone = 'NULL';
					}
					else {
						var phonePattern = new RegExp("^([0-9]{9,14})$");
						if(phonePattern.test(phone) == false) {
							errorPhone = true;
						}
						else {
							phone = "'" + phone + "'"; // database format
						}
					}
					
				}
				else {
					errorReq = true;
				}
				
				if(req.body.arg2['birthdate'] != null) {
					birthdate = req.body.arg2['birthdate'];
					birthdate = string(birthdate).trim().s;
					birthdate = string(birthdate).stripTags().s;
					birthdate = string(birthdate).replaceAll(" ", "");
					birthdate = string(birthdate).replaceAll("'", "");
					birthdate = string(birthdate).replaceAll('"', "");
					if(birthdate == '') {
						birthdate = 'NULL';
					}
					else {
						var birthdatePattern = new RegExp("^(19|20)[0-9]{2}\-((0[1-9])|(1[0-2]))\-((0[1-9])|([1-2][0-9])|(3[0-1]))$");
						if(birthdatePattern.test(birthdate) == false) {
							errorBirthdate = true;
						}
						else {
							var temp = birthdate;
							var year = temp.substring(0, temp.indexOf('-'));
							temp = temp.substring(temp.indexOf('-') + 1);
							var month = temp.substring(0, temp.indexOf('-'));
							month = parseInt(month) - 1; // month range 0-11
							temp = temp.substring(temp.indexOf('-') + 1);
							var day = temp;
							var date = new Date();
							date.setFullYear(year, month, day);
							var newYear = date.getFullYear();
							var newMonth = date.getMonth();
							var newDay = date.getDate();
							if((parseInt(year) == parseInt(newYear)) && (parseInt(month) == parseInt(newMonth)) && (parseInt(day) == parseInt(newDay))) {
								birthdate = "'" + birthdate + "'";
							}
							else {
								errorBirthdate = true;
								console.log(parseInt(month) + " " + parseInt(newMonth) + " " + parseInt(day) + " " + parseInt(newDay));
							}
						}
					}
				}
				
				if(req.body.arg2['destinations'] != null) {
					destination = req.body.arg2['destinations'];
					destination = string(destination).trim().s;
					destination = string(destination).stripTags().s;
					destination = string(destination).replaceAll(" ", "");
					destination = string(destination).replaceAll("'", "");
					destination = string(destination).replaceAll('"', "");
					destination = "'" + destination + "'";
				}
				else {
					errorDestination = true;
				}
				
				if(errorReq == false && errorEmail == false && errorPhone == false && errorBirthdate == false && errorDestination == false) {
					pool.getConnection(function(err, connection) {
						connection.beginTransaction(function(err) {
							if(err) {
								throw err;
								res.json({result: 'error'});
							}
							else {
								var sqlQuery1 = "INSERT INTO asset(IdAsset, NomeAssessment, UserId, Resource, " + 
								"ExtendedInfo, Timestamp, IdLocation, AssetType) " +
								"VALUES (NULL, '" + req.session.currentAssessment + "'," + 
								req.session.userid + ", '" + req.session.currentAssessment + ":person." + 
								timestamp.replace(" ", "_") + "', NULL, '" + timestamp + "', NULL, 'person');";
								connection.query(sqlQuery1, function(err, result, fields) {
									if(err) {
										console.log('query1: failure');
										connection.rollback(function() {
											throw err;
										});
										res.json({result: 'error'});
									}
									else {
										var lastInsertIdQuery = "SELECT LAST_INSERT_ID();";
										connection.query(lastInsertIdQuery, function(err, result, fields) {
											if(err) {
												console.log('query insert id: failure');
												connection.rollback(function() {
													throw err;
												});
												res.json({result: 'error'});
											}
											else {
												var idAsset = result[0]["LAST_INSERT_ID()"];
												if(name == 'NULL') {
													name = "'defaultPerson" + idAsset + "'";
												}
												var sqlQuery2 = "INSERT INTO person(IdPerson, IdAsset, Name, Email, PhoneNumber, Birthdate)" +
													"VALUES (NULL, LAST_INSERT_ID(), " +  name + "," + email + "," + phone + "," + birthdate + ");";
												connection.query(sqlQuery2, function(err, result, fields) {
													if(err) {
														console.log('query2: failure');
														connection.rollback(function() {
															throw err;
														});
														res.json({result: 'error'});
													}
													else {
														var sqlQuery3 = "SELECT IdOrganization " +
																	    "FROM organization " +
																	    "WHERE Name = " + destination + " " +
																	    "AND IdAsset IN (SELECT IdAsset " +
																	    			    "FROM asset " +
																	    			    "WHERE UserId = " + req.session.userid + " " +
																	    			    "AND NomeAssessment = '" + req.session.currentAssessment + "');";
														connection.query(sqlQuery3, function(err, result, fields) {
															if(err) {
																console.log('query3: failure');
																connection.rollback(function() {
																	throw err;
																});
																res.json({result: 'error'});
															}
															else if(result.length == 0) {
																console.log('query3: failure');
																connection.rollback(function() {
																	throw err;
																});
																res.json({result: 'error'});
															}
															else if(result.length > 0) {
																var idOrganization = result[0]['IdOrganization'];
																var sqlQuery4 = "INSERT INTO `part-of`(IdPerson, IdOrganization) " +
																	"VALUES (LAST_INSERT_ID(), " + idOrganization + ");";
																connection.query(sqlQuery4, function(err, result, fields) {
																	if(err) {
																		console.log('query4: failure');
																		connection.rollback(function() {
																			throw err;
																		});
																		res.json({result: 'error'});
																	}
																	else {
																		connection.commit(function(err) {
																			if(err) {
																				console.log('commit: failure');
																				connection.rollback(function() {
																					throw err;
																				});
																				res.json({result: 'error'});
																			}
																			else {
																				res.json({result: 'ok'});
																			}
																		});
																	}
																});
															}
														});
													}
												});
											}
										});
									}
								});
							}
						});
					});
				}
				else if(errorReq == true) {
					res.json({result: 'errorReq'});
				}
				else if(errorEmail == true) {
					res.json({result: 'errorEmail'});
				}
				else if(errorPhone == true) {
					res.json({result: 'errorPhone'});
				}
				else if(errorBirthdate == true) {
					res.json({result: 'errorBirthdate'});
				}
				else if(errorDestination == true) {
					res.json({result: 'errorDestination'});
				}
				break;
			case "network":
				var name, start_addr, end_addr, cidr, destination;
				var errorStartAddr = false, errorEndAddr = false, errorCidr = false, errorDestination = false;
				var errorReq = false;
				var range = false, subnet = false;
				
				if(req.body.arg2['network_name'] != null) {
					name = req.body.arg2['network_name'];
					name = string(name).trim().s;
					name = string(name).stripTags().s;
					name = string(name).stripPunctuation().s;
					if(name == '') {
						name = 'NULL';
					}
					else {
						name = "'" + name + "'"; // database format
					}					
				}
				else {
					 errorReq = true;
				}
				
				if(req.body.arg2['destinations'] != null) {
					destination = req.body.arg2['destinations'];
					destination = string(destination).trim().s;
					destination = string(destination).stripTags().s;
					destination = string(destination).replaceAll(" ", "");
					destination = string(destination).replaceAll("'", "");
					destination = string(destination).replaceAll('"', "");
					destination = "'" + destination + "'";
				}
				else {
					errorDestination = true;
				}
				
				if((req.body.arg2['start_address'] != null) && (req.body.arg2['end_address'] != null)) {
					range = true;
				}
				if(req.body.arg2['cidr'] != null) {
					subnet = true;
				}
				if(range ? !subnet : subnet) {
					if(range == true) { // ip range begin -> end
						// ipv4 validation...
						var checkIP = new RegExp("^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$");
						start_addr = req.body.arg2['start_address'];
						end_addr = req.body.arg2['end_address'];
						if(checkIP.test(start_addr) == true) {
							var ip = start_addr;
							var temp = ip; // 192.168.0.1
							var n1 = temp.substring(0, temp.indexOf('.')); // 192
							temp = temp.substring(temp.indexOf('.') + 1); // 168.0.1
							var n2 = temp.substring(0, temp.indexOf('.')); // 168
							temp = temp.substring(temp.indexOf('.') + 1); // 0.1
							var n3 = temp.substring(0, temp.indexOf('.')); // 0
							temp = temp.substring(temp.indexOf('.') + 1);
							var n4 = temp;
							if(parseInt(n1) > 255 || parseInt(n2) > 255 || parseInt(n3) > 255 || 
								parseInt(n4) > 255) {
								errorStartAddr = true;
							}
							else {
								start_addr = "'" + start_addr + "'";
							}
						}
						else {
							errorStartAddr = true;
						}
						if(checkIP.test(end_addr) == true) {
							var ip = end_addr;
							var temp = ip; // 192.168.0.1
							var n1 = temp.substring(0, temp.indexOf('.')); // 192
							temp = temp.substring(temp.indexOf('.') + 1); // 168.0.1
							var n2 = temp.substring(0, temp.indexOf('.')); // 168
							temp = temp.substring(temp.indexOf('.') + 1); // 0.1
							var n3 = temp.substring(0, temp.indexOf('.')); // 0
							temp = temp.substring(temp.indexOf('.') + 1);
							var n4 = temp;
							if(parseInt(n1) > 255 || parseInt(n2) > 255 || parseInt(n3) > 255 || 
								parseInt(n4) > 255) {
								errorEndAddr = true;
							}
							else {
								end_addr = "'" + end_addr + "'";
							}
						}
						else {
							errorEndAddr = true;
						}
						cidr = "NULL";
					}
					else { // subnet mask
						var checkIP = new RegExp("^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\/[0-9]{1,2}$");
						cidr = req.body.arg2['cidr'];
						if(checkIP.test(cidr) == true) {
							var ip = cidr;
							var temp = ip; // 192.168.0.0/24
							var n1 = temp.substring(0, temp.indexOf('.')); // 192
							temp = temp.substring(temp.indexOf('.') + 1); // 168.0.1/24
							var n2 = temp.substring(0, temp.indexOf('.')); // 168
							temp = temp.substring(temp.indexOf('.') + 1); // 0.1/24
							var n3 = temp.substring(0, temp.indexOf('.')); // 0
							temp = temp.substring(temp.indexOf('.') + 1); // 1/24
							var n4 = temp.substring(0, temp.indexOf('/')); // 1
							temp = temp.substring(temp.indexOf('/') + 1); // /24
							var subnet = temp;
							if(parseInt(n1) > 255 || parseInt(n2) > 255 || parseInt(n3) > 255 || 
								parseInt(n4) > 255 || (subnet > 30 && subnet < 16)) {
								errorCidr = true;
							}
							else {
								cidr = "'" + cidr + "'";
							}
						}
						else {
							errorCidr = true;
						}
						start_addr = "NULL";
						end_addr = "NULL";
					}
				}
				if(errorReq == false && errorStartAddr == false && errorEndAddr == false && errorCidr == false) {
					pool.getConnection(function(err, connection) {
						connection.beginTransaction(function(err) {
							if(err) {
								throw err;
								res.json({result: 'error'});
							}
							else {
								var sqlQuery1 = "INSERT INTO asset(IdAsset, NomeAssessment, UserId, Resource, " + 
								"ExtendedInfo, Timestamp, IdLocation, AssetType) " +
								"VALUES (NULL, '" + req.session.currentAssessment + "'," + 
								req.session.userid + ", '" + req.session.currentAssessment + ":network." + 
								timestamp.replace(" ", "_") + "', NULL, '" + timestamp + "', NULL, 'network');";
								connection.query(sqlQuery1, function(err, result, fields) {
									if(err) {
										console.log('query1: failure');
										connection.rollback(function() {
											throw err;
										});
										res.json({result: 'error'});
									}
									else {
										var lastInsertIdQuery = "SELECT LAST_INSERT_ID();";
										connection.query(lastInsertIdQuery, function(err, result, fields) {
											if(err) {
												console.log('query insert id: failure');
												connection.rollback(function() {
													throw err;
												});
												res.json({result: 'error'});
											}
											else {
												var idAsset = result[0]["LAST_INSERT_ID()"];
												if(name == 'NULL') {
													name = "'defaultNetwork" + idAsset + "'";
												}
												var sqlQuery2 = "INSERT INTO network(IdNetwork, IdAsset, NetworkName, IpNetStart, IpNetEnd, Cidr)" +
												"VALUES (NULL," + idAsset + "," +  name + "," + start_addr + "," + end_addr + "," + cidr + ");";
												connection.query(sqlQuery2, function(err, result, fields) {
													if(err) {
														console.log('query2: failure');
														connection.rollback(function() {
															throw err;
														});
														res.json({result: 'error'});
													}
													else {
														var sqlQuery3 = "SELECT IdOrganization " +
																	    "FROM organization " +
																	    "WHERE Name = " + destination + " " +
																	    "AND IdAsset IN (SELECT IdAsset " +
																	    			    "FROM asset " +
																	    			    "WHERE UserId = " + req.session.userid + " " +
																	    			    "AND NomeAssessment = '" + req.session.currentAssessment + "');";
														connection.query(sqlQuery3, function(err, result, fields) {
															if(err) {
																console.log('query3: failure');
																connection.rollback(function() {
																	throw err;
																});
																res.json({result: 'error'});
															}
															else if(result.length == 0) {
																console.log('query3: failure');
																connection.rollback(function() {
																	throw err;
																});
																res.json({result: 'error'});
															}
															else if(result.length > 0) {
																var idOrganization = result[0]['IdOrganization'];
																var sqlQuery4 = "INSERT INTO `organization-is-owner-of`(IdOrganization, IdAsset) " +
																	"VALUES (" + idOrganization + ", " + idAsset + ");";
																connection.query(sqlQuery4, function(err, result, fields) {
																	if(err) {
																		console.log('query4: failure');
																		connection.rollback(function() {
																			throw err;
																		});
																		res.json({result: 'error'});
																	}
																	else {
																		connection.commit(function(err) {
																			if(err) {
																				console.log('commit: failure');
																				connection.rollback(function() {
																					throw err;
																				});
																				res.json({result: 'error'});
																			}
																			else {
																				res.json({result: 'ok'});
																			}
																		});
																	}
																});
															}
														});
													}
												});
											}
										});					
									}
								});
							}
						});
					});
				}
				if(errorReq == true) {
					res.json({result: 'errorReq'});
				}
				else if(errorStartAddr == true) {
					res.json({result: 'errorStartAddr'});
				}
				else if(errorEndAddr == true) {
					res.json({result: 'errorEndAddr'});
				}
				else if(errorCidr == true) {
					res.json({result: 'errorCidr'});
				}
				break;
			case "computing device":
				var errorDestination = false;
				// ipv4 validation...
				var checkIP = new RegExp("^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$");
				var checkMAC = new RegExp("^([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})|([0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2}-[0-9a-fA-F]{2})$");
				var checkCorrectness = true;
				if(typeof req.body.manual !== "undefined") {
					if(req.body.manual == 'false') {
						var hosts = req.body.arg2;
						if(typeof hosts !== "undefined") {
							hosts = hosts.hosts;
							for(var i = 0; i < hosts.length; i++) {
								// remember to check name of computing device
								var ip = hosts[i].addr_ipv4;
								var name = hosts[i].name;

								if(typeof name !== 'undefined') {
									name = string(name).trim().s;
									name = string(name).stripTags().s;
									name = string(name).replaceAll("'", "");
									name = string(name).replaceAll('"', "");
									if(name == '') {
										hosts[i].name = 'NULL';
									}
									else {
										hosts[i].name = "'" + name + "'"; // database format
									}
								}
								else {
									checkCorrectness = false;
								}

								if(typeof ip !== 'undefined') {
									if(checkIP.test(ip) == true) {
										var temp = ip; // 192.168.0.1
										var n1 = temp.substring(0, temp.indexOf('.')); // 192
										temp = temp.substring(temp.indexOf('.') + 1); // 168.0.1
										var n2 = temp.substring(0, temp.indexOf('.')); // 168
										temp = temp.substring(temp.indexOf('.') + 1); // 0.1
										var n3 = temp.substring(0, temp.indexOf('.')); // 0
										temp = temp.substring(temp.indexOf('.') + 1);
										var n4 = temp;
										if(parseInt(n1) > 255 || parseInt(n2) > 255 || 
											parseInt(n3) > 255 || parseInt(n4) > 255) {
											checkCorrectness = false;
										}
									}
									else {
										checkCorrectness = false;
									}
								}
								else {
									checkCorrectness = false;
								}
							}
						}
						else {
							checkCorrectness = false;
						}
						
						if(typeof req.body.arg3 !== "undefined") {
							destination = req.body.arg3;
							destination = string(destination).trim().s;
							destination = string(destination).stripTags().s;
							destination = string(destination).replaceAll("'", "");
							destination = string(destination).replaceAll('"', "");
							destination = "'" + destination + "'";
						}
						else {
							errorDestination = true;
						}
						
						// recording in database
						if(checkCorrectness == true && errorDestination == false) {
							pool.getConnection(function(err, connection) {
								connection.beginTransaction(function(err) {
									var userid = req.session.userid;
									var assessment = req.session.currentAssessment;
									async.eachSeries(hosts, function(host, callback) {
										var ipAddress = host.addr_ipv4;
										var name = host.name;
										var sqlQuery1 = "INSERT INTO asset(IdAsset, NomeAssessment, UserId, Resource, ExtendedInfo, Timestamp, IdLocation, AssetType)" + 
											" VALUES(NULL, '" + assessment + "', " + userid + ", '" + assessment + ":" + "computing-device." + timestamp.replace(" ", "_") + "', NULL, '" + 
											timestamp + "', NULL, 'computing-device');";
										console.log("query1: " + sqlQuery1);
										connection.query(sqlQuery1, function(err, result, fields) {
											if(err) {
												console.log('query1: failure');
												connection.rollback(function() {
													throw err;
												});
												res.json({result: 'error'});
											}
											else {
												var lastInsertIdQuery = "SELECT LAST_INSERT_ID();";
												connection.query(lastInsertIdQuery, function(err, result, fields) {
													if(err) {
														console.log('query insert id: failure');
														connection.rollback(function() {
															throw err;
														});
														res.json({result: 'error'});
													}
													else {
														var idAsset = result[0]["LAST_INSERT_ID()"];
														if(name === 'NULL') {
															name = "'defaultComputingDevice" + idAsset + "'";
														}
														var sqlQuery2 = "INSERT INTO `computing-device`(IdComputingDevice, IdAsset, DistinguishedName, Fdqn, Hostname, MotherboardGuid) " + 
															"VALUES(NULL, " + idAsset + ", NULL, NULL, " + name + ", NULL);";
														console.log("query2: " + sqlQuery2);
														connection.query(sqlQuery2, function(err, result, fields) {
															if(err) {
																console.log('query2: failure');
																connection.rollback(function() {
																	throw err;
																});
																res.json({result: 'error'});
															}
															else {
																connection.query(lastInsertIdQuery, function(err, result, fields) {
																	if(err) {
																		console.log('query insert id: failure');
																		connection.rollback(function() {
																			throw err;
																		});
																		res.json({result: 'error'});
																	}
																	else {
																		var idComputingDevice = result[0]["LAST_INSERT_ID()"];
																		var sqlQuery3 = "INSERT INTO connection(IdConnection, IdComputingDevice, IpAddress, MacAddress, Url) " + 
																			"VALUES(NULL, '" + idComputingDevice + "', '" + ipAddress + "', NULL, NULL);";
																		console.log("query3: " + sqlQuery3);
																		connection.query(sqlQuery3, function(err, result, fields) {
																			if(err) {
																				console.log('query3: failure');
																				connection.rollback(function() {
																					throw err;
																				});
																				res.json({result: 'error'});
																			}
																			else {
																				var sqlQuery4 = "SELECT IdSystem " + 
																								"FROM system " + 
																								"WHERE SystemName = " + destination + " " +
																								"AND IdAsset IN (SELECT IdAsset " + 
																											   "FROM asset " + 
																											   "WHERE NomeAssessment = '" + assessment + "' " +
																											   "AND UserId = " + userid + ");";
																				console.log("query4: " + sqlQuery4);
																				connection.query(sqlQuery4, function(err, result, fields) {
																					if(err) {
																						console.log('query4: failure');
																						connection.rollback(function() {
																							throw err;
																						});
																						res.json({result: 'error'});
																					}
																					else {
																						if(result.length == 0) {
																							console.log('query4: failure');
																							connection.rollback(function() {
																								throw err;
																							});
																							res.json({result: 'error'});
																						}
																						else if(result.length > 0) {
																							var idSystem = result[0]['IdSystem'];
																							console.log(idSystem);
																							var sqlQuery5 = "INSERT INTO `computing-device-connected-to`(IdComputingDevice, IdSystem) " +
																								"VALUES(" + idComputingDevice + ", "+ idSystem + ");";
																							console.log("query5: " + sqlQuery5);
																							connection.query(sqlQuery5, function(err, result, fields) {
																								if(err) {
																									console.log('query5: failure');
																									connection.rollback(function() {
																										throw err;
																									});
																									res.json({result: 'error'});
																								}
																								else {
																									connection.commit(function(err) {
																										if(err) {
																											console.log('commit: failure');
																											connection.rollback(function() {
																												throw err;
																											});
																											res.json({result: 'error'});
																										}
																										else {
																											callback();																							
																										}
																									});
																								}
																							});
																						}
																					}
																				});
																			}
																		});
																	}
																});
															}
														});
													}
												});
											}
										});
									}, function(err) {
										if(err) {
											res.json({result: 'errorAsync'});
										}
										else {
											res.json({result: 'ok'});
										}
									});
								});
							});
						}
						else if(checkCorrectness == false){
							// questo e' un busillis
							res.json({result: "error"});
						}
						else if(errorDestination == true) {
							res.json({result: "errorDestination"});
						}
					}
					else if(req.body.manual == 'true'){
						var hostname, distinguishedName, ipAddress, macAddress, motherboardGuid, destination;
						var errorDestination = false, errorIp = false, errorMac = false;
						var errorReq = false;
						
						if(typeof req.body.arg2['hostname'] !== 'undefined') {
							hostname = req.body.arg2['hostname'];
							hostname = string(hostname).trim().s;
							hostname = string(hostname).stripTags().s;
							hostname = string(hostname).replaceAll("'", "");
							hostname = string(hostname).replaceAll('"', "");
							if(hostname == '') {
								hostname = 'NULL';
							}
							else {
								hostname = "'" + hostname + "'"; // database format
							}
						}
						else {
							errorReq = true;
						}
						
						if(typeof req.body.arg2['distinguished_name'] !== 'undefined') {
							distinguishedName = req.body.arg2['distinguished_name'];
							distinguishedName = string(distinguishedName).trim().s;
							distinguishedName = string(distinguishedName).stripTags().s;
							distinguishedName = string(distinguishedName).replaceAll("'", "");
							distinguishedName = string(distinguishedName).replaceAll('"', "");
							if(distinguishedName == '') {
								distinguishedName = 'NULL';
							}
							else {
								distinguishedName = "'" + distinguishedName + "'"; // database format
							}
						}
						else {
							errorReq = true;
						}
						
						if(typeof req.body.arg2['ip_address'] !== 'undefined') {
							ipAddress = req.body.arg2['ip_address'];
							if(checkIP.test(ipAddress) == true) {
								var temp = ipAddress; // 192.168.0.1
								var n1 = temp.substring(0, temp.indexOf('.')); // 192
								temp = temp.substring(temp.indexOf('.') + 1); // 168.0.1
								var n2 = temp.substring(0, temp.indexOf('.')); // 168
								temp = temp.substring(temp.indexOf('.') + 1); // 0.1
								var n3 = temp.substring(0, temp.indexOf('.')); // 0
								temp = temp.substring(temp.indexOf('.') + 1);
								var n4 = temp;
								if(parseInt(n1) > 255 || parseInt(n2) > 255 || 
									parseInt(n3) > 255 || parseInt(n4) > 255) {
									errorIp = true;
								}
							}
							else {
								checkCorrectness = false;
							}
						}
						else {
							errorReq = true;
						}
						
						if(typeof req.body.arg2['mac_address'] !== 'undefined') {
							macAddress = req.body.arg2['mac_address'];
							macAddress = string(macAddress).trim().s;
							if(macAddress == '') {
								macAddress = 'NULL';
							}
							else { 
								if(checkMAC.test(macAddress) == false) {
									checkCorrectness = false;
								}
								else {
									macAddress = "'" + macAddress + "'";
								}
							}
						}
						else {
							errorReq = true;
						}
						
						if(typeof req.body.arg2['motherboard_guid'] !== 'undefined') {
							motherboardGuid = req.body.arg2['motherboard_guid'];
							motherboardGuid = string(motherboardGuid).trim().s;
							motherboardGuid = string(motherboardGuid).stripTags().s;
							motherboardGuid = string(motherboardGuid).replaceAll("'", "");
							motherboardGuid = string(motherboardGuid).replaceAll('"', "");
							if(motherboardGuid == '') {
								motherboardGuid = 'NULL';
							}
							else {
								motherboardGuid = "'" + motherboardGuid + "'"; // database format
							}
						}
						else {
							errorReq = true;
						}
						
						if(typeof req.body.arg3 !== 'undefined') {
							destination = req.body.arg3;
							destination = string(destination).trim().s;
							destination = string(destination).stripTags().s;
							destination = string(destination).replaceAll("'", "");
							destination = string(destination).replaceAll('"', "");
							destination = "'" + destination + "'";
						}
						else {
							errorReq = true;
						}
						
						if(checkCorrectness == true && errorDestination == false && errorIp == false &&
							errorMac == false && errorReq == false) {
							/*	 
							console.log('destination: ' + destination);
							console.log('hostname: ' + hostname);
							console.log('distinguished: ' + distinguishedName);
							console.log('ip: ' + ipAddress);
							console.log('mac: ' + macAddress);
							console.log('motherboard: ' + motherboardGuid);
							*/
							var sqlQuery = "SELECT * " +
										   "FROM network " + 
										   "WHERE IdNetwork IN (SELECT IdNetwork " +
										   					   "FROM `connected-to-network` " +
										   					   "WHERE IdSystem IN (SELECT IdSystem " + 
										   					   					  "FROM system " + 
										   					   					  "WHERE SystemName = " + destination + "));";							
							pool.getConnection(function(err, connection) {
								connection.beginTransaction(function(err) {
									connection.query(sqlQuery, function(err, result, fields) {
										var ipBufferStart, ipBufferEnd;
										if(result[0].Cidr == null) {
											var ipStart = result[0].IpNetStart;
											var ipEnd = result[0].IpNetEnd;
											ipBufferStart = ipModule.toBuffer(ipStart);
											ipBufferEnd = ipModule.toBuffer(ipEnd);
										}
										else {
											var ipCidr = result[0].Cidr;
											var ipAddr = ipCidr.substring(0, ipCidr.lastIndexOf('/'));
											var prefix = ipCidr.substring(ipCidr.lastIndexOf('/') + 1);
											var subnet = ipModule.fromPrefixLen(prefix);
											var ipStart = ipModule.subnet(ipAddr, subnet).firstAddress;
											var ipEnd = ipModule.subnet(ipAddr, subnet).lastAddress;
											ipBufferStart = ipModule.toBuffer(ipStart);
											ipBufferEnd = ipModule.toBuffer(ipEnd);
										}
										ipBufferTemp = ipModule.toBuffer(ipAddress);
										var ipCorrectFlag = true;
										for(var i = 0; i < 4 || ipCorrectFlag == false; i++) {
											var diff1 = ipBufferTemp[i] - ipBufferStart[i];
											var diff2 = ipBufferEnd[i] - ipBufferTemp[i];
											if(diff1 < 0 || diff2 < 0) { // ip doesn't match with this network
												ipCorrectFlag = false;
											}
										}
										if(ipCorrectFlag == true) { // insert into db
											var assessment = req.session.currentAssessment;
											var userid = req.session.userid;
											var sqlQuery1 = "INSERT INTO asset(IdAsset, NomeAssessment, UserId, Resource, " + 
											"ExtendedInfo, Timestamp, IdLocation, AssetType) " +
											"VALUES (NULL, '" + assessment + "'," + 
											userid + ", '" + assessment + ":computing-device." + 
											timestamp.replace(" ", "_") + "', NULL, '" + timestamp + "', NULL, 'computing-device');";
											connection.query(sqlQuery1, function(err, result, fields) {
												if(err) {
													console.log('query1: failure');
													connection.rollback(function() {
														throw err;
													});
													res.json({result: 'error'});
												}
												else {
													var lastInsertIdQuery = "SELECT LAST_INSERT_ID();";
													connection.query(lastInsertIdQuery, function(err, result, fields) {
														if(err) {
															console.log('query insert id: failure');
															connection.rollback(function() {
																throw err;
															});
															res.json({result: 'error'});
														}
														else {
															var idAsset = result[0]["LAST_INSERT_ID()"];
															if(hostname === 'NULL') {
																hostname = "'defaultComputingDevice" + idAsset + "'";
															}
															var sqlQuery2 = "INSERT INTO `computing-device`(IdComputingDevice, IdAsset, DistinguishedName, Fdqn, Hostname, MotherboardGuid) " + 
															"VALUES(NULL, LAST_INSERT_ID(), " + distinguishedName + ", NULL, " + hostname + ", " + motherboardGuid + ");";
															console.log("query2: " + sqlQuery2);
															connection.query(sqlQuery2, function(err, result, fields) {
																if(err) {
																	console.log('query2: failure');
																	connection.rollback(function() {
																		throw err;
																	});
																	res.json({result: 'error'});
																}
																else {
																	var lastInsertIdQuery = "SELECT LAST_INSERT_ID();";
																	connection.query(lastInsertIdQuery, function(err, result, fields) {
																		if(err) {
																			console.log('query insert id: failure');
																			connection.rollback(function() {
																				throw err;
																			});
																			res.json({result: 'error'});
																		}
																		else {
																			var idComputingDevice = result[0]["LAST_INSERT_ID()"];
																			var sqlQuery3 = "INSERT INTO connection(IdConnection, IdComputingDevice, IpAddress, MacAddress, Url) " + 
																				"VALUES(NULL, '" + idComputingDevice + "', '" + ipAddress + "', " + macAddress + ", NULL);";
																			console.log("query3: " + sqlQuery3);
																			connection.query(sqlQuery3, function(err, result, fields) {
																				if(err) {
																					console.log('query3: failure');
																					connection.rollback(function() {
																						throw err;
																					});
																					res.json({result: 'error'});
																				}
																				else {
																					var sqlQuery4 = "SELECT IdSystem " + 
																									"FROM system " + 
																									"WHERE SystemName = " + destination + " " +
																									"AND IdAsset IN (SELECT IdAsset " + 
																												   "FROM asset " + 
																												   "WHERE NomeAssessment = '" + assessment + "' " +
																												   "AND UserId = " + userid + ");";
																					console.log("query4: " + sqlQuery4);
																					connection.query(sqlQuery4, function(err, result, fields) {
																						if(err) {
																							console.log('query4: failure');
																							connection.rollback(function() {
																								throw err;
																							});
																							res.json({result: 'error'});
																						}
																						else {
																							if(result.length == 0) {
																								console.log('query4: failure');
																								connection.rollback(function() {
																									throw err;
																								});
																								res.json({result: 'error'});
																							}
																							else if(result.length > 0) {
																								var idSystem = result[0]['IdSystem'];
																								console.log(idSystem);
																								var sqlQuery5 = "INSERT INTO `computing-device-connected-to`(IdComputingDevice, IdSystem) " +
																									"VALUES(" + idComputingDevice + ", "+ idSystem + ");";
																								console.log("query5: " + sqlQuery5);
																								connection.query(sqlQuery5, function(err, result, fields) {
																									if(err) {
																										console.log('query5: failure');
																										connection.rollback(function() {
																											throw err;
																										});
																										res.json({result: 'error'});
																									}
																									else {
																										connection.commit(function(err) {
																											if(err) {
																												console.log('commit: failure');
																												connection.rollback(function() {
																													throw err;
																												});
																												res.json({result: 'error'});
																											}
																											else {
																												res.json({result: 'ok'});																						
																											}
																										});
																									}
																								});
																							}
																						}
																					});
																				}
																			});
																		}
																	});
																}
															});
														}
													});
												}
											});
										}
										else {
											res.json({result: 'errorIp'});
										}
									});
								});
							});
						}
						else if(errorDestination == true) {
							res.json({result: 'errorDestination'});
						}
						else if(errorIp == true) {
							res.json({result: 'errorIp'});
						}
						else if(errorMac == true) {
							res.json({result: 'errorMac'});
						}
						else if(errorReq == true) {
							res.json({result: 'errorReq'});
						}
						else if(checkCorrectness == false){
							res.json({result: "error"});
						}
					}
				}	
				break;
			case "system":
				var systemName, version, destination;
				var errorDestination = false, errorVersion = false;
				var errorReq = false;
				
				if(req.body.arg2['system_name'] != null) {
					systemName = req.body.arg2['system_name'];
					systemName = string(systemName).trim().s;
					systemName = string(systemName).stripTags().s;
					systemName = string(systemName).stripPunctuation().s;
					if(systemName == '') {
						systemName = 'NULL';
					}
					else {
						systemName = "'" + systemName + "'"; // database format
					}					
				}
				else {
					 errorReq = true;
				}
				
				if(req.body.arg2['version'] != null) {
					version = req.body.arg2['version'];
					systemName = string(systemName).trim().s;
					if(version == '') {
						version = 'NULL';
					}
					else {
						var checkVersion = new RegExp("^[a-zA-Z0-9\-_\.\/\\ ]{1,32}$");
						if(checkVersion.test(version) == false) {
							errorVersion = true;
						}
						else {
							version = "'" + version + "'";
						}
					}
				}
				else {
					errorReq = true;
				}
				
				if(req.body.arg2['destinations'] != null) {
					destination = req.body.arg2['destinations'];
					destination = string(destination).trim().s;
					destination = string(destination).stripTags().s;
					destination = string(destination).replaceAll("'", "");
					destination = string(destination).replaceAll('"', "");
					destination = "'" + destination + "'";
				}
				else {
					errorDestination = true;
				}
				
				if(errorReq == false && errorVersion == false && errorDestination == false) {
					pool.getConnection(function(err, connection) {
						connection.beginTransaction(function(err) {
							if(err) {
								throw err;
								res.json({result: 'error'});
							}
							else {
								var sqlQuery1 = "INSERT INTO asset(IdAsset, NomeAssessment, UserId, Resource, " + 
								"ExtendedInfo, Timestamp, IdLocation, AssetType) " +
								"VALUES (NULL, '" + req.session.currentAssessment + "'," + 
								req.session.userid + ", '" + req.session.currentAssessment + ":system." + 
								timestamp.replace(" ", "_") + "', NULL, '" + timestamp + "', NULL, 'system');";
								connection.query(sqlQuery1, function(err, result, fields) {
									if(err) {
										console.log('query1: failure');
										connection.rollback(function() {
											throw err;
										});
										res.json({result: 'error'});
									}
									else {
										var lastInsertIdQuery = "SELECT LAST_INSERT_ID();";
										connection.query(lastInsertIdQuery, function(err, result, fields) {
											if(err) {
												console.log('query insert id: failure');
												connection.rollback(function() {
													throw err;
												});
												res.json({result: 'error'});
											}
											else {
												var idAsset = result[0]["LAST_INSERT_ID()"];
												if(systemName == 'NULL') {
													systemName = "'defaultSystem" + idAsset + "'";
												}
												var sqlQuery2 = "INSERT INTO system(IdSystem, IdAsset, SystemName, Version)" +
													"VALUES (NULL, LAST_INSERT_ID(), " +  systemName + "," + version + ");";
												connection.query(sqlQuery2, function(err, result, fields) {
													if(err) {
														console.log('query2: failure');
														connection.rollback(function() {
															throw err;
														});
														res.json({result: 'error'});
													}
													else {
														var sqlQuery3 = "SELECT IdNetwork " +
																	    "FROM network " +
																	    "WHERE NetworkName = " + destination + " " +
																	    "AND IdAsset IN (SELECT IdAsset " +
																	    			    "FROM asset " +
																	    			    "WHERE UserId = " + req.session.userid + " " +
																	    			    "AND NomeAssessment = '" + req.session.currentAssessment + "');";
														connection.query(sqlQuery3, function(err, result, fields) {
															if(err) {
																console.log('query3: failure');
																connection.rollback(function() {
																	throw err;
																});
																res.json({result: 'error'});
															}
															else if(result.length == 0) {
																console.log('query3: failure');
																connection.rollback(function() {
																	throw err;
																});
																res.json({result: 'error'});
															}
															else if(result.length > 0) {
																var idNetwork = result[0]['IdNetwork'];
																var sqlQuery4 = "INSERT INTO `connected-to-network`(IdSystem, IdNetwork) " +
																	"VALUES (LAST_INSERT_ID(), " + idNetwork + ");";
																connection.query(sqlQuery4, function(err, result, fields) {
																	if(err) {
																		console.log('query4: failure');
																		connection.rollback(function() {
																			throw err;
																		});
																		res.json({result: 'error'});
																	}
																	else {
																		connection.commit(function(err) {
																			if(err) {
																				console.log('commit: failure');
																				connection.rollback(function() {
																					throw err;
																				});
																				res.json({result: 'error'});
																			}
																			else {
																				res.json({result: 'ok'});
																			}
																		});
																	}
																});
															}
														});
													}
												});
											}
										});
									}
								});
							}
						});
					});
				}
				if(errorReq == true) {
					res.json({result: 'errorReq'});
				}
				else if(errorVersion == true) {
					res.json({result: 'errorVersion'});
				}
				else if(errorDestination == true) {
					res.json({result: 'errorDestination'});
				}
				break;
			case "circuit":
				var circuitName, destination;
				var errorDestination = false;
				var errorReq = false;
				
				// console.log(req.body.arg2);

				if(typeof req.body.arg2['circuit_name'] !== 'undefined') {
					circuitName = req.body.arg2['circuit_name'];
					circuitName = string(circuitName).trim().s;
					circuitName = string(circuitName).stripTags().s;
					circuitName = string(circuitName).replaceAll("'", "");
					circuitName = string(circuitName).replaceAll('"', "");
					circuitName = "'" + circuitName + "'";
					if(circuitName == '') {
						circuitName = 'NULL';
					}
				}
				else {
					errorReq = true;
				}
				
				if(typeof req.body.arg2['destinations'] !== 'undefined') {
					destination = req.body.arg2['destinations'];
					destination = string(destination).trim().s;
					destination = string(destination).stripTags().s;
					destination = string(destination).replaceAll("'", "");
					destination = string(destination).replaceAll('"', "");
					destination = "'" + destination + "'";
				}
				else {
					errorDestination = true;
				}
				
				// console.log(circuitName + " " + req.body.arg2['destinations']);
				
				if(errorReq == false && errorDestination == false) {
					pool.getConnection(function(err, connection) {
						connection.beginTransaction(function(err) {
							if(err) {
								throw err;
								res.json({result: 'error'});
							}
							else {
								var sqlQuery1 = "INSERT INTO asset(IdAsset, NomeAssessment, UserId, Resource, " + 
								"ExtendedInfo, Timestamp, IdLocation, AssetType) " +
								"VALUES (NULL, '" + req.session.currentAssessment + "'," + 
								req.session.userid + ", '" + req.session.currentAssessment + ":circuit." + 
								timestamp.replace(" ", "_") + "', NULL, '" + timestamp + "', NULL, 'circuit');";
								connection.query(sqlQuery1, function(err, result, fields) {
									if(err) {
										console.log('query1: failure');
										connection.rollback(function() {
											throw err;
										});
										res.json({result: 'error'});
									}
									else {
										var lastInsertIdQuery = "SELECT LAST_INSERT_ID();";
										connection.query(lastInsertIdQuery, function(err, result, fields) {
											if(err) {
												console.log('lastInsertIdQuery: failure');
												connection.rollback(function() {
													throw err;
												});
												res.json({result: 'error'});
											}
											else {
												var assetId = result[0]['LAST_INSERT_ID()'];
												if(circuitName === 'NULL') {
													circuitName = "'defaultCircuit" + assetId + "'";
												}
												var sqlQuery2 = "INSERT INTO circuit(IdCircuit, IdAsset, CircuitName) " +
													"VALUES (NULL, LAST_INSERT_ID(), " + circuitName + ");";
												connection.query(sqlQuery2, function(err, result, fields) {
													if(err) {
														console.log('query2: failure');
														connection.rollback(function() {
															throw err;
														});
														res.json({result: 'error'});
													}
													else {
														var sqlQuery3 = "SELECT IdComputingDevice " +
													    "FROM `computing-device` " +
													    "WHERE Hostname = " + destination + " " +
													    "AND IdAsset IN (SELECT IdAsset " +
													    			    "FROM asset " +
													    			    "WHERE UserId = " + req.session.userid + " " +
													    			    "AND NomeAssessment = '" + req.session.currentAssessment + "');";
													    connection.query(sqlQuery3, function(err, result, fields) {
													    	if(err) {
																console.log('query3: failure');
																connection.rollback(function() {
																	throw err;
																});
																res.json({result: 'error'});
															}
															else {
																var idComputingDevice = result[0]['IdComputingDevice'];
																var sqlQuery4 = "INSERT INTO `has-termination-device`(IdCircuit, IdComputingDevice) " +
																	"VALUES (LAST_INSERT_ID(), " + idComputingDevice + ");";
																connection.query(sqlQuery4, function(err, result, fields) {
																	if(err) {
																		console.log('query2: failure');
																		connection.rollback(function() {
																			throw err;
																		});
																		res.json({result: 'error'});
																	}
																	else {
																		connection.commit(function(err) {
																			if(err) {
																				console.log('commit: failure');
																				connection.rollback(function() {
																					throw err;
																				});
																				res.json({result: 'error'});
																			}
																			else {
																				res.json({result: 'ok'});
																			}
																		});
																	}
																});
															}
													    });
													}
												});
											}
										});
									}
								});
							}
						});
					});
				}
				break;
			case "software":
				var installation_id, cpe, license, destination;
				var errorReq = false, errorDestination;
				var flag = req.body.arg3; // true = os, false = application
				
				installation_id = req.body.arg2["installation_id"];
				// insert robustness controls
				installation_id = "'" + installation_id + "'";
				
				cpe = req.body.arg2["cpe"];
				// insert robustness controls
				if(flag === 'true') {
					if(cpe.search('cpe:/o:') !== 0) {
						errorReq = true;
					}
				}
				else if(flag === 'false') {
					if(cpe.search('cpe:/a:') !== 0) {
						errorReq = true;
					}
				}
				cpe = "'" + cpe + "'";
				
				license = req.body.arg2["license"];
				// insert robustness controls
				license = "'" + license + "'";
				
				if(typeof req.body.arg2['destinations'] !== 'undefined') {
					destination = req.body.arg2['destinations'];
					destination = string(destination).trim().s;
					destination = string(destination).stripTags().s;
					destination = string(destination).replaceAll("'", "");
					destination = string(destination).replaceAll('"', "");
					destination = "'" + destination + "'";
				}
				else {
					errorDestination = true;
				}

				if(errorReq === false && errorDestination === false) {
					pool.getConnection(function(err, connection) {
						connection.beginTransaction(function(err) {
							if(err) {
								throw err;
								res.json({result: 'error'});
							}
							else {
								/*var sqlQuery1 = "INSERT INTO asset(IdAsset, NomeAssessment, UserId, Resource, " + 
									"ExtendedInfo, Timestamp, IdLocation, AssetType) " +
									"VALUES (NULL, '" + req.session.currentAssessment + "'," + 
									req.session.userid + ", '" + req.session.currentAssessment + ":software." + 
									timestamp.replace(" ", "_") + "', NULL, '" + timestamp + "', NULL, 'software');";
								connection.query(sqlQuery1, function(err, result, fields) {
									if(err) {
										console.log('query1: failure');
										connection.rollback(function() {
											throw err;
										});
										res.json({result: 'error'});
									}
									else {
										// to continue
									}
								});*/
							}
						});
					});
				}
				else {
					res.json({result: 'error'});
				}
				break;
			case "service":
				break;
			case "website":
				break;
			case "database":
				break;
			default:
				res.json({result: 'error'});
		}
	}
	else if(req.body.request === 'osDiscovery') {
		var device = req.body.arg;
		var userid = req.session.userid;
		var assessment = req.session.currentAssessment;
		var sqlQuery = "SELECT IpAddress " + 
					   "FROM connection " + 
					   "WHERE IdComputingDevice IN (SELECT IdComputingDevice " +
					   							   "FROM `computing-device` " +
					   							   "WHERE Hostname = '" + device + "' " +
					   							   "AND IdAsset IN (SELECT IdAsset " +
					   							   				   "FROM asset " +
					   							   				   "WHERE NomeAssessment = '" + assessment + "' " +
					   							   				   "AND UserId = " + userid + "));";
		pool.getConnection(function(err, connection) {
			connection.query(sqlQuery, function(err, result, fields) {
				if(err) {
					connection.release();
					res.json({result: "error"});
				}
				else {
					// console.log(result[0].IpAddress);
					var ip = result[0].IpAddress;
					connection.release();
					var timeAppend = (new Date()).getTime();
					var cmd = "nmap -O " + ip + " -oX " + 
						req.session.folder + "/temp" + timeAppend + "os.xml";
					var child = exec(cmd, function(error, stdout, stderr) {
						var cpeJSON = '{"cpe":[';
						var parser = new xml2js.Parser();
						var data = fs.readFileSync(req.session.folder + '/temp' + timeAppend + 'os.xml');
						parser.parseString(data, function(err, result) { // sync call default: online documentation
							if(typeof result.nmaprun.host !== 'undefined') {
							// console.log(result.nmaprun.host[0]);
								if(typeof result.nmaprun.host[0].os[0].osmatch !== 'undefined') {
									// console.log(result.nmaprun.host[0].os[0].osmatch[0]);
									for(var i = 0; i < result.nmaprun.host[0].os[0].osmatch.length; i++) {
										// console.log(result.nmaprun.host[0].os[0].osmatch[0].osclass[0].cpe[0]);
										var name = result.nmaprun.host[0].os[0].osmatch[0].$.name;
										// console.log('name: ' + result.nmaprun.host[0].os[0].osmatch[0].$.name);
										var accuracy = result.nmaprun.host[0].os[0].osmatch[0].$.accuracy;
										// console.log('accuracy: ' + result.nmaprun.host[0].os[0].osmatch[0].$.accuracy);
										for(var j = 0; j < result.nmaprun.host[0].os[0].osmatch[i].osclass.length; j++) {
											for(var k = 0; k < result.nmaprun.host[0].os[0].osmatch[i].osclass[j].cpe.length; k++) {
												var cpe = result.nmaprun.host[0].os[0].osmatch[i].osclass[j].cpe[k];
												// console.log(cpe);
												cpeJSON += '{"name": "' + name + '", "accuracy": "' + accuracy + '", "cpe": "' + cpe + '"},';
											}
										}
									}
								}
								else {
									console.log('It was not possible to detect operating system');
								}
							}
							else {
								console.log('Selected host is unreachable');
							}
							// deleting temp file
							fs.unlinkSync(req.session.folder + '/temp' + timeAppend + 'os.xml');
							// console.log('successfully deleted' + req.session.folder + '/temp' + timeAppend + 'os.xml');
							if(cpeJSON.lastIndexOf(',') !== -1) {
								cpeJSON = cpeJSON.substring(0, cpeJSON.lastIndexOf(','));
							}
							cpeJSON += ']}';
							var jsonRes;
							try {
								jsonRes = JSON.parse(cpeJSON);
							}
							catch (e) {
								res.json({error: 'parsing error'});
								console.error("Parsing error: ", e);
							}
							res.json(jsonRes);
						});
					});
				}
			});
		});
	}
	else if(req.body.request === 'softwareDictionary') {
		var type = req.body.arg1;
		var nRow = parseInt(req.body.arg2);
		var initRow = parseInt(req.body.arg3);
		var cpe = req.body.arg4;
		var dataJSON = '{"values":[';
		
		var path = __dirname + '/definitions/cpe/';
		var data = fs.readFileSync(path + 'official-cpe-dictionary_v2.3.xml');
		
		var parser = new xml2js.Parser();

		if(type === 'os') {
			parser.parseString(data, function(err, result) {
				var json = result;
				var item = json["cpe-list"]["cpe-item"];
				for(var i = initRow, n = 0; i < item.length && n < nRow; i++) {
					var strItem = item[i].$.name;
					if(cpe !== '') {
						if(strItem.search(cpe) !== -1 && strItem.search('cpe:/o') !== -1) {
							// console.log(item[i].$.name + " " + item[i].title[0]._);
							dataJSON += '{"cpe_value": "' + item[i].$.name + 
								'", "description": "' + item[i].title[0]._ + '"},';
							n++;
						}
					}
					else if(cpe === '') {
						if(strItem.search('cpe:/o') !== -1) {
							// console.log(item[i].$.name + " " + item[i].title[0]._);
							dataJSON += '{"cpe_value": "' + item[i].$.name + 
								'", "description": "' + item[i].title[0]._ + '"},';
							n++;
						}
					}
				}
			});
		}
		else if(type === 'sw') {
			parser.parseString(data, function(err, result) {
				var json = result;
				var item = json["cpe-list"]["cpe-item"];
				for(var i = initRow, n = 0; i < item.length && n < nRow; i++) {
					var strItem = item[i].$.name;
					if(cpe !== '') {
						if(strItem.search(cpe) !== -1 && strItem.search('cpe:/a') !== -1) {
							// console.log(item[i].$.name);
							dataJSON += '{"cpe_value": "' + item[i].$.name + 
								'", "description": "' + item[i].title[0]._ + '"},';
							n++;
						}
					}
					else if(cpe === '') {
						if(strItem.search('cpe:/a') !== -1) {
							// console.log(item[i].$.name);
							dataJSON += '{"cpe_value": "' + item[i].$.name + 
								'", "description": "' + item[i].title[0]._ + '"},';
							n++;
						}
					}
				}
			});
		}
		if(dataJSON.lastIndexOf(',') !== -1) {
			dataJSON = dataJSON.substring(0, dataJSON.lastIndexOf(','));
		}
		dataJSON += ']}';
		var jsonRes;
		try {
			jsonRes = JSON.parse(dataJSON);
		}
		catch (e) {
			console.error("Parsing error: ", e);
			res.json({error: "parsing error"});
		}
		res.json(jsonRes);
	}
	else if(req.body.request === 'deleteAsset') {
		var errorRequest = false;
		var nameColumn = '';
		var userid = req.session.userid;
		var assessment = req.session.currentAssessment;
		var array = req.body.arg;
		var jsonReq;
		try {
			jsonReq = JSON.parse(array);
		}
		catch (e) {
			console.error("Parsing error: ", e);
			res.json({result: 'errorRequest'});
		}		
		if(errorRequest === true) {
			res.json({result: 'errorRequest'});
		}
		else {
			pool.getConnection(function(err, connection) {
				connection.beginTransaction(function(err) {
					async.eachSeries(jsonReq.values, function(asset, callback) {
						var name = asset.name;
						var type = asset.type;
						var typeError = false;
						// console.log(name + " " + type);
						switch(type) {
							case "organization":
								nameColumn = 'Name';
								break;
							case "network":
								nameColumn = 'NetworkName';
								break;
							case "person":
								nameColumn = 'Name';
								break;
							case "system":
								nameColumn = 'SystemName';
								break;
							case "computing-device":
								nameColumn = 'Hostname';
								break;
							case "circuit":
								nameColumn = 'CircuitName';
								break;
							case "software":
								nameColumn = 'InstallationId';
								break;
							case "service":
								nameColumn = 'Fdqn';
								break;
							case "database":
								nameColumn = 'InstanceName';
								break;
							case "website":
								nameColumn = 'DocumentRoot';
								break;
							default:
								typeError = true;
								res.json({result: 'errorType'});				
						}
						if(typeError !== true) {
							var sqlQuery = "DELETE " +
										   "FROM asset " + 
										   "WHERE UserId = '" + userid + "' " +
										   "AND NomeAssessment = '" + assessment + "' " + 
										   "AND IdAsset IN (SELECT IdAsset " +
										   				   "FROM `" + type + "` " +
										   				   "WHERE " + nameColumn + " = '" + name + "');";
							connection.query(sqlQuery, function(err, result, fields) {
								if(err) {
									console.log(err);
									connection.rollback(function() {
										throw err;
									});
								}
								else {
									callback();
								}
							});
						}
					});
					connection.commit(function(err) {
						if(err) {
							console.log('commit: failure');
							connection.rollback(function() {
								throw err;
							});
							res.json({result: 'error'});
						}
						else {
							res.json({result: 'ok'});
						}
					});
				});
			});
		}
	}
	else if(req.body.request === 'propertyAsset') {
		var nameColumn = '';
		var field = '';
		var array = [], names = [];
		var name = req.body.arg1;
		var type = req.body.arg2;
		var userid = req.session.userid;
		var assessment = req.session.currentAssessment;
		switch(type) {
			case "organization":
				nameColumn = 'Name';
				field = 'Name, Email, PhoneNumber, WebsiteUrl';
				array = ["Name", "Email", "PhoneNumber", "WebsiteUrl"];
				names = ["Name", "Email", "Phone Number", "Website Url"];
				break;
			case "network":
				nameColumn = 'NetworkName';
				field = 'NetworkName, IpNetStart, IpNetEnd, Cidr';
				array = ["NetworkName", "IpNetStart", "IpNetEnd", "Cidr"];
				names = ["Network Name", "Ip Net Start", "Ip Net End", "Cidr"];
				break;
			case "person":
				nameColumn = 'Name';
				field = 'Name, Email, PhoneNumber, Birthdate';
				array = ["Name", "Email", "PhoneNumber", "Birthdate"];
				names = ["Name", "Email", "Phone Number", "Birthdate"];
				break;
			case "system":
				nameColumn = 'SystemName';
				field = 'SystemName, Version';
				array = ["SystemName", "Version"];
				names = ["System Name", "Version"];
				break;
			case "computing-device":
				nameColumn = 'Hostname';
				field = 'DistinguishedName, Fdqn, Hostname, MotherboardGuid';
				array = ["DistinguishedName", "Fdqn", "Hostname", "MotherboardGuid"];
				names = ["Distinguished Name", "Fdqn", "Hostname", "Motherboard Guid"];
				break;
			case "circuit":
				nameColumn = 'CircuitName';
				field = 'CircuitName';
				array =["CircuitName"];
				names = ["Circuit Name"];
				break;
			case "software":
				nameColumn = 'InstallationId';
				field = 'InstallationId, Cpe, License';
				array = ["InstallationId", "Cpe", "License"];
				names = ["Installation Id", "Cpe", "License"];
				break;
			case "service":
				nameColumn = 'Fdqn';
				field = 'Ip, Fdqn, Protocol';
				array = ["Ip", "Fdqn", "Protocol"];
				names = ["Ip", "Fdqn", "Protocol"];
				break;
			case "database":
				nameColumn = 'InstanceName';
				field = 'InstanceName';
				array = ["InstanceName"];
				names = ["Instance Name"];
				break;
			case "website":
				nameColumn = 'DocumentRoot';
				field = 'DocumentRoot, Locale';
				array = ["DocumentRoot", "Locale"];
				names = ["DocumentRoot", "Locale"];
				break;
			default:
		}
		var sqlQuery = "SELECT " + field + " " +
					   "FROM `" + type + "` " +
					   "WHERE " + nameColumn + " = '" + name + "' " +
					   "AND IdAsset IN (SELECT IdAsset " +
					   				   "FROM asset " +
					   				   "WHERE NomeAssessment = '" + assessment + "' " +
					   				   "AND UserId = " + userid + ");";
		pool.getConnection(function(err, connection) {
			connection.query(sqlQuery, function(err, result, fields) {
				if(err) {
					connection.release();
					res.json({result: 'error'});
					throw err;
				}
				else {
					connection.release();
					var resultJson = '{"result":[';
					for(var i = 0; i < array.length; i++) {
						// console.log(result[0][array[i]]);
						resultJson += '{"field":"' + names[i] + '", "value":"' + result[0][array[i]] + '"},';
					}
					if(resultJson.lastIndexOf(',') !== -1) {
						resultJson = resultJson.substring(0, resultJson.lastIndexOf(','));
					}
					resultJson += "]}";
					var jsonRes;
					try {
						jsonRes = JSON.parse(resultJson);
					}
					catch (e) {
						console.error("Parsing error: ", e);
						res.json({error: "parsing error"});
					}
					res.json(jsonRes);
				}
			});
		});
	}
	else if(req.body.request === 'connect') {
		var optionsHttpsReq = {
			hostname: 'localhost',
			port: 5000,
			path: '/',
			method: 'GET',
			ca: fs.readFileSync(pathSSHSatellite + 'cacert.pem'),
			cert: fs.readFileSync(pathSSH + 'nodoCert.pem'),
			key: fs.readFileSync(pathSSH + 'nodo.key'),
			agent: false
		};
		var httpsReq = https.request(optionsHttpsReq, function(httpsRes) {
			httpsRes.setEncoding('utf8');
			httpsRes.on('data', function(d) {
				console.log(d);
			});
		});
		httpsReq.end();
		
		httpsReq.on('error', function(e) {
			console.error(e);
		});
	}	
});

app.get('*', function(req, res) {
	res.render('404.html');
});