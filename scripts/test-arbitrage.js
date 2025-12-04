// const WebSocket = require('ws'); // Using global WebSocket in Node v25+

const connections = [];
const prices = {};

function updatePrice(exchange, bid, ask) {
    prices[exchange] = { bid, ask };
    calculateArbitrage();
}

function calculateArbitrage() {
    const exchanges = Object.keys(prices);
    if (exchanges.length < 2) return;

    let bestOpp = null;
    let maxProfit = 0;

    for (const buyEx of exchanges) {
        for (const sellEx of exchanges) {
            if (buyEx === sellEx) continue;

            const buyPrice = prices[buyEx].ask;
            const sellPrice = prices[sellEx].bid;
            const profit = sellPrice - buyPrice;

            if (profit > 0 && profit > maxProfit) {
                maxProfit = profit;
                bestOpp = {
                    buyExchange: buyEx,
                    sellExchange: sellEx,
                    buyPrice,
                    sellPrice,
                    profit
                };
            }
        }
    }

    if (bestOpp) {
        console.log(`Arbitrage Opportunity: Buy ${bestOpp.buyExchange} ($${bestOpp.buyPrice}) -> Sell ${bestOpp.sellExchange} ($${bestOpp.sellPrice}) | Profit: $${bestOpp.profit.toFixed(2)}`);
    } else {
        // console.log('No arbitrage opportunity found.');
    }
}

// Binance
const binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@bookTicker');
binanceWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updatePrice('Binance', parseFloat(data.b), parseFloat(data.a));
};
connections.push(binanceWs);

// Coinbase
const coinbaseWs = new WebSocket('wss://ws-feed.exchange.coinbase.com');
coinbaseWs.onopen = () => {
    coinbaseWs.send(JSON.stringify({
        type: 'subscribe',
        product_ids: ['BTC-USD'],
        channels: ['ticker']
    }));
};
coinbaseWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'ticker' && data.best_bid && data.best_ask) {
        updatePrice('Coinbase', parseFloat(data.best_bid), parseFloat(data.best_ask));
    }
};
connections.push(coinbaseWs);

// Kraken
const krakenWs = new WebSocket('wss://ws.kraken.com');
krakenWs.onopen = () => {
    krakenWs.send(JSON.stringify({
        event: 'subscribe',
        pair: ['XBT/USD'],
        subscription: { name: 'ticker' }
    }));
};
krakenWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (Array.isArray(data) && data[1] && data[1].b && data[1].a) {
        updatePrice('Kraken', parseFloat(data[1].b[0]), parseFloat(data[1].a[0]));
    }
};
connections.push(krakenWs);

console.log('Listening for prices...');

// Keep alive for 15 seconds then exit
setTimeout(() => {
    console.log('Closing connections...');
    connections.forEach(ws => ws.close());
    process.exit(0);
}, 15000);
