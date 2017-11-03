'use strict';
import request = require('request');
import crypto = require('crypto');

export class bitfinex {

    private url: string = 'https://api.bitfinex.com/v2';
    private apiKey: string;
    private apiSecret: string;

    constructor( apiKey: string, apiSecret: string){

        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    makeAuthRequest (path, qParams ={}, cb) {

        const url = `${this.url}/${path}`;
        let nonce =  Date.now().toString();
        let rawBody = JSON.stringify(qParams);
        let signature = `/api/v2/${path}${nonce}${rawBody}`;

        signature = crypto
            .createHmac('sha384', this.apiSecret)
            .update(signature)
            .digest('hex');

        return request({
            url,
            method: 'POST',
            headers: {
                'bfx-nonce': nonce,
                'bfx-apikey': this.apiKey,
                'bfx-signature': signature
            },
            body: qParams,
            json: true
        }, ( err, response, body) => {
            cb(err, response, body)
        })
    }

    makePublicRequest (name, qParams, cb) {
        const url = `${this.url}/${name}`;
        //console.log(url);
        return request({
            url,
            method: 'GET',
            body: qParams,
            json: true
        }, (err, response, body) => {
            cb(err, response, body)
        });

    };

    // Public endpoints

    ticker ( symbol = 'tBTCUSD', cb) {
        return this.makePublicRequest(`ticker/${symbol}`, {}, cb)
    }

    tickers ( qParams, cb) {
        return this.makePublicRequest(`tickers`, qParams, cb)
    }

    stats ( pParams = 'pos.size:1m:tBTCUSD:long', section = 'hist', cb) {
        return this.makePublicRequest(`stats1/${pParams}/${section}`, {}, cb)
    }
    candles ( pParams = '1m:tBTCUSD', section = 'hist', qParams, cb) {
        return this.makePublicRequest(`candles/trade:${pParams}/${section}`, qParams, cb)
    }

    // Auth endpoints

    alertList ( type = 'price', cb) {
        return this.makeAuthRequest('auth/r/alerts', { type }, cb)
    }

    alertSet ( qParams, cb) {
        return this.makeAuthRequest(`auth/w/alert/set`, qParams, cb)
    }

    alertDelete ( qParams, cb) {
        return this.makeAuthRequest(`auth/w/alert/set`, qParams, cb)
    }
    wallets ( cb ){
        return this.makeAuthRequest('auth/r/wallets', {}, cb)
    }

    orders ( symbol ='tBTCUSD', cb ){
        return this.makeAuthRequest(`auth/r/orders/${symbol}`, {}, cb)
    }

    trades ( symbol = 'tBTCUSD', start = null, end = null, limit = null, cb) {
        return this.makeAuthRequest(`auth/r/trades/${symbol}/hist`, {start, end, limit}, cb)
    }

    orderTrades(cb){
        return this.makeAuthRequest(`auth/r/order/tBTCUSD:OrderId/trades`, {}, cb)
    }

    calcAvailableBalance( qParams, cb){
        return this.makeAuthRequest(`auth/calc/order/avail`, qParams, cb)
    }
    newOrder( qParams ,cb){

        let url = `https://api.bitfinex.com/v1/order/new`;
        let nonce = Date.now().toString();

        let payload = {
            request: `/v1/order/new`,
            nonce
        };

        for ( let key in qParams ) {
            payload[key] = qParams[key];
        }

        payload = new Buffer(JSON.stringify(payload))
            .toString('base64');

        let signature = crypto
            .createHmac('sha384', this.apiSecret)
            .update( payload )
            .digest('hex');

        let headers = {
            'X-BFX-APIKEY': this.apiKey,
            'X-BFX-PAYLOAD': payload,
            'X-BFX-SIGNATURE': signature
        };

        return request({
            url,
            method: 'post',
            headers

        },(err, response, body) => {

            cb(err, response, body)
        });

    }


}