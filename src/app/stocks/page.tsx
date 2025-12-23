'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Brush } from 'recharts';
import { Search, TrendingUp, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { getHistoricalData, StockDataPoint } from '@/app/actions/stock-data';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subMonths, subYears } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

export default function StocksPage() {
    const [symbol, setSymbol] = useState('');
    const [data, setData] = useState<StockDataPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchedSymbol, setSearchedSymbol] = useState('');

    // Date range state
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subMonths(new Date(), 1),
        to: new Date(),
    });

    const handleSearch = async () => {
        if (!symbol) return;
        if (!dateRange?.from || !dateRange?.to) {
            setError('Please select a valid date range');
            return;
        }

        setLoading(true);
        setError('');
        setSearchedSymbol(symbol.toUpperCase());

        try {
            const result = await getHistoricalData(symbol, dateRange.from, dateRange.to);
            if (result.success && result.data) {
                setData(result.data);
            } else {
                setError(result.error || 'Failed to fetch data');
                setData([]);
            }
        } catch (err) {
            setError('An unexpected error occurred');
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const setPresetRange = (months: number) => {
        const to = new Date();
        const from = subMonths(to, months);
        setDateRange({ from, to });
        if (searchedSymbol) {
            fetchDataForSymbol(searchedSymbol, from, to);
        }
    };

    const setYearRange = (years: number) => {
        const to = new Date();
        const from = subYears(to, years);
        setDateRange({ from, to });
        if (searchedSymbol) {
            fetchDataForSymbol(searchedSymbol, from, to);
        }
    };

    const fetchDataForSymbol = async (sym: string, from: Date, to: Date) => {
        setLoading(true);
        setError('');
        try {
            const result = await getHistoricalData(sym, from, to);
            if (result.success && result.data) {
                setData(result.data);
            } else {
                setError(result.error || 'Failed to fetch data');
                setData([]);
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }

    const handleDownloadCSV = () => {
        if (!data.length) return;

        const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                row.date,
                row.open,
                row.high,
                row.low,
                row.close,
                row.volume
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const rangeStr = dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, 'yyyyMMdd')}-${format(dateRange.to, 'yyyyMMdd')}`
                : 'data';
            link.setAttribute('download', `${searchedSymbol}_${rangeStr}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="min-h-screen bg-background p-8">
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
                                <TrendingUp className="h-8 w-8 text-primary" />
                                Stock Analysis
                            </h1>
                            <p className="text-muted-foreground">Historical price data visualization</p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Search Stock</CardTitle>
                        <CardDescription>Enter a stock symbol and select a date range</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex gap-4 flex-col sm:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Symbol (e.g., AAPL)..."
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="pl-9"
                                />
                            </div>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn(
                                            "w-[300px] justify-start text-left font-normal",
                                            !dateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                                    {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                        captionLayout="dropdown"
                                        fromYear={2000}
                                        toYear={new Date().getFullYear()}
                                    />
                                </PopoverContent>
                            </Popover>

                            <Button onClick={handleSearch} disabled={loading}>
                                {loading ? 'Loading...' : 'Search'}
                            </Button>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => setPresetRange(1)}>1 Month</Button>
                            <Button variant="outline" size="sm" onClick={() => setPresetRange(3)}>3 Months</Button>
                            <Button variant="outline" size="sm" onClick={() => setPresetRange(6)}>6 Months</Button>
                            <Button variant="outline" size="sm" onClick={() => setYearRange(1)}>1 Year</Button>
                            <Button variant="outline" size="sm" onClick={() => setYearRange(5)}>5 Years</Button>
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                        {error}
                    </div>
                )}

                {data.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{searchedSymbol} - Price History</CardTitle>
                                    <CardDescription>
                                        {dateRange?.from && dateRange?.to && (
                                            `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                                        )}
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
                                    <ArrowLeft className="mr-2 h-4 w-4 rotate-[-90deg]" />
                                    Download CSV
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[500px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" strokeOpacity={0.2} />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 12, fill: '#888' }}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(value) => {
                                                    const date = new Date(value);
                                                    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                                }}
                                            />
                                            <YAxis
                                                domain={['auto', 'auto']}
                                                tick={{ fontSize: 12, fill: '#888' }}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(value) => `$${value.toFixed(0)}`}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#ccc', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                                itemStyle={{ color: '#333' }}
                                                formatter={(value: number | undefined) => [value ? `$${value.toFixed(2)}` : 'N/A', 'Close Price']}
                                                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="close"
                                                stroke="#8884d8"
                                                fillOpacity={1}
                                                fill="url(#colorPrice)"
                                                strokeWidth={3}
                                                activeDot={{ r: 6 }}
                                            />
                                            <Brush dataKey="date" height={30} stroke="#8884d8" fill="#f5f5f5" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
