import ArbitrageScanner from '@/components/ArbitrageScanner';
import OrderBook from '@/components/OrderBook';

export default function BitcoinPage() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="container mx-auto py-6 space-y-6">
                <ArbitrageScanner />
                <OrderBook />
            </div>
        </main>
    );
}
