'use strict';
/*******************************************************************************
 * Copyright (c) 2015 IBM Corp.
 *
 * All rights reserved.
 *
 * Contributors:
 *   David Huffman - Initial implementation
 *   Dale Avery
 *******************************************************************************/

//modified for Bond Issuance Demo by JShekhawat


// For logging
var TAG = 'app.js:';

// =====================================================================================================================
// 												Node.js Setup
// =====================================================================================================================
var express = require('express');
var session = require('express-session');
var compression = require('compression');
var serve_static = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var https = require('https');
var setup = require('./setup');
var cors = require('cors');
var fs = require('fs');

// =====================================================================================================================
// 												Express Setup
// =====================================================================================================================
// Create the Express app that will process incoming requests to our web server.
console.log(TAG, 'Configuring Express app');
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.engine('.html', require('pug').__express);
app.use(compression());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

// Create a static folder to serve up the CSS and JS for the demo.  These images shouldn't change very often, so we
// can set longer cache limits for them.
app.use(serve_static(path.join(__dirname, 'public'), {maxAge: '1d', setHeaders: setCustomCC})); // 1 day cache
function setCustomCC(res, path) {
    // 30 days cache
    if (serve_static.mime.lookup(path) === 'image/jpeg') res.setHeader('Cache-Control', 'public, max-age=2592000');
    else if (serve_static.mime.lookup(path) === 'image/png') res.setHeader('Cache-Control', 'public, max-age=2592000');
    else if (serve_static.mime.lookup(path) === 'image/x-icon') res.setHeader('Cache-Control', 'public, max-age=2592000');
}

// Use a session to track how many requests we receive from a client (See below)
app.use(session({secret: 'Somethignsomething1234!test', resave: true, saveUninitialized: true}));

// Enable CORS preflight across the board so browser will let the app make REST requests
app.options('*', cors());
app.use(cors());

// Attach useful things to the request
app.use(function (req, res, next) {
    console.log('----------------------------------------- incoming request -----------------------------------------');
    // Create a bag for passing information back to the client
    req.bag = {};
    req.session.count = req.session.count + 1;
    req.bag.session = req.session;

    // TODO is anything using this?
    var url_parts = require('url').parse(req.url, true);
    req.parameters = url_parts.query;
    next();
});

// This router will serve up our pages and API calls.
var router = require('./routes/site_router');
app.use('/', router);

// If the request is not process by this point, their are 2 possibilities:
// 1. We don't have a route for handling the request
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// 2. Something else went wrong
app.use(function (err, req, res, next) {		// = development error handler, print stack trace
    console.log(TAG, 'Error Handler -', req.url);
    var errorCode = err.status || 500;
    res.status(errorCode);
    req.bag.error = {msg: err.stack, status: errorCode};
    if (req.bag.error.status == 404) req.bag.error.msg = 'Sorry, I cannot locate that file';
    res.render('template/error', {bag: req.bag});
});

// =====================================================================================================================
// 												Launch Webserver
// =====================================================================================================================
// Start the web server using our express app to handle requests
var host = setup.SERVER.HOST;
var port = setup.SERVER.PORT;
console.log(TAG, 'Staring http server on: ' + host + ':' + port);
var server = http.createServer(app).listen(port, function () {
    console.log(TAG, 'Server Up - ' + host + ':' + port);
});

// Some setting that we've found make our life easier
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
server.timeout = 240000;


// =====================================================================================================================
// 												Network credentials
// =====================================================================================================================


var peerURLs = ["grpc://localhost:7051"];
var caURL = "grpc://localhost:7054";
var users = [{
        "username": "WebAppAdmin",
        "secret": "DJY27pEnl16d",
        "enrollId": "WebAppAdmin",
        "enrollSecret": "DJY27pEnl16d"
      }];

//you can put multiple peers in the array, the app will go on to the next available peer in case the connection to the previous one fails      
var peers = [
{
"discovery_host": "localhost",
"discovery_port": 7051,
"api_host": "localhost",
"api_port": 7050,
"type": "peer",
"network_id": "dev",
"id": "vp0",
"api_url": "http://localhost:7050"
}
];


// =====================================================================================================================
// 												Blockchain Setup
// =====================================================================================================================
console.log(TAG, 'configuring the chain object and its dependencies');

// Things that require the network to be set up
var user_manager = require('./utils/users');
var chaincode_ops = require('./utils/chaincode_ops');
var part2 = require('./utils/ws_part2');

// Keep the keyValStore in the project directory
var keyValStoreDir = __dirname + '/keyValStore';

// Connecting to TLS enabled peers requires a certificate
//Modify Appropriately
var certificate = fs.readFileSync('TLS.cert'); // TODO should download using service credentials

// Deploying chaincode requires us to know a path to a certificate on the peers :(
var certificate_path = '/certs/peer/cert.pem'; // TODO this should be available in the service credentials

// Create a hfc chain object and deploy our chaincode
var chain_setup = require('./utils/chain_setup');
chain_setup.setupChain(keyValStoreDir, users, peerURLs, caURL, certificate, certificate_path,
    function (error, chain, chaincodeID) {

        if(error) {
            console.log(TAG, 'Chain setup failed:', error);
            throw error;
        }

        // Setup anyone who needs the chain object or the chaincode
        user_manager.setup(chain);

        // Operation involving chaincode in this app should use this object.
        var cpChaincode = new chaincode_ops.CPChaincode(chain, chaincodeID);

        // TODO web socket handler should use a CPChaincode object
        part2.setup(chaincodeID, chain, peers, cpChaincode);
        router.setup_helpers(cpChaincode);

        // Now that the chain is ready, start the web socket server so clients can use the demo.
        start_websocket_server();
    });

// =====================================================================================================================
// 											WebSocket Communication Madness
// =====================================================================================================================
var ws = require('ws');
var wss = {};

function start_websocket_server(error, d) {
    if (error != null) {
        //look at tutorial_part1.md in the trouble shooting section for help
        console.log('! looks like the final configuration failed, holding off on the starting the socket\n', error);
        if (!process.error) process.error = {type: 'deploy', msg: error.message};
    }
    else {
        console.log('------------------------------------------ Websocket Up ------------------------------------------');
        wss = new ws.Server({server: server});												//start the websocket now
        wss.on('connection', function connection(ws) {
            ws.on('message', function incoming(message) {
                console.log('received ws msg:', message);
                var data = JSON.parse(message);
                part2.process_msg(ws, data);

            });
            ws.on('close', function () {
            });
        });

        // This makes it easier to contact our clients
        wss.broadcast = function broadcast(data) {
            wss.clients.forEach(function each(client) {
                try {
                    data.v = '2';
                    client.send(JSON.stringify(data));
                }
                catch (e) {
                    console.log('error broadcast ws', e);
                }
            });
        };

        // Monitor chain's blockheight and pass it along to clients.
        setInterval(function () {
            var options = {
                host: peers[0].api_host,
                port: peers[0].api_port,
                path: '/chain',
                method: 'GET'
            };

            function success(statusCode, headers, resp) {
                resp = JSON.parse(resp);
                if (resp && resp.height) {
                    wss.broadcast({msg: 'reset'});
                }
            }

            function failure(statusCode, headers, msg) {
                // Don't broadcast failures to clients, just log them
                console.error('chainstats failure: (' +
                    'status code: ' + statusCode +
                    '\n  headers: ' + headers +
                    '\n  message: ' + msg + ')');
            }

            var request = http.request(options, function (resp) {
                var str = '', chunks = 0;
                resp.setEncoding('utf8');
                resp.on('data', function (chunk) {                                                            //merge chunks of request
                    str += chunk;
                    chunks++;
                });
                resp.on('end', function () {
                    if (resp.statusCode == 204 || resp.statusCode >= 200 && resp.statusCode <= 399) {
                        success(resp.statusCode, resp.headers, str);
                    }
                    else {
                        failure(resp.statusCode, resp.headers, str);
                    }
                });
            });

            request.on('error', function (e) {
                failure(500, null, e);
            });

            request.setTimeout(20000);
            request.on('timeout', function () {                                                                //handle time out event
                failure(408, null, 'Request timed out');
            });

            request.end();
        }, 5000);
    }
}
