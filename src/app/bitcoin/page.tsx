import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bitcoin } from 'lucide-react';
import ArbitrageScanner from '@/components/ArbitrageScanner';
import OrderBook from '@/components/OrderBook';

export default function BitcoinPage() {
    return (
        <main className="min-h-screen bg-background text-foreground p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Dashboard
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Bitcoin className="h-8 w-8 text-primary" />
                                Bitcoin Analysis
                            </h1>
                            <p className="text-muted-foreground">Live order book and arbitrage opportunities</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <ArbitrageScanner />
                    <OrderBook />
                </div>
            </div>
        </main>
    );
}
