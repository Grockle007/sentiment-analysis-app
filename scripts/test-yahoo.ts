import YahooFinance from 'yahoo-finance2';

async function test() {
    try {
        const yahooFinance = new YahooFinance();
        const result = await yahooFinance.historical('AAPL', {
            period1: '2023-01-01',
            period2: '2023-01-10',
            interval: '1d'
        });
        console.log('Success:', result.length, 'records found');
        console.log(result[0]);
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
