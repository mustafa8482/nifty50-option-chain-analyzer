
const API_BASE_URL = "http://127.0.0.1:8000";

let chart = null;
let rsiChart = null;

let candlestickSeries = null;

let ema20Series = null;
let ema50Series = null;
let ema200Series = null;

let rsiSeries = null;

let currentInterval = "5";

let syncingMain = false;
let syncingRSI = false;

let macdChart = null;

let macdLineSeries = null;
let signalLineSeries = null;
let macdHistogramSeries = null;

// ========================================
// EMA CALCULATION
// ========================================

function calculateEMA(candles, period) {

    if (!candles || candles.length < period) {
        return [];
    }

    const multiplier = 2 / (period + 1);

    const emaData = [];

    let sum = 0;

    for (let i = 0; i < period; i++) {
        sum += candles[i].close;
    }

    let previousEMA = sum / period;

    emaData.push({
        time: candles[period - 1].time,
        value: previousEMA
    });

    for (let i = period; i < candles.length; i++) {

        const currentClose = candles[i].close;

        const currentEMA =
            (currentClose - previousEMA) *
            multiplier +
            previousEMA;

        previousEMA = currentEMA;

        emaData.push({
            time: candles[i].time,
            value: currentEMA
        });
    }

    return emaData;
}


// ========================================
// RSI 14 CALCULATION
// ========================================

function calculateRSI(candles, period = 14) {

    if (!candles || candles.length <= period) {
        return [];
    }

    const rsiData = [];

    let gains = 0;
    let losses = 0;


    // First period
    for (let i = 1; i <= period; i++) {

        const change =
            candles[i].close -
            candles[i - 1].close;

        if (change > 0) {
            gains += change;
        } else {
            losses += Math.abs(change);
        }
    }


    let averageGain = gains / period;
    let averageLoss = losses / period;


    function getRSI() {

        if (averageLoss === 0) {
            return 100;
        }

        const rs =
            averageGain / averageLoss;

        return 100 - (100 / (1 + rs));
    }


    rsiData.push({
        time: candles[period].time,
        value: getRSI()
    });


    // Remaining candles
    for (
        let i = period + 1;
        i < candles.length;
        i++
    ) {

        const change =
            candles[i].close -
            candles[i - 1].close;


        const gain =
            change > 0
                ? change
                : 0;


        const loss =
            change < 0
                ? Math.abs(change)
                : 0;


        // Wilder smoothing
        averageGain =
            (
                averageGain * (period - 1) +
                gain
            ) / period;


        averageLoss =
            (
                averageLoss * (period - 1) +
                loss
            ) / period;


        rsiData.push({
            time: candles[i].time,
            value: getRSI()
        });
    }


    return rsiData;
}

// ========================================
// MACD CALCULATION
// ========================================

function calculateMACD(candles) {

    if (!candles || candles.length < 35) {
        return {
            macd: [],
            signal: [],
            histogram: []
        };
    }


    // Helper EMA
    function ema(values, period) {

        if (values.length < period) {
            return [];
        }

        const multiplier =
            2 / (period + 1);

        const result = [];

        let sum = 0;

        for (let i = 0; i < period; i++) {
            sum += values[i];
        }

        let previousEMA =
            sum / period;

        result.push(previousEMA);

        for (
            let i = period;
            i < values.length;
            i++
        ) {

            const currentEMA =
                (
                    values[i] -
                    previousEMA
                ) *
                multiplier +
                previousEMA;

            previousEMA =
                currentEMA;

            result.push(
                currentEMA
            );
        }

        return result;
    }


    const closes =
        candles.map(
            candle => candle.close
        );


    // EMA 12
    const ema12 =
        ema(closes, 12);


    // EMA 26
    const ema26 =
        ema(closes, 26);


    const macdData = [];


    // Align EMA 12 with EMA 26
    for (
        let i = 25;
        i < candles.length;
        i++
    ) {

        const ema12Index =
            i - 11;

        const ema26Index =
            i - 25;


        if (
            ema12[ema12Index] === undefined ||
            ema26[ema26Index] === undefined
        ) {
            continue;
        }


        const macdValue =
            ema12[ema12Index] -
            ema26[ema26Index];


        macdData.push({

            time:
                candles[i].time,

            value:
                macdValue

        });
    }


    // Signal = EMA 9 of MACD
    const macdValues =
        macdData.map(
            item => item.value
        );


    const signalValues =
        ema(
            macdValues,
            9
        );


    const signalData = [];


    for (
        let i = 8;
        i < macdData.length;
        i++
    ) {

        const signalIndex =
            i - 8;


        const signalValue =
            signalValues[
                signalIndex
            ];


        if (
            signalValue === undefined
        ) {
            continue;
        }


        signalData.push({

            time:
                macdData[i].time,

            value:
                signalValue

        });
    }


    // Histogram
    const histogramData = [];


    for (
        let i = 0;
        i < signalData.length;
        i++
    ) {

        const signal =
            signalData[i];


        const macd =
            macdData.find(
                item =>
                    item.time ===
                    signal.time
            );


        if (!macd) {
            continue;
        }


        histogramData.push({

            time:
                signal.time,

            value:
                macd.value -
                signal.value

        });
    }


    return {

        macd: macdData,

        signal: signalData,

        histogram: histogramData
    };
}

// ========================================
// SUPPORT / RESISTANCE
// ========================================

function calculateSupportResistance(candles) {

    if (!candles || candles.length < 20) {
        return {
            support: null,
            resistance: null
        };
    }

    // Last 50 candles (or available candles)
    const recentCandles =
        candles.slice(-50);

    const lows =
        recentCandles.map(
            candle => candle.low
        );

    const highs =
        recentCandles.map(
            candle => candle.high
        );

    const support =
        Math.min(...lows);

    const resistance =
        Math.max(...highs);

    return {
        support,
        resistance
    };
}

// ========================================
// TREND CLASSIFICATION
// ========================================

function calculateTrend(candles) {

    if (!candles || candles.length < 200) {
        return {
            trend: "Insufficient Data",
            reason: "At least 200 candles are required."
        };
    }

    const ema20Data = calculateEMA(candles, 20);
    const ema50Data = calculateEMA(candles, 50);
    const ema200Data = calculateEMA(candles, 200);

    const rsiData = calculateRSI(candles, 14);
    const macdData = calculateMACD(candles);

    if (
        !ema20Data.length ||
        !ema50Data.length ||
        !ema200Data.length ||
        !rsiData.length ||
        !macdData.macd.length
    ) {
        return {
            trend: "Insufficient Data",
            reason: "Technical indicators are not ready."
        };
    }

    const price =
        candles[candles.length - 1].close;

    const ema20 =
        ema20Data[ema20Data.length - 1].value;

    const ema50 =
        ema50Data[ema50Data.length - 1].value;

    const ema200 =
        ema200Data[ema200Data.length - 1].value;

    const rsi =
        rsiData[rsiData.length - 1].value;

    const macd =
        macdData.macd[
            macdData.macd.length - 1
        ].value;

    const signal =
        macdData.signal[
            macdData.signal.length - 1
        ]?.value;


    let bullishScore = 0;
    let bearishScore = 0;

    const reasons = [];


    // ====================================
    // EMA CONDITIONS
    // ====================================

    if (
        price > ema20 &&
        ema20 > ema50 &&
        ema50 > ema200
    ) {

        bullishScore += 2;

        reasons.push(
            "Price and EMA structure are bullish."
        );

    } else if (
        price < ema20 &&
        ema20 < ema50 &&
        ema50 < ema200
    ) {

        bearishScore += 2;

        reasons.push(
            "Price and EMA structure are bearish."
        );

    } else {

        reasons.push(
            "EMA structure is mixed."
        );
    }


    // ====================================
    // RSI
    // ====================================

    if (rsi >= 55 && rsi < 70) {

        bullishScore += 1;

        reasons.push(
            `RSI ${rsi.toFixed(1)} shows positive momentum.`
        );

    } else if (rsi <= 45 && rsi > 30) {

        bearishScore += 1;

        reasons.push(
            `RSI ${rsi.toFixed(1)} shows weak momentum.`
        );

    } else {

        reasons.push(
            `RSI ${rsi.toFixed(1)} is not giving a strong directional confirmation.`
        );
    }


    // ====================================
    // MACD
    // ====================================

    if (
        signal !== undefined &&
        macd > signal &&
        macd > 0
    ) {

        bullishScore += 1;

        reasons.push(
            "MACD is positive and above its signal line."
        );

    } else if (
        signal !== undefined &&
        macd < signal &&
        macd < 0
    ) {

        bearishScore += 1;

        reasons.push(
            "MACD is negative and below its signal line."
        );

    } else {

        reasons.push(
            "MACD confirmation is mixed."
        );
    }


    // ====================================
    // FINAL TREND
    // ====================================

    let trend = "Sideways";

    if (
        bullishScore >= 3 &&
        bullishScore > bearishScore
    ) {

        trend = "Bullish";

    } else if (
        bearishScore >= 3 &&
        bearishScore > bullishScore
    ) {

        trend = "Bearish";
    }


    return {

        trend,

        reason:
            reasons.join(" ")

    };
}

// ========================================
// CREATE MAIN CHART
// ========================================

function createChart() {

    const chartContainer =
        document.getElementById("chartArea");


    if (!chartContainer) {

        console.error(
            "Chart container #chartArea not found"
        );

        return;
    }


    chart =
        LightweightCharts.createChart(
            chartContainer,
            {
                width:
                    chartContainer.clientWidth,

                height:
                    chartContainer.clientHeight ||
                    600,

                layout: {
                    background: {
                        color: "#111827"
                    },

                    textColor: "#94a3b8"
                },

                grid: {
                    vertLines: {
                        color: "#1e293b"
                    },

                    horzLines: {
                        color: "#1e293b"
                    }
                },

                crosshair: {
                    mode:
                        LightweightCharts
                            .CrosshairMode
                            .Normal
                },

                rightPriceScale: {
                    borderColor: "#334155"
                },

                localization: {
    timeFormatter: (time) => {
        const date = new Date(time * 1000);

        return date.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }
},

                timeScale: {
    borderColor: "#334155",
    timeVisible: true,
    secondsVisible: false,

    tickMarkFormatter: (time) => {
        const date = new Date(time * 1000);

        return date.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }
}
            }
        );


    // ====================================
    // CANDLESTICKS
    // ====================================

    candlestickSeries =
        chart.addSeries(
            LightweightCharts.CandlestickSeries
        );


    // ====================================
    // EMA 20
    // ====================================

    ema20Series =
        chart.addSeries(
            LightweightCharts.LineSeries,
            {
                color: "#f59e0b",
                lineWidth: 2
            }
        );


    // ====================================
    // EMA 50
    // ====================================

    ema50Series =
        chart.addSeries(
            LightweightCharts.LineSeries,
            {
                color: "#3b82f6",
                lineWidth: 2
            }
        );


    // ====================================
    // EMA 200
    // ====================================

    ema200Series =
        chart.addSeries(
            LightweightCharts.LineSeries,
            {
                color: "#ef4444",
                lineWidth: 2
            }
        );


    // ====================================
    // RESPONSIVE
    // ====================================

    window.addEventListener(
        "resize",
        () => {

            if (!chart) {
                return;
            }

            chart.applyOptions({

                width:
                    chartContainer.clientWidth,

                height:
                    chartContainer.clientHeight ||
                    600
            });

        }
    );
}


// ========================================
// CREATE RSI CHART
// ========================================

function createRSIChart() {

    const rsiContainer =
        document.getElementById("rsiArea");


    if (!rsiContainer) {

        console.error(
            "RSI container #rsiArea not found"
        );

        return;
    }


    rsiChart =
        LightweightCharts.createChart(
            rsiContainer,
            {
                width:
                    rsiContainer.clientWidth,

                height: 180,

                layout: {
                    background: {
                        color: "#111827"
                    },

                    textColor: "#94a3b8"
                },

                grid: {
                    vertLines: {
                        color: "#1e293b"
                    },

                    horzLines: {
                        color: "#1e293b"
                    }
                },

                rightPriceScale: {
                    borderColor: "#334155",

                    scaleMargins: {
                        top: 0.10,

                        bottom: 0.10
                    }
                },

                localization: {
                    timeFormatter: (time) => {
                        const date = new Date(time * 1000);

                        return date.toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false
                        });

                    }
                }, 

                timeScale: {
                    borderColor: "#334155",

                    timeVisible: true,

                    secondsVisible: false,
                    tickMarkFormatter: (time) => {
        const date = new Date(time * 1000);

        return date.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }
                }
            }
        );


    // ====================================
    // RSI LINE
    // ====================================

    rsiSeries =
        rsiChart.addSeries(
            LightweightCharts.LineSeries,
            {
                color: "#a855f7",

                lineWidth: 2,

                priceFormat: {
                    type: "price",

                    precision: 2,

                    minMove: 0.01
                }
            }
        );


    // ====================================
    // RSI 70
    // ====================================

    rsiSeries.createPriceLine({

        price: 70,

        color: "#ef4444",

        lineWidth: 1,

        lineStyle:
            LightweightCharts
                .LineStyle
                .Dashed,

        axisLabelVisible: true,

        title: "70"
    });


    // ====================================
    // RSI 50
    // ====================================

    rsiSeries.createPriceLine({

        price: 50,

        color: "#64748b",

        lineWidth: 1,

        lineStyle:
            LightweightCharts
                .LineStyle
                .Dotted,

        axisLabelVisible: true,

        title: "50"
    });


    // ====================================
    // RSI 30
    // ====================================

    rsiSeries.createPriceLine({

        price: 30,

        color: "#22c55e",

        lineWidth: 1,

        lineStyle:
            LightweightCharts
                .LineStyle
                .Dashed,

        axisLabelVisible: true,

        title: "30"
    });


    // ====================================
    // RESPONSIVE
    // ====================================

    window.addEventListener(
        "resize",
        () => {

            if (!rsiChart) {
                return;
            }

            rsiChart.applyOptions({

                width:
                    rsiContainer.clientWidth,

                height: 180
            });

        }
    );
}

// ========================================
// CREATE MACD CHART
// ========================================

function createMACDChart() {

    const container =
        document.getElementById(
            "macdArea"
        );


    if (!container) {

        console.error(
            "MACD container not found"
        );

        return;
    }


    macdChart =
        LightweightCharts.createChart(
            container,
            {
                width:
                    container.clientWidth,

                height: 180,

                layout: {
                    background: {
                        color: "#111827"
                    },

                    textColor: "#94a3b8"
                },

                grid: {
                    vertLines: {
                        color: "#1e293b"
                    },

                    horzLines: {
                        color: "#1e293b"
                    }
                },

                rightPriceScale: {
                    borderColor:
                        "#334155"
                },

                localization: {
                    timeFormatter: (time) => {
                        const date = new Date(time * 1000);

                        return date.toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false
                        });

                    }
                },

                timeScale: {
                    borderColor:
                        "#334155",

                    timeVisible: true,

                    secondsVisible: false,
                    tickMarkFormatter: (time) => {
                        const date = new Date(time * 1000);

                        return date.toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false
                        });
                    }
                }
            }
        );


    // MACD line
    macdLineSeries =
        macdChart.addSeries(
            LightweightCharts.LineSeries,
            {
                color: "#38bdf8",

                lineWidth: 2
            }
        );


    // Signal line
    signalLineSeries =
        macdChart.addSeries(
            LightweightCharts.LineSeries,
            {
                color: "#f59e0b",

                lineWidth: 2
            }
        );


    // Histogram
    macdHistogramSeries =
        macdChart.addSeries(
            LightweightCharts.HistogramSeries,
            {
                base: 0,

                priceFormat: {
                    type: "price",

                    precision: 2,

                    minMove: 0.01
                }
            }
        );


    // Zero line
    macdLineSeries.createPriceLine({

        price: 0,

        color: "#64748b",

        lineWidth: 1,

        lineStyle:
            LightweightCharts
                .LineStyle
                .Dotted,

        axisLabelVisible: true,

        title: "0"
    });


    // Responsive
    window.addEventListener(
        "resize",
        () => {

            if (!macdChart) {
                return;
            }

            macdChart.applyOptions({

                width:
                    container.clientWidth,

                height: 180
            });
        }
    );
}


// ========================================
// SYNCHRONIZE CHARTS
// ========================================

function synchronizeCharts() {

    if (!chart || !rsiChart) {
        return;
    }


    // ====================================
    // MAIN → RSI
    // ====================================

    chart.timeScale()
        .subscribeVisibleLogicalRangeChange(
            range => {

                if (
                    syncingRSI ||
                    !range
                ) {
                    return;
                }

                syncingMain = true;

                try {

                    rsiChart
                        .timeScale()
                        .setVisibleLogicalRange(
                            range
                        );

                } catch (error) {

                    console.warn(
                        "RSI sync:",
                        error
                    );

                }

                syncingMain = false;
            }
        );


    // ====================================
    // RSI → MAIN
    // ====================================

    rsiChart.timeScale()
        .subscribeVisibleLogicalRangeChange(
            range => {

                if (
                    syncingMain ||
                    !range
                ) {
                    return;
                }

                syncingRSI = true;

                try {

                    chart
                        .timeScale()
                        .setVisibleLogicalRange(
                            range
                        );

                } catch (error) {

                    console.warn(
                        "Main chart sync:",
                        error
                    );

                }

                syncingRSI = false;
            }
        );
}


// ========================================
// LOAD NIFTY DATA
// ========================================

async function loadNiftyData(
    interval = "5"
) {

    currentInterval = interval;


    const marketStatus =
        document.getElementById(
            "marketStatus"
        );


    const marketData =
        document.getElementById(
            "marketData"
        );


    const niftyPrice =
        document.getElementById(
            "niftyPrice"
        );


    const chartInfo =
        document.getElementById(
            "chartInfo"
        );


    if (marketStatus) {

        marketStatus.textContent =
            "Updating market data...";
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/nifty/candles?interval=${interval}&_=${Date.now()}`
            );


        if (!response.ok) {

            throw new Error(
                `API request failed: ${response.status}`
            );
        }


        const data =
            await response.json();


        if (
            !data.candles ||
            data.candles.length === 0
        ) {

            if (marketStatus) {

                marketStatus.textContent =
                    "No market data available";
            }

            return;
        }


        if (marketStatus) {

            marketStatus.textContent =
                `Live data • ${data.count} candles`;
        }


        // ====================================
        // TIMEFRAME
        // ====================================

        const timeframeNames = {

            "5": "5 Minute",

            "15": "15 Minute",

            "30": "30 Minute",

            "60": "1 Hour",

            "240": "4 Hour",

            "day": "1 Day"

        };


        if (chartInfo) {

            chartInfo.textContent =
                timeframeNames[interval]
                || interval;
        }


        // ====================================
        // CONVERT API DATA
        // ====================================

        const chartData =
            data.candles
                .map(candle => {

                    return {

                        time:
                            Math.floor(new Date(candle[0]).getTime() / 1000
                            ),

                        open:
                            Number(candle[1]),

                        high:
                            Number(candle[2]),

                        low:
                            Number(candle[3]),

                        close:
                            Number(candle[4])
                    };
                })
                .filter(candle =>
                    Number.isFinite(
                        candle.open
                    ) &&
                    Number.isFinite(
                        candle.high
                    ) &&
                    Number.isFinite(
                        candle.low
                    ) &&
                    Number.isFinite(
                        candle.close
                    )
                )
                .sort(
                    (a, b) =>
                        a.time - b.time
                );


        // ====================================
        // REMOVE DUPLICATES
        // ====================================

        const uniqueData = [];

        const seen =
            new Set();


        for (
            const candle
            of chartData
        ) {

            if (
                !seen.has(
                    candle.time
                )
            ) {

                seen.add(
                    candle.time
                );

                uniqueData.push(
                    candle
                );
            }
        }


        if (uniqueData.length === 0) {
            return;
        }

// ========================================
// PRESERVE CHART ZOOM
// ========================================

let savedChartRange = null;

if (chart && chart.timeScale()) {
    savedChartRange =
        chart.timeScale().getVisibleLogicalRange();
}

// ========================================
// MAIN CANDLESTICKS
// ========================================

if (candlestickSeries) {
    candlestickSeries.setData(
        uniqueData
    );
}

// Restore previous zoom/position
if (
    savedChartRange &&
    chart &&
    chart.timeScale()
) {
    chart.timeScale().setVisibleLogicalRange(
        savedChartRange
    );
}


        // ====================================
        // EMA 20
        // ====================================

        if (ema20Series) {

            ema20Series.setData(
                calculateEMA(
                    uniqueData,
                    20
                )
            );
        }


        // ====================================
        // EMA 50
        // ====================================

        if (ema50Series) {

            ema50Series.setData(
                calculateEMA(
                    uniqueData,
                    50
                )
            );
        }


        // ====================================
        // EMA 200
        // ====================================

        if (ema200Series) {

            ema200Series.setData(
                calculateEMA(
                    uniqueData,
                    200
                )
            );
        }


        // ====================================
        // RSI
        // ====================================

        const rsiData =
            calculateRSI(
                uniqueData,
                14
            );


        if (rsiSeries) {

            rsiSeries.setData(
                rsiData
            );
        }

        // ====================================
// MACD
// ====================================

const macdData =
    calculateMACD(
        uniqueData
    );


if (macdLineSeries) {

    macdLineSeries.setData(
        macdData.macd
    );
}


if (signalLineSeries) {

    signalLineSeries.setData(
        macdData.signal
    );
}


if (macdHistogramSeries) {

    macdHistogramSeries.setData(
        macdData.histogram
    );
}


        // ====================================
        // LATEST PRICE
        // ====================================

        const latestCandle =
            uniqueData[
                uniqueData.length - 1
            ];


        const levels =
        calculateSupportResistance(
            uniqueData
        );
        

        const supportElement =
        document.getElementById(
            "supportValue"
        );


        const resistanceElement =
        document.getElementById(
            "resistanceValue"
        );


        if (
            supportElement &&
            levels.support !== null
        ) 
        
        {
        supportElement.textContent =
        levels.support.toFixed(2);
        }


        if (
         resistanceElement &&
         levels.resistance !== null
             ) {

         resistanceElement.textContent =
             levels.resistance.toFixed(2);
             }

        const trendData =
    calculateTrend(
        uniqueData
    );


const trendElement =
    document.getElementById(
        "trendValue"
    );


const trendReasonElement =
    document.getElementById(
        "trendReason"
    );


if (trendElement) {

    trendElement.textContent =
        trendData.trend;
}


if (trendReasonElement) {

    trendReasonElement.textContent =
        trendData.reason;
}


        if (niftyPrice) {

            niftyPrice.textContent =
                latestCandle.close.toFixed(2);
        }


        // ====================================
        // FIT MAIN CHART
        // ====================================

        if (chart) {

            chart
                .timeScale()
                .fitContent();
        }


        // ====================================
        // FIT RSI
        // ====================================

        if (rsiChart) {

            rsiChart
                .timeScale()
                .fitContent();
        }
        
        // ====================================
        // FIT MACD
        // ====================================

        if (macdChart) {

    macdChart
        .timeScale()
        .fitContent();
}


        // ====================================
        // RAW DATA
        // ====================================

        if (marketData) {

            marketData.textContent =
                JSON.stringify(
                    data,
                    null,
                    2
                );
        }


    } catch (error) {

        console.error(
            "Market data error:",
            error
        );


        if (marketStatus) {

            marketStatus.textContent =
                "Market data update failed";
        }


        if (marketData) {

            marketData.textContent =
                error.message;
        }
    }
}


// ========================================
// TIMEFRAME BUTTONS
// ========================================

function setupTimeframeButtons() {

    const buttons =
        document.querySelectorAll(
            ".timeframes button"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const interval =
                    button.dataset.interval;


                buttons.forEach(btn => {

                    btn.classList.remove(
                        "active"
                    );

                });


                button.classList.add(
                    "active"
                );


                loadNiftyData(
                    interval
                );
            }
        );
    });
}


// ========================================
// START APPLICATION
// ========================================

function initializeApp() {

    createChart();

    createRSIChart();

    createMACDChart();

    setupTimeframeButtons();


    const defaultButton =
        document.querySelector(
            '.timeframes button[data-interval="5"]'
        );


    if (defaultButton) {

        defaultButton.classList.add(
            "active"
        );
    }


    loadNiftyData("5");


    // Auto refresh every 30 seconds

    setInterval(
        () => {

            loadNiftyData(
                currentInterval
            );

        },
        30000
    );
}


// ========================================
// START
// ========================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();
}

// ========================================
// LIVE NIFTY OPTION CHAIN
// ========================================

async function loadOptionChain() {

    const tableBody =
        document.getElementById("optionChainBody");

    const info =
        document.getElementById("optionChainInfo");

    if (!tableBody) {
        return;
    }

    try {

        const response = await fetch(
            "/api/nifty/option-chain-live"
        );

        if (!response.ok) {
            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const result =
            await response.json();

        if (
            result.status !== "success" ||
            !result.data
        ) {
            throw new Error(
                result.message ||
                "Option chain data unavailable"
            );
        }

        const data = result.data;

        const setupDirection = data.market_scenario || "NEUTRAL";

        let setupInstrument = "WAIT";

        if (setupDirection === "BULLISH") { 
            setupInstrument = "CE";
        }
        else if (setupDirection === "BEARISH") {
            setupInstrument = "PE";
        } else {
            setupInstrument = "WAIT";
        }

const setupStrike = data.atm || "-";

const setupDirectionEl =
    document.getElementById("setupDirection");

const setupInstrumentEl =
    document.getElementById("setupInstrument");

const setupStrikeEl =
    document.getElementById("setupStrike");

const setupStatusEl =
    document.getElementById("setupStatus");

if (setupDirectionEl) {
    setupDirectionEl.textContent = setupDirection;
}

if (setupInstrumentEl) {
    setupInstrumentEl.textContent = setupInstrument;
}

if (setupStrikeEl) {
    setupStrikeEl.textContent =
        setupStrike !== "-"
            ? Number(setupStrike).toLocaleString("en-IN")
            : "-";
}

if (setupStatusEl) {
    setupStatusEl.textContent = setupDirection;
}

// ========================================
// STEP 47E - INVALID DATA PROTECTION
// ========================================

let setupEntry = null;
let setupStopLoss = null;

if (
    setupDirection === "BULLISH" ||
    setupDirection === "BEARISH"
) {
    const atmRow = data.chain?.find(
        row => Number(row.strike) === Number(data.atm)
    );

    if (atmRow) {

        let optionLtp = null;

        if (setupDirection === "BULLISH") {
            optionLtp = Number(atmRow?.ce?.ltp);
        } else {
            optionLtp = Number(atmRow?.pe?.ltp);
        }

        if (Number.isFinite(optionLtp) && optionLtp > 0) {
            setupEntry = optionLtp;
            setupStopLoss = optionLtp * 0.90;
        }
    }
}

// ========================================
// STEP 46F - TARGET 1 + TARGET 2
// ========================================

let setupTarget1 = null;
let setupTarget2 = null;

if (setupEntry !== null && setupStopLoss !== null) {
    const risk = setupEntry - setupStopLoss;

    setupTarget1 = setupEntry + risk;
    setupTarget2 = setupEntry + (risk * 2);
}

const setupTarget1El =
    document.getElementById("setupTarget1");

const setupTarget2El =
    document.getElementById("setupTarget2");

if (setupTarget1El) {
    setupTarget1El.textContent =
        setupTarget1 !== null
            ? `₹${setupTarget1.toFixed(2)}`
            : "-";
}

let setupRiskReward = null;

if (
    setupEntry !== null &&
    setupStopLoss !== null &&
    setupTarget2 !== null
) {
    const risk = setupEntry - setupStopLoss;
    const reward = setupTarget2 - setupEntry;

    if (risk > 0) {
        setupRiskReward = reward / risk;
    }
}

const setupRiskRewardEl =
    document.getElementById("setupRiskReward");

if (setupRiskRewardEl) {
    setupRiskRewardEl.textContent =
        setupRiskReward !== null
            ? `1 : ${setupRiskReward.toFixed(2)}`
            : "-";
}

if (setupTarget2El) {
    setupTarget2El.textContent =
        setupTarget2 !== null
            ? `₹${setupTarget2.toFixed(2)}`
            : "-";
}

// Update Entry & Stop Loss after calculation

const setupEntryEl =
    document.getElementById("setupEntry");

const setupStopLossEl =
    document.getElementById("setupStopLoss");

if (setupEntryEl) {
    setupEntryEl.textContent =
        setupEntry !== null
            ? `₹${setupEntry.toFixed(2)}`
            : "-";
}

if (setupStopLossEl) {
    setupStopLossEl.textContent =
        setupStopLoss !== null
            ? `₹${setupStopLoss.toFixed(2)}`
            : "-";
}

const setupReasonEl =
    document.getElementById("setupReason");

if (setupReasonEl) {
    const reasons = data.scenario_reasons || [];

    if (reasons.length > 0) {
        setupReasonEl.innerHTML = reasons
            .map(reason => `<div class="reason-item">• ${reason}</div>`)
            .join("");
    } else {
        setupReasonEl.textContent =
            "No strong confirmation available.";
    }
}

// ========================================
// STEP 47A - SETUP STATUS STYLE
// ========================================

if (setupStatusEl) {
    setupStatusEl.classList.remove(
        "setup-bullish",
        "setup-bearish",
        "setup-neutral"
    );

    if (setupDirection === "BULLISH") {
        setupStatusEl.classList.add("setup-bullish");
    } else if (setupDirection === "BEARISH") {
        setupStatusEl.classList.add("setup-bearish");
    } else {
        setupStatusEl.classList.add("setup-neutral");
    }
}
 

// ========================================
// MAX PAIN
// ========================================

const maxPainElement =
    document.getElementById("maxPainValue");

if (maxPainElement) {
    maxPainElement.textContent =
        data.max_pain ?? "--";
}


// ========================================
// OI ANALYSIS CARDS
// ========================================
        
        const totalCeOi =
            document.getElementById("totalCeOi");
        
        const totalPeOi =
            document.getElementById("totalPeOi");
        
        const pcrValue =
            document.getElementById("pcrValue");
        
        if (totalCeOi) {
            totalCeOi.textContent =
                formatOi(data.total_ce_oi);
        }
        
        if (totalPeOi) {
            totalPeOi.textContent =
                formatOi(data.total_pe_oi);
        }
        
        if (pcrValue) {
            pcrValue.textContent =
                Number(data.pcr || 0).toFixed(2);
        }        

        const chain =
            data.chain || [];

        if (info) {

            info.textContent =
                `Expiry: ${data.expiry} | ` +
                `Spot: ${formatNumber(data.spot)} | ` +
                `ATM: ${formatNumber(data.atm)}`;
        }

        if (chain.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        No option chain data available.
                    </td>
                </tr>
            `;

            return;
        }

        tableBody.innerHTML = "";

        chain.forEach(row => {

            const ce = row.ce;
            const pe = row.pe;

            const tr =
                document.createElement("tr");
            
            const atm = Number(data.atm);
            const strike = Number(row.strike);

            const ceClass =
                strike === atm
                    ? "atm-option"
                    : strike < atm
                        ? "itm-option"
                        : "otm-option";

            const peClass =
                strike === atm
                    ? "atm-option"
                    : strike > atm
                        ? "itm-option"
                        : "otm-option";

            if (
                Number(row.strike) ===
                Number(data.atm)
            ) {

                tr.classList.add(
                    "atm-row"
                );
            }

            tr.innerHTML = `

                <!-- CE LTP -->
                <td class="${ceClass}">
    ${formatNumber(ce?.ltp)}
    ${
        ceClass === "itm-option"
            ? '<span class="option-badge itm-badge">ITM</span>'
            : ceClass === "otm-option"
                ? '<span class="option-badge otm-badge">OTM</span>'
                : ''
    }
</td>

                <!-- CE OI -->
                <td>
                    ${formatNumber(
                        ce?.oi
                    )}
                </td>

                <!-- CE CHANGE OI -->
                <td class="${
                    Number(ce?.change_oi || 0) > 0
                        ? "change-oi-positive"
                        : Number(ce?.change_oi || 0) < 0
                            ? "change-oi-negative"
                            : ""
                }">
                    ${formatChangeOI(
                        ce?.change_oi
                    )}
                </td>

                <!-- CE VOLUME -->
                <td>
                    ${formatNumber(
                        ce?.volume
                    )}
                </td>

                <!-- STRIKE -->
                <td class="strike-cell">

                    ${formatNumber(
                        row.strike
                    )}

                    ${
                        Number(row.strike) ===
                        Number(data.atm)
                            ? '<span class="atm-badge">ATM</span>'
                            : ''
                    }

                </td>

                <!-- PE LTP -->
                <td class="${peClass}">
    ${formatNumber(pe?.oi)}
    ${
        peClass === "itm-option"
            ? '<span class="option-badge itm-badge">ITM</span>'
            : peClass === "otm-option"
                ? '<span class="option-badge otm-badge">OTM</span>'
                : ''
    }
</td>

                <!-- PE OI -->
                <td>
                    ${formatNumber(
                        pe?.oi
                    )}
                </td>

                <!-- PE CHANGE OI -->
                <td class="${
                    Number(pe?.change_oi || 0) > 0
                        ? "change-oi-positive"
                        : Number(pe?.change_oi || 0) < 0
                            ? "change-oi-negative"
                            : ""
                }">
                    ${formatChangeOI(
                        pe?.change_oi
                    )}
                </td>

                <!-- PE VOLUME -->
                <td>
                    ${formatNumber(
                        pe?.volume
                    )}
                </td>

            `;

            tableBody.appendChild(tr);

        });

    } catch (error) {

        console.error(
            "Option Chain Error:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    Failed to load option chain
                </td>
            </tr>
        `;
    }
}

// ========================================
// NUMBER FORMATTER
// ========================================

function formatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    const number =
        Number(value);

    if (Number.isNaN(number)) {
        return "-";
    }

    return number.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );
}

function formatChangeOI(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    const number =
        Number(value);

    if (Number.isNaN(number)) {
        return "-";
    }

    if (number > 0) {
        return "+" +
            number.toLocaleString("en-IN", {
                maximumFractionDigits: 0
            });
    }

    return number.toLocaleString("en-IN", {
        maximumFractionDigits: 0
    });
}


// ========================================
// LOAD OPTION CHAIN
// ========================================

loadOptionChain();


// Refresh every 10 seconds
setInterval(
    loadOptionChain,
    3000
);

console.log("OPTION CHAIN SCRIPT LOADED");

loadOptionChain();

function formatOi(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "--";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return "--";
    }

    if (number >= 10000000) {
        return (
            (number / 10000000)
            .toFixed(2) + " Cr"
        );
    }

    if (number >= 100000) {
        return (
            (number / 100000)
            .toFixed(2) + " L"
        );
    }

    return number.toLocaleString("en-IN");
}

