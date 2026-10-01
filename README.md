# 📊 NIFTY 50 F&O Market Analyzer

A professional web-based **NIFTY 50 Futures & Options (F&O) Market Analyzer** that combines live/near-live market data, technical indicators, and NIFTY option-chain analysis into a single dashboard.

The application is designed to help users analyze market conditions using **technical and market data** rather than relying on guaranteed price predictions.

---

## 🚀 Features

### 📈 NIFTY 50 Market Dashboard

* Live/near-live NIFTY 50 price
* Market status
* Market trend analysis
* Interactive candlestick chart
* Multiple timeframes:

  * 5 Minutes
  * 15 Minutes
  * 30 Minutes
  * 1 Hour
  * 4 Hours
  * 1 Day
* Interactive zoom and crosshair
* IST-based chart time display

### 📊 Technical Indicators

The dashboard supports technical analysis using indicators such as:

* EMA
* RSI
* MACD
* Trend analysis

Indicators are displayed along with the price chart to provide additional market context.

### 📋 NIFTY Option Chain

The option-chain dashboard provides:

* CE / PE LTP
* Open Interest (OI)
* Change in OI
* Volume
* Strike price
* ATM identification
* ITM / OTM identification
* Expiry information
* NIFTY spot price
* PCR
* Max Pain
* Support
* Resistance

The option chain automatically refreshes to keep the displayed market data updated.

### 🎯 Market Setup Dashboard

The application generates a data-based market setup containing:

* Direction
* Instrument
* Strike
* Entry
* Stop Loss
* Target 1
* Target 2
* Risk / Reward
* Reason

The setup is intended as an analytical scenario based on available market data and is **not a guaranteed trading signal**.

---

## 🛠️ Tech Stack

### Backend

* Python
* FastAPI
* Uvicorn
* Requests
* python-dotenv

### Frontend

* HTML
* CSS
* JavaScript
* TradingView Lightweight Charts

### Market Data

* Upstox API

---

## 🏗️ Project Structure

```text
nifty50-analyzer/
│
├── backend/
│   └── main.py
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── .env
├── .gitignore
├── nse_instruments.json.gz
├── README.md
└── requirements.txt
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd nifty50-analyzer
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

### 3. Activate the virtual environment

#### Windows PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
UPSTOX_CLIENT_ID=your_client_id
UPSTOX_CLIENT_SECRET=your_client_secret
UPSTOX_REDIRECT_URI=your_redirect_uri
UPSTOX_ACCESS_TOKEN=your_access_token
```

> **Never commit your `.env` file or API credentials to GitHub.**

---

## ▶️ Run the Application

Start the FastAPI backend using:

```bash
python -m uvicorn backend.main:app --reload
```

The application can then be accessed through the local server shown by Uvicorn.

---

## 📡 Data Flow

```text
             Upstox API
                  │
                  ▼
          FastAPI Backend
                  │
                  ▼
          Market Data API
                  │
                  ▼
          JavaScript Frontend
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   NIFTY Chart         Option Chain
        │                   │
        ▼                   ▼
 Technical Analysis    OI / PCR / Max Pain
        │                   │
        └─────────┬─────────┘
                  ▼
          Market Setup
```

---

## 📊 Option Chain Analysis

The option-chain section helps visualize important derivatives-market information including:

| Metric    | Purpose                           |
| --------- | --------------------------------- |
| LTP       | Option's latest traded price      |
| OI        | Open interest                     |
| Change OI | Change in open interest           |
| Volume    | Trading activity                  |
| PCR       | Put-Call ratio                    |
| Max Pain  | Option-chain based max-pain level |
| ATM       | At-the-money strike               |
| ITM       | In-the-money strikes              |
| OTM       | Out-of-the-money strikes          |

---

## 🎯 Market Setup Logic

The dashboard can classify the current market scenario into:

```text
BULLISH
BEARISH
NEUTRAL
```

Depending on the available market data, the application can display a corresponding analytical setup.

For example:

```text
Direction → BULLISH
Instrument → CE
Strike → ATM
Entry → Option LTP
Stop Loss → Calculated risk level
Target 1 → Risk-based target
Target 2 → Risk-based target
```

These values are generated from market data and predefined logic. They should not be interpreted as guaranteed future price movements.

---

## 🔄 Automatic Refresh

The dashboard periodically refreshes market and option-chain information so that the displayed data remains updated.

The chart also preserves the user's zoom/visible position during data updates.

---

## ⚠️ Disclaimer

This project is created for **educational, analytical, and software-development purposes**.

It does not provide guaranteed predictions, guaranteed profits, or personalized financial advice.

Market conditions can change rapidly, and technical indicators or option-chain data may produce incorrect or incomplete signals.

Users should independently verify market information and make their own financial decisions.

---

## 🔮 Future Improvements

Planned improvements may include:

* Upstox WebSocket-based real-time market data
* More advanced option-chain analytics
* Historical market analysis
* Additional technical indicators
* Advanced charting
* Improved market setup logic
* Backtesting
* Performance optimization
* Mobile-responsive improvements
* Authentication and user preferences

---

## 👨‍💻 Author

**Mustafa Shaikh**

B.Tech — Computer Science Engineering

---

## ⭐ Project Goal

The goal of this project is to build a practical **market-analysis web application** that demonstrates:

* API integration
* Real-time/near-real-time data handling
* Financial data visualization
* Frontend dashboard development
* Backend API development
* Technical-analysis implementation
* Options-market data analysis

---

## 📌 Status

🚧 **Active Development**

The application is continuously being improved with new analytical features, UI enhancements, and market-data capabilities.
