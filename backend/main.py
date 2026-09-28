from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.upstox import ( get_nifty_candles, 
                            get_nifty_option_chain,
                               get_nifty_option_contracts,
                               get_option_full_quote,
                               get_nifty_option_chain_live)


app = FastAPI(
    title="NIFTY 50 F&O Market Analyzer",
    description="NIFTY 50 market analysis using Upstox API",
    version="1.0.0"
)

app.mount(
    "/static",
    StaticFiles(directory="frontend"),
    name="static"
)

# ===============================
# FRONTEND
# ===============================

app.mount(
    "/static",
    StaticFiles(directory="frontend"),
    name="static"
)


@app.get("/")
def home():
    return FileResponse("frontend/index.html")


# ===============================
# HEALTH CHECK
# ===============================

@app.get("/health")
def health_check():

    return {
        "status": "healthy"
    }


# ===============================
# NIFTY CANDLES
# ===============================

@app.get("/api/nifty/candles")
def nifty_candles(
    interval: str = Query("5")
):

    candles = get_nifty_candles(
        interval=interval
    )

    return {
        "symbol": "NIFTY 50",
        "interval": interval,
        "count": len(candles),
        "candles": candles
    }

@app.get("/api/nifty/option-chain")
def option_chain(expiry: str = "current_week"):

    try:

        data = get_nifty_option_chain(expiry)

        return data

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }


@app.get("/api/nifty/option-contracts")
def option_contracts():

    try:

        return get_nifty_option_contracts()

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/api/test-option-full-quote")
def test_option_full_quote():

    try:

        return get_option_full_quote()

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/api/nifty/option-chain-live")
def option_chain_live():

    try:

        return get_nifty_option_chain_live()

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }