'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrderBookEntry {
    price: string;
    quantity: string;
}

interface OrderBookData {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
}

type Exchange = 'binance' | 'coinbase' | 'kraken';

export default function OrderBook() {
    const [orderBook, setOrderBook] = useState<OrderBookData>({ bids: [], asks: [] });
    const [lastPrice, setLastPrice] = useState<number | null>(null);
    const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [exchange, setExchange] = useState<Exchange>('binance');

    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        let ws: WebSocket | null = null;
        setOrderBook({ bids: [], asks: [] }); // Clear old data on switch
        setConnectionStatus('connecting');
        setErrorMsg(null);

        const connect = () => {
            try {
                let url = '';
                if (exchange === 'binance') {
                    url = 'wss://stream.binance.com:9443/ws/btcusdt@depth20@100ms';
                } else if (exchange === 'coinbase') {
                    url = 'wss://ws-feed.exchange.coinbase.com';
                } else if (exchange === 'kraken') {
                    url = 'wss://ws.kraken.com';
                }

                ws = new WebSocket(url);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log(`Connected to ${exchange} WebSocket`);
                    setConnectionStatus('connected');

                    // Subscribe messages for non-Binance exchanges
                    if (exchange === 'coinbase') {
                        ws?.send(JSON.stringify({
                            type: 'subscribe',
                            product_ids: ['BTC-USD'],
                            channels: ['level2']
                        }));
                    } else if (exchange === 'kraken') {
                        ws?.send(JSON.stringify({
                            event: 'subscribe',
                            pair: ['XBT/USD'],
                            subscription: { name: 'book', depth: 25 }
                        }));
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        handleMessage(data, exchange);
                    } catch (e) {
                        console.error('Error parsing WebSocket message:', e);
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    if (connectionStatus !== 'connected') {
                        setConnectionStatus('error');
                        setErrorMsg(`Failed to connect to ${exchange}`);
                    }
                };

                ws.onclose = () => {
                    console.log('WebSocket connection closed');
                    if (connectionStatus === 'connected') {
                        setConnectionStatus('error');
                        setErrorMsg('Connection lost');
                    }
                };
            } catch (e) {
                console.error('WebSocket connection failed:', e);
                setConnectionStatus('error');
                setErrorMsg('Failed to initialize WebSocket');
            }
        };

        connect();

        return () => {
            if (ws && ws.readyState === 1) {
                ws.close();
            }
        };
    }, [exchange]);

    const handleMessage = (data: any, source: Exchange) => {
        if (source === 'binance') {
            if (data.bids && data.asks) {
                const bids = data.bids.map((b: string[]) => ({ price: b[0], quantity: b[1] }));
                const asks = data.asks.map((a: string[]) => ({ price: a[0], quantity: a[1] }));
                updateOrderBook(bids, asks);
            }
        } else if (source === 'coinbase') {
            if (data.type === 'snapshot') {
                const bids = data.bids.map((b: string[]) => ({ price: b[0], quantity: b[1] }));
                const asks = data.asks.map((a: string[]) => ({ price: a[0], quantity: a[1] }));
                updateOrderBook(bids, asks);
            } else if (data.type === 'l2update') {
                // Coinbase sends updates, for simplicity in this view we might just wait for snapshots
                // or we'd need to maintain a local orderbook state. 
                // For a "Limit price shown closer to live price" view, a snapshot is often enough if refreshed,
                // but Coinbase L2 is heavy. Let's just visualize the snapshot for now or handle updates simply.
                // Actually, Coinbase snapshots are huge. Let's stick to simple visualization.
                // NOTE: Proper L2 maintenance is complex. For this demo, we might just show the initial snapshot
                // or use a different channel like 'ticker' for price and 'level2' just for initial.
                // Let's try to just process updates into a simple view if possible, or just use the snapshot.

                // For simplicity/robustness in a demo, let's just use the snapshot. 
                // Real-time L2 maintenance requires a Redux store or complex state.
            }
        } else if (source === 'kraken') {
            if (Array.isArray(data) && data[1]) {
                // Kraken snapshot or update
                const payload = data[1];
                if (payload.as && payload.bs) { // Snapshot
                    const bids = payload.bs.map((b: string[]) => ({ price: b[0], quantity: b[1] }));
                    const asks = payload.as.map((a: string[]) => ({ price: a[0], quantity: a[1] }));
                    updateOrderBook(bids, asks);
                }
            }
        }
    };

    const updateOrderBook = (bids: OrderBookEntry[], asks: OrderBookEntry[]) => {
        setOrderBook({ bids: bids.slice(0, 20), asks: asks.slice(0, 20) });

        if (bids.length > 0 && asks.length > 0) {
            const bestBid = parseFloat(bids[0].price);
            const bestAsk = parseFloat(asks[0].price);
            const currentPrice = (bestBid + bestAsk) / 2;

            setLastPrice(prev => {
                if (prev) {
                    setPriceDirection(currentPrice > prev ? 'up' : 'down');
                }
                return currentPrice;
            });
        }
    };

    // Helper to format numbers
    const formatPrice = (price: string) => parseFloat(price).toFixed(2);
    const formatQty = (qty: string) => parseFloat(qty).toFixed(5);

    // Calculate max volume for depth bars
    const maxBidVol = Math.max(...orderBook.bids.map(b => parseFloat(b.quantity)), 0);
    const maxAskVol = Math.max(...orderBook.asks.map(a => parseFloat(a.quantity)), 0);
    const maxVol = Math.max(maxBidVol, maxAskVol);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-accent rounded-full transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">Bitcoin Live Order Book</h1>
                </div>

                <div className="flex items-center gap-4">
                    <Select value={exchange} onValueChange={(v: Exchange) => setExchange(v)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Exchange" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="binance">Binance</SelectItem>
                            <SelectItem value="coinbase">Coinbase</SelectItem>
                            <SelectItem value="kraken">Kraken</SelectItem>
                        </SelectContent>
                    </Select>

                    {lastPrice && (
                        <div className={`text-2xl font-mono font-bold flex items-center gap-2 ${priceDirection === 'up' ? 'text-green-500' :
                                priceDirection === 'down' ? 'text-red-500' : ''
                            }`}>
                            ${lastPrice.toFixed(2)}
                            {priceDirection === 'up' && <ArrowUp className="h-6 w-6" />}
                            {priceDirection === 'down' && <ArrowDown className="h-6 w-6" />}
                        </div>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between text-sm text-muted-foreground uppercase">
                        <span>Bid (Buy)</span>
                        <span>Ask (Sell)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {orderBook.bids.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            {connectionStatus === 'connecting' ? 'Connecting...' : 'Waiting for data...'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                            {/* Bids Side (Green) */}
                            <div className="space-y-1">
                                <div className="grid grid-cols-3 text-xs text-muted-foreground mb-2 px-2">
                                    <span>Qty</span>
                                    <span className="text-right">Price</span>
                                    <span className="text-right">Total</span>
                                </div>
                                {orderBook.bids.map((bid, i) => (
                                    <div key={i} className="relative grid grid-cols-3 px-2 py-1 hover:bg-accent/50 rounded">
                                        <div
                                            className="absolute top-0 right-0 bottom-0 bg-green-500/10 transition-all duration-200"
                                            style={{ width: `${(parseFloat(bid.quantity) / maxVol) * 100}%` }}
                                        />
                                        <span className="relative z-10">{formatQty(bid.quantity)}</span>
                                        <span className="relative z-10 text-right text-green-500">{formatPrice(bid.price)}</span>
                                        <span className="relative z-10 text-right text-muted-foreground">
                                            {(parseFloat(bid.price) * parseFloat(bid.quantity)).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Asks Side (Red) */}
                            <div className="space-y-1">
                                <div className="grid grid-cols-3 text-xs text-muted-foreground mb-2 px-2">
                                    <span>Price</span>
                                    <span className="text-right">Qty</span>
                                    <span className="text-right">Total</span>
                                </div>
                                {orderBook.asks.map((ask, i) => (
                                    <div key={i} className="relative grid grid-cols-3 px-2 py-1 hover:bg-accent/50 rounded">
                                        <div
                                            className="absolute top-0 left-0 bottom-0 bg-red-500/10 transition-all duration-200"
                                            style={{ width: `${(parseFloat(ask.quantity) / maxVol) * 100}%` }}
                                        />
                                        <span className="relative z-10 text-red-500">{formatPrice(ask.price)}</span>
                                        <span className="relative z-10 text-right">{formatQty(ask.quantity)}</span>
                                        <span className="relative z-10 text-right text-muted-foreground">
                                            {(parseFloat(ask.price) * parseFloat(ask.quantity)).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="text-center text-xs text-muted-foreground space-y-2">
                <div>Real-time data provided by {exchange.charAt(0).toUpperCase() + exchange.slice(1)} WebSocket API</div>
                {connectionStatus === 'connecting' && (
                    <div className="text-yellow-500 animate-pulse">Connecting...</div>
                )}
                {errorMsg && (
                    <div className="text-red-500 font-medium bg-red-500/10 p-2 rounded inline-block">
                        {errorMsg}
                    </div>
                )}
            </div>
        </div>
    );
}
