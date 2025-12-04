// const WebSocket = require('ws'); // Using global WebSocket in Node v25+

const url = 'wss://ws-feed.exchange.coinbase.com';
const ws = new WebSocket(url);

ws.onopen = () => {
    console.log('Connected to Coinbase WebSocket');
    const msg = JSON.stringify({
        type: 'subscribe',
        product_ids: ['BTC-USD'],
        channels: ['level2_batch']
    });
    ws.send(msg);
    console.log('Subscribed to level2');
};

ws.onmessage = (event) => {
    const data = event.data;
    const message = JSON.parse(data);
    console.log('Received message type:', message.type);
    if (message.type === 'error') {
        console.error('Error message:', message);
    }
    if (message.type === 'snapshot') {
        console.log('Snapshot received. Bids:', message.bids.length, 'Asks:', message.asks.length);
        // Close after snapshot to avoid spam
        ws.close();
    }
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
};
