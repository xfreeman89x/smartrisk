function computingDeviceAsync() {
	
}

function computingDeviceSeries(hosts) {
	if(hosts) {
		
	}
	else {
		
	}
}

if(checkCorrectness == true && errorDestination == false) {
	pool.getConnection(function(err, connection) {
		connection.beginTransaction(function(err) {
			var userid = req.session.userid;
			var assessment = req.session.currentAssessment;
			
			var ipAddress = hosts[i].addr_ipv4;
			console.log(ipAddress);
			var name; // da completare con valore
			queryComputingDevice1(name, ipAddress, timestamp, destination, assessment, userid, connection);
		});
	});
}

function queryComputingDevice1(name, ipAddress, timestamp, destination, assessment, userid, connection) {
	var sqlQuery1 = "INSERT INTO asset(IdAsset, NomeAssessment, UserId, Resource, ExtendedInfo, Timestamp, IdLocation, AssetType)" + 
			" VALUES(NULL, '" + assessment + "', " + userid + ", '" + assessment + ":" + "computing-device." + timestamp.replace(" ", "_") + "', NULL, '" + 
	timestamp + "', NULL, 'computing-device');";
	connection.query(sqlQuery1, function(err, result, fields) {
		if(err) {
			console.log('query1: failure');
			connection.rollback(function() {
				throw err;
			});
			res.json({result: 'error'});
		}
		else {
			queryComputingDevice2(name, ipAddress, destination, assessment, userid, connection);
		}
	});
}

function queryComputingDevice2(name, ipAddress, destination, assessment, userid, connection) {
	var sqlQuery2 = "INSERT INTO `computing-device`(IdComputingDevice, IdAsset, DistinguishedName, Fdqn, Hostname, MotherboardGuid) " + 
			"VALUES(NULL, LAST_INSERT_ID(), NULL, NULL, NULL, NULL);";
	connection.query(sqlQuery2, function(err, result, fields) {
		if(err) {
			console.log('query2: failure');
			connection.rollback(function() {
				throw err;
			});
			res.json({result: 'error'});
		}
		else {
			queryComputingDeviceLastInsert(ipAddress, destination, assessment, userid, connection);
		}
	});
}

function queryComputingDeviceLastInsert(ipAddress, destination, assessment, userid, connection) {
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
			queryComputingDevice3(idComputingDevice, ipAddress, destination, assessment, userid, connection);
		}
	});
}

function queryComputingDevice3(idComputingDevice, ipAddress, destination, assessment, userid, connection) {
	var sqlQuery3 = "INSERT INTO connection(IdConnection, IdComputingDevice, IpAddress, MacAddress, Url) " + 
	"VALUES(NULL, '" + idComputingDevice + "', '" + ipAddress + "', NULL, NULL);";
	connection.query(sqlQuery3, function(err, result, fields) {
		if(err) {
			console.log('query3: failure');
			connection.rollback(function() {
				throw err;
			});
			res.json({result: 'error'});
		}
		else {
			queryComputingDevice4(idComputingDevice, destination, assessment, userid, connection);
		}
	});
}

function queryComputingDevice4(idComputingDevice, destination, assessment, userid, connection) {
	var sqlQuery4 = "SELECT IdSystem " + 
	"FROM system " + 
	"WHERE SystemName = " + destination + " " +
	"AND IdAsset IN (SELECT IdAsset " + 
				   "FROM asset " + 
				   "WHERE NomeAssessment = '" + assessment + "' " +
				   "AND UserId = " + userid + ");";
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
				queryComputingDevice5(idSystem, idComputingDevice, connection);
			}
		}
	});
}

function queryComputingDevice5(idSystem, idComputingDevice, connection) {
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