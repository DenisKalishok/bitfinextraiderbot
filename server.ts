'use strict';
import cron = require('node-cron');
const key = require('./key.json');
import { bitfinex } from "./bitfinex";

//окна усреднения
const winShort = 12;
const winLong = 48;

//массивы преобразованных цен
const MAShort = [];
const MALong = [];

let position; //состояние позиции

const btf = new bitfinex( key.btf.apiKey, key.btf.apiSecret );

//главный блок
cron.schedule('* * * * *', () => {

    btf.candles('1m:tBTCUSD', 'hist', {limit: 50}, (err, res, body) => {

        convertToMA( getMassPrice(body) );
        signalCheck();
        console.log('position: ' + position + ' || time: ' + (new Date()).getHours() + ":" + (new Date()).getMinutes());
    });
});

function signalCheck(){

    //сигнал к продаже
    if ((MAShort[0] < MALong[0]) && (position == "long") ) {

        position = "short";
        setOrderForSell();
    }
    //сигнал к покупке
    if((MAShort[0] > MALong[0]) && (position == "short") ){

        position = "long";
        setOrderForBuy();
    }
}

function setOrderForBuy(){

    //получаем данные цены
    btf.ticker ('tBTCUSD', (err, response, body) =>  {

        let priceDefault = body[6];
        //вычисляет сколько можем купить
        btf.calcAvailableBalance({
            symbol: 'tBTCUSD',
            dir: 1, // buy
            rate: priceDefault,
            type: 'EXCHANGE'
        }, (err, response, body) => {

            let amount = (body[0] - 0.0001).toFixed(4);
            //ставим ордер
            newOrder({
               "symbol": "btcusd",
                "amount": amount.toString(),
                "price": priceDefault.toString(),
                "side": "buy",
                "type": "exchange market"
            });
        });
    });
}

function setOrderForSell(){

    //получаем данные кошелька
    btf.wallets( (err, response, body) => {

        let amount = 0;

        body.forEach((item) => {

            if( item[0] == "exchange" && item[1] == "BTC")
                amount = (item[2] - 0.0001).toFixed(4);
        });

        //ставим ордер
        newOrder({
            "symbol": "btcusd",
            "amount": amount.toString(),
            "price": "7000",
            "side": "sell",
            "type": "exchange market"
        });
    });
}

function newOrder(options){

    btf.newOrder(options , (err, response, body) => {

        console.log(body);
    });
}

function convertToMA( massPrice ){

    if( massPrice ){
        for (let i = 0; i < massPrice.length + 1 - winShort; i++) {
            MAShort[i] = ( SMA(winShort, i, massPrice) ).toFixed(2);
            //console.log(MAShort[i]);
        }

        for (let i = 0; i < massPrice.length + 1 - winLong; i++) {
            MALong[i] = ( SMA(winLong, i, massPrice) ).toFixed(2);
            //console.log(MALong[i]);
        }

        //определяем позицию первый раз
        if(!position){

            if (MAShort[0] < MALong[0])
                position = 'short';
            else
                position = 'long';
        }
    }
}

//из массива свечей в массив цен
function getMassPrice( data ){

    try{
        return data.map( (item) => {
            //если брать цены закрытия свечи
            return (item[2]).toFixed(2);
        });
    }catch (err){
        console.log('message: cannot get data');
        return false
    }
}

//простая скользящая средняя
function SMA(win, k, massPrice){

    let summ = 0;

    for (let i = 0; i < win; i++) {

        summ += parseFloat(massPrice[k+i]);
    }

    return summ / win;
 }

//взвешенная скользящая средняя !!формула не проверена руками
function WMA(win, k, massPrice){

    let summ = 0;

    for(let i = 0; i < win; i++){

         summ += (win - i) * parseFloat(massPrice[k+i]);
    }

    return (2 * summ) / (win * (win + 1));
}
