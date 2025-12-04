'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp } from 'lucide-react';

interface ExchangePrice {
    bid: number;
    ask: number;
    exchange: string;
}

interface ArbitrageOpportunity {
    buyExchange: string;
    sellExchange: string;
    buyPrice: number;
    sellPrice: number;
    profit: number;
    profitPercent: number;
}

export default function ArbitrageScanner() {
    const [prices, setPrices] = useState<Record<string, ExchangePrice>>({});
    const [opportunity, setOpportunity] = useState<ArbitrageOpportunity | null>(null);

    useEffect(() => {
        const connections: WebSocket[] = [];

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
                // Kraken format: [channelID, { a: [price, wholeLotVol, lotVol], b: [price, wholeLotVol, lotVol], ... }, ...]
                updatePrice('Kraken', parseFloat(data[1].b[0]), parseFloat(data[1].a[0]));
            }
        };
        connections.push(krakenWs);

        return () => {
            connections.forEach(ws => ws.close());
        };
    }, []);

    const updatePrice = (exchange: string, bid: number, ask: number) => {
        setPrices(prev => {
            const newPrices = { ...prev, [exchange]: { bid, ask, exchange } };
            calculateArbitrage(newPrices);
            return newPrices;
        });
    };

    const calculateArbitrage = (currentPrices: Record<string, ExchangePrice>) => {
        const exchanges = Object.values(currentPrices);
        if (exchanges.length < 2) return;

        let bestOpp: ArbitrageOpportunity | null = null;
        let maxProfit = 0;

        // Compare every pair
        for (const buyEx of exchanges) {
            for (const sellEx of exchanges) {
                if (buyEx.exchange === sellEx.exchange) continue;

                // Buy at Ask (lowest possible buy price is best, but here we buy at the exchange's Ask)
                // Sell at Bid (highest possible sell price is best, but here we sell at the exchange's Bid)
                // Wait, arbitrage is: Buy Low (Ask on Ex A) -> Sell High (Bid on Ex B)

                const buyPrice = buyEx.ask;
                const sellPrice = sellEx.bid;
                const profit = sellPrice - buyPrice;

                if (profit > 0 && profit > maxProfit) {
                    maxProfit = profit;
                    bestOpp = {
                        buyExchange: buyEx.exchange,
                        sellExchange: sellEx.exchange,
                        buyPrice,
                        sellPrice,
                        profit,
                        profitPercent: (profit / buyPrice) * 100
                    };
                }
            }
        }
        setOpportunity(bestOpp);
    };

    return (
        <Card className="w-full border-2 border-primary/10">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Live Arbitrage Scanner
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Live Prices */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Live Prices (BTC/USD)</h3>
                        {Object.keys(prices).length === 0 && <div className="text-sm text-muted-foreground">Connecting to exchanges...</div>}
                        {Object.values(prices).map((p) => (
                            <div key={p.exchange} className="flex justify-between items-center text-sm p-2 bg-accent/30 rounded">
                                <span className="font-medium">{p.exchange}</span>
                                <div className="flex gap-4 font-mono">
                                    <span className="text-green-600">Bid: ${p.bid.toFixed(2)}</span>
                                    <span className="text-red-600">Ask: ${p.ask.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Opportunity */}
                    <div className="flex flex-col justify-center items-center p-4 bg-accent/20 rounded-lg border border-border">
                        {opportunity ? (
                            <div className="text-center space-y-3 w-full">
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600 mb-2">
                                    Opportunity Detected
                                </Badge>
                                <div className="flex items-center justify-center gap-2 text-lg font-bold">
                                    <span className="text-blue-500">{opportunity.buyExchange}</span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-purple-500">{opportunity.sellExchange}</span>
                                </div>
                                <div className="text-3xl font-bold text-green-500">
                                    +${opportunity.profit.toFixed(2)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Buy: ${opportunity.buyPrice.toFixed(2)} | Sell: ${opportunity.sellPrice.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Profit: {opportunity.profitPercent.toFixed(4)}%
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <div className="mb-2">Scanning for price discrepancies...</div>
                                <div className="text-xs opacity-70">No profitable arbitrage currently found</div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
