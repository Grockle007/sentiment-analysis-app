'use server';

import YahooFinance from 'yahoo-finance2';

export interface StockDataPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export async function getHistoricalData(symbol: string, from: Date, to: Date) {
    try {
        const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });
        const result = await yahooFinance.historical(symbol, {
            period1: from,
            period2: to,
            interval: '1d'
        });

        // Format data for Recharts
        const formattedData: StockDataPoint[] = result.map((quote: any) => ({
            date: quote.date.toISOString().split('T')[0], // YYYY-MM-DD
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
            volume: quote.volume,
        }));

        return { success: true, data: formattedData };

    } catch (error: any) {
        console.error('Error fetching stock data:', error);
        return { success: false, error: error.message || 'Failed to fetch stock data' };
    }
}
