'use strict';
/*******************************************************************************
 * Copyright (c) 2015 IBM Corp.
 *
 * All rights reserved.
 *
 * Communication between the CP browser code and this server is sent over web
 * sockets. This file has the code for processing and responding to message sent
 * to the web socket server.
 *
 * Contributors:
 *   David Huffman - Initial implementation
 *   Dale Avery
 *******************************************************************************/

var TAG = 'web_socket:';

// ==================================
// Part 2 - incoming messages, look for type
// ==================================
var chaincode = {};
var chain = {};
var async = require('async');
var http = require('http');
var util = require('util');
var peers = null;
var chaincodeHelper;

module.exports.setup = function setup(ccID, c, peerHosts, chaincode_helper) {
    if(!(ccID && c && peerHosts && chaincode_helper))
        throw new Error('Web socket handler given incomplete configuration');
    chaincode = ccID;
    chain = c;
    peers = peerHosts;
    chaincodeHelper = chaincode_helper;
};

module.exports.process_msg = function (socket, data) {

    // Clients must specify the identity to use on their network.  Needs to be someone
    // that this server has enrolled and has the enrollment cert for.
    if (!data.user || data.user === '') {
        sendMsg({type: 'error', error: 'user not provided in message'});
        return;
    }

    chain.getMember(data.user, function (err, usr) {
        var id = data.user;
        var invokeRequestOptions = {
            chaincodeID: chaincode
        };
        if (err) {
            console.log('Failed to get member:', id + ':', err);
        } else {

            if (data.type == 'createBond') {
                console.log(JSON.stringify(data.bond))
                if (data.bond && data.bond.issuer){
                    console.log('!', data.bond);
                    chaincodeHelper.createBond(data.user, data.bond, cb_invoked);
                }
            }
            else if (data.type == 'getAllBonds') {

                console.log(TAG, 'getting bonds');
                chaincodeHelper.getAllBonds(data.user, cb_got_bonds);

            }

            else if (data.type == 'getBond'){
                chaincodeHelper.getBond(data.user, data.transfer.CUSIP,cb_got_bond);
            }

            else if (data.type == 'updateBond'){
                
                chaincodeHelper.updateBond(data.user, data.bondId, data.term ,data.value);
            }

       
            else if (data.type == 'chainstats') {
                var options = {
                    host: peers[0].api_host,
                    port: peers[0].api_port,
                    path: '/chain',
                    method: 'GET'
                };

                function success(statusCode, headers, resp) {
                    cb_chainstats(null, JSON.parse(resp));
                }

                function failure(statusCode, headers, msg) {
                    console.log('status code: ' + statusCode);
                    console.log('headers: ' + headers);
                    console.log('message: ' + msg);
                }

                var request = http.request(options, function (resp) {
                    var str = '', chunks = 0;

                    resp.setEncoding('utf8');
                    resp.on('data', function (chunk) {															//merge chunks of request
                        str += chunk;
                        chunks++;
                    });
                    resp.on('end', function () {																	//wait for end before decision
                        if (resp.statusCode == 204 || resp.statusCode >= 200 && resp.statusCode <= 399) {
                            success(resp.statusCode, resp.headers, str);
                        }
                        else {
                            failure(resp.statusCode, resp.headers, str);
                        }
                    });
                });

                request.on('error', function (e) {																//handle error event
                    failure(500, null, e);
                });

                request.setTimeout(20000);
                request.on('timeout', function () {																//handle time out event
                    failure(408, null, 'Request timed out');
                });

                request.end();
            }
          

            function cb_got_bonds(e, bonds) {
                if (e != null) {
                    console.log('bonds error', e);
                }
                else {
                    console.log('bonds', bonds);
                    sendMsg({msg: 'bonds', bonds: bonds});
                }
            }

            function cb_got_bond(e, bond){
                sendMsg({msg: 'bond', bond: bond})
            }


            function cb_invoked(e, a) {
                console.log('response: ', e, a);
            }

            //call back for getting the blockchain stats, lets get the block height now
            var chain_stats = {};

            function cb_chainstats(e, stats) {
                chain_stats = stats;
                if (stats && stats.height) {
                    var list = [];
                    for (var i = stats.height - 1; i >= 1; i--) {								//create a list of heights we need
                        list.push(i);
                        if (list.length >= 8) break;
                    }

                    list.reverse();
                    async.eachLimit(list, 1, function (key, cb) {							//iter through each one, and send it
                        //get chainstats through REST API
                        var options = {
                            host: peers[0].api_host,
                            port: peers[0].api_port,
                            path: '/chain/blocks/' + key,
                            method: 'GET'
                        };

                        function success(statusCode, headers, stats) {
                            stats = JSON.parse(stats);
                            stats.height = key;
                            sendMsg({msg: 'chainstats', e: e, chainstats: chain_stats, blockstats: stats});
                            cb(null);
                        }

                        function failure(statusCode, headers, msg) {
                            console.log('chainstats block ' + key + ' failure :(');
                            console.log('status code: ' + statusCode);
                            console.log('headers: ' + headers);
                            console.log('message: ' + msg);
                            cb(null);
                        }

                        var request = http.request(options, function (resp) {
                            var str = '', chunks = 0;
                            resp.setEncoding('utf8');
                            resp.on('data', function (chunk) {															//merge chunks of request
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

                        request.on('error', function (e) {																//handle error event
                            failure(500, null, e);
                        });

                        request.setTimeout(20000);
                        request.on('timeout', function () {																//handle time out event
                            failure(408, null, 'Request timed out');
                        });

                        request.end();
                    }, function () {
                    });
                }
            }

            //call back for getting a block's stats, lets send the chain/block stats
            function cb_blockstats(e, stats) {
                if (chain_stats.height) stats.height = chain_stats.height - 1;
                sendMsg({msg: 'chainstats', e: e, chainstats: chain_stats, blockstats: stats});
            }
        }
    });

    /**
     * Send a response back to the client.
     * @param json The content of the response.
     */
    function sendMsg(json) {
        if (socket) {
            try {
                socket.send(JSON.stringify(json));
            }
            catch (error) {
                console.error('Error sending response to client:', error.message);
            }
        }
    }
};