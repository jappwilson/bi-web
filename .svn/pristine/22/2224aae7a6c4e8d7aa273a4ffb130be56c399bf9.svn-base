'use strict';
/*******************************************************************************
 * Copyright (c) 2015 IBM Corp.
 *
 * All rights reserved.
 *
 * This module provides wrappers for the operations on chaincode that this demo
 * needs to perform.
 *
 * Contributors:
 *   Dale Avery - Initial implementation
 *
 * Created by davery on 11/8/2016.
 *******************************************************************************/
//This file has been modified by Jshekhawat


// For logging
var TAG = 'chaincode_ops:';

function CPChaincode(chain, chaincodeID) {
    if(!(chain && chaincodeID))
        throw new Error('Cannot create chaincode helper without both a chain object and the chaincode ID!');
    this.chain = chain;
    this.chaincodeID = chaincodeID;
}


CPChaincode.prototype.createBond = function(enrollID, bond, cb){
    
    var Request = {
        chaincodeID : this.chaincodeID,
        fcn: 'createBond',
        args: ['createBond',JSON.stringify(bond)]
    }

    invoke(this.chain, enrollID, Request, function(err, result){
        if (err){
            console.error(TAG, 'failed to create bond:', err);
            return cb(err);
        }

        console.log(TAG, 'Created bond successfully:', result);

    });


}

CPChaincode.prototype.updateBond = function(enrollID, bondId, term, value, cb){
    var Request = {
        chaincodeID : this.chaincodeID,
        fcn : 'updateBond',
        args: ['updateBond', bondId, term, value]
    }

    invoke(this.chain, enrollID, Request, function(err, result){
        if (err){
            console.error(TAG, 'failed to update rating:', err);
            return cb(err);
        }

        console.log(TAG, 'updated rating successfully:', result);
})
}

CPChaincode.prototype.getAllBonds = function(enrollID, cb){
    console.log(TAG, 'Getting All Outstanding bonds');

    var Request = {
        chaincodeID: this.chaincodeID,
        fcn: 'query',
        args: ['getAllBonds']
    }

    query(this.chain, enrollID, Request, function(err, bonds){
        if (err){
            console.error(TAG, 'failed to get OS Bonds:', err);
            return cb(err);
        }
        console.log(TAG, 'got bonds');
        cb(null, bonds.toString());
    })

}

CPChaincode.prototype.getBond = function(enrollID, cusip, cb) {
    
    var Request = {
        chaincodeID: this.chaincodeID,
        fcn: 'query',
        args: ['getBond', cusip]
    }

    query(this.chain, enrollID, Request, function(err, bond){
        if (err){
            console.error(TAG, 'failed to get OS Bonds:', err);
            return cb(err);
        }
        console.log(TAG, 'got bond');
        cb(null, bond.toString());
    })
};


module.exports.CPChaincode = CPChaincode;

function invoke(chain, enrollID, requestBody, cb) {

    // Submit the invoke transaction as the given user
    console.log(TAG, 'Invoke transaction as:', enrollID);
    chain.getMember(enrollID, function (getMemberError, usr) {
        if (getMemberError) {
            console.error(TAG, 'failed to get ' + enrollID + ' member:', getMemberError.message);
            if (cb) cb(getMemberError);
        
        } else {
            
            console.log(TAG, 'successfully got member:', enrollID);
            
            usr.getUserCert(["role"],function(err, userCert){
                if(err){
                    console.log("failed to get tcert");
                };
                requestBody.userCert = userCert;
                console.log(userCert);
            });

            console.log(TAG, 'invoke body:', JSON.stringify(requestBody));
            var invokeTx = usr.invoke(requestBody);

            // Print the invoke results
            invokeTx.on('completed', function (results) {
                // Invoke transaction submitted successfully
                console.log(TAG, 'Successfully completed invoke. Results:', results);
                cb(null, results);
            });
            invokeTx.on('submitted', function (results) {
                // Invoke transaction submitted successfully
                console.log(TAG, 'invoke submitted');
                cb(null, results);
            });
            invokeTx.on('error', function (err) {
                // Invoke transaction submission failed
                console.log(TAG, 'invoke failed. Error:', err);
                cb(err);
            });
        }
    });
}

function query(chain, enrollID, requestBody, cb) {

    // Submit the invoke transaction as the given user
    console.log(TAG, 'querying chaincode as:', enrollID);
    chain.getMember(enrollID, function (getMemberError, usr) {
        if (getMemberError) {
            console.error(TAG, 'failed to get ' + enrollID + ' member:', getMemberError.message);
            if (cb) cb(getMemberError);
        } else {
            console.log(TAG, 'successfully got member:', enrollID);

            console.log(TAG, 'query body:', JSON.stringify(requestBody));
            var queryTx = usr.query(requestBody);

            queryTx.on('complete', function (results) {
                console.log(TAG, 'Successfully completed query. Results:', results);
                cb(null, results.result);
            });
            queryTx.on('error', function (err) {
                console.log(TAG, 'query failed. Error:', err);
                cb(err);
            });
        }
    });
}
