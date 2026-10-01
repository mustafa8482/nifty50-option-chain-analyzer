import os
import requests
# Previous OI memory
previous_oi_snapshot = {}
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

ACCESS_TOKEN = os.getenv("UPSTOX_ACCESS_TOKEN")

# Apna existing NIFTY 50 instrument key yahan rakho
INSTRUMENT_KEY = "NSE_INDEX|Nifty 50"


HEADERS = {
    "Accept": "application/json",
    "Authorization": f"Bearer {ACCESS_TOKEN}"
}


def get_historical_candles(
    interval="5",
    days=30
):
    """
    Previous days ka NIFTY 50 candle data.
    """

    today = datetime.now().date()

    to_date = today - timedelta(days=1)
    from_date = today - timedelta(days=days)

    url = (
        "https://api.upstox.com/v3/historical-candle/"
        f"{INSTRUMENT_KEY}/minutes/{interval}/"
        f"{to_date.strftime('%Y-%m-%d')}/"
        f"{from_date.strftime('%Y-%m-%d')}"
    )

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=15
    )

    if response.status_code != 200:
        print(
            "❌ Historical API Error:",
            response.status_code
        )
        print(response.text)
        return []

    data = response.json()

    return data.get("data", {}).get("candles", [])


def get_intraday_candles(interval="5"):
    """
    Aaj ke current trading day ke candles.
    """

    url = (
        "https://api.upstox.com/v3/historical-candle/intraday/"
        f"{INSTRUMENT_KEY}/minutes/{interval}"
    )

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=15
    )

    if response.status_code != 200:
        print(
            "❌ Intraday API Error:",
            response.status_code
        )
        print(response.text)
        return []

    data = response.json()

    return data.get("data", {}).get("candles", [])


def get_nifty_candles(interval="5"):
    """
    Historical + current-day candles combine karta hai.
    """

    historical = get_historical_candles(
        interval=interval,
        days=30
    )

    intraday = get_intraday_candles(
        interval=interval
    )

    # Dono datasets combine
    combined = historical + intraday

    # Duplicate candles remove
    unique = {}

    for candle in combined:

        if not candle:
            continue

        timestamp = candle[0]

        unique[timestamp] = candle

    # Oldest → newest
    candles = sorted(
        unique.values(),
        key=lambda candle: candle[0]
    )

    return candles


if __name__ == "__main__":

    candles = get_nifty_candles("5")

    print(
        "\nTotal combined candles:",
        len(candles)
    )

    if candles:

        print(
            "\nOldest candle:"
        )

        print(candles[0])

        print(
            "\nLatest candle:"
        )

        print(candles[-1])


# ========================================
# NIFTY OPTION CHAIN
# ========================================

def get_nifty_option_chain(expiry="2026-09-29"):

    url = "https://api.upstox.com/v2/option/chain"

    params = {
        "instrument_key": "NSE_INDEX|Nifty 50",
        "expiry_date": expiry
    }

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }

    response = requests.get(
        url,
        params=params,
        headers=headers,
        timeout=15
    )

    print(
        "Option Chain Status:",
        response.status_code
    )

    response.raise_for_status()

    return response.json()
# ========================================
# NIFTY OPTION CONTRACTS FOR EXPIRY
# ========================================

def get_nifty_option_contracts(expiry="2026-09-29"):

    url = "https://api.upstox.com/v2/option/contract"

    params = {
        "instrument_key": "NSE_INDEX|Nifty 50",
        "expiry_date": expiry
    }

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }

    response = requests.get(
        url,
        params=params,
        headers=headers,
        timeout=15
    )

    response.raise_for_status()

    return response.json()

# ========================================
# FULL NIFTY OPTION QUOTE
# ========================================

def get_option_full_quote(instrument_key="NSE_FO|65899"):

    url = "https://api.upstox.com/v2/market-quote/quotes"

    params = {
        "instrument_key": instrument_key
    }

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }

    response = requests.get(
        url,
        params=params,
        headers=headers,
        timeout=15
    )

    response.raise_for_status()

    return response.json()
# ========================================
# AUTOMATIC NIFTY OPTION CHAIN
# ========================================

def get_nifty_option_chain_live():

    # ------------------------------------
    # 1. Get NIFTY option contracts
    # ------------------------------------

    contract_url = "https://api.upstox.com/v2/option/contract"

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }

    contract_params = {
        "instrument_key": "NSE_INDEX|Nifty 50"
    }

    contract_response = requests.get(
        contract_url,
        params=contract_params,
        headers=headers,
        timeout=15
    )

    contract_response.raise_for_status()

    contracts = contract_response.json().get(
        "data",
        []
    )

    if not contracts:
        return {
            "status": "error",
            "message": "No NIFTY option contracts found."
        }

    # ------------------------------------
    # 2. Find nearest expiry
    # ------------------------------------

    expiries = sorted(
        {
            contract.get("expiry")
            for contract in contracts
            if contract.get("expiry")
        }
    )

    if not expiries:
        return {
            "status": "error",
            "message": "No expiry found."
        }

    expiry = expiries[0]

    # ------------------------------------
    # 3. Get NIFTY spot
    # ------------------------------------

    spot_url = "https://api.upstox.com/v2/market-quote/ltp"

    spot_params = {
        "instrument_key": "NSE_INDEX|Nifty 50"
    }

    spot_response = requests.get(
        spot_url,
        params=spot_params,
        headers=headers,
        timeout=15
    )

    spot_response.raise_for_status()

    spot_data = spot_response.json().get(
        "data",
        {}
    )

    if not spot_data:
        return {
            "status": "error",
            "message": "NIFTY spot price not available."
        }

    spot_info = next(
        iter(spot_data.values())
    )

    spot = float(
        spot_info.get("last_price", 0)
    )

    if spot <= 0:
        return {
            "status": "error",
            "message": "Invalid NIFTY spot price."
        }

    # ------------------------------------
    # 4. Calculate ATM
    # ------------------------------------

    strike_step = 50

    atm = round(
        spot / strike_step
    ) * strike_step

    # ------------------------------------
    # 5. ATM ± 5 strikes
    # ------------------------------------

    selected_strikes = [
        atm + (i * strike_step)
        for i in range(-5, 6)
    ]

    # ------------------------------------
    # 6. Find CE / PE contracts
    # ------------------------------------

    selected_contracts = {}

    for contract in contracts:

        if contract.get("expiry") != expiry:
            continue

        strike = contract.get("strike_price")
        option_type = contract.get("instrument_type")

        if strike not in selected_strikes:
            continue

        if option_type not in ["CE", "PE"]:
            continue

        selected_contracts[
            (strike, option_type)
        ] = contract

    # ------------------------------------
    # 7. Instrument keys
    # ------------------------------------

    instrument_keys = [
        contract["instrument_key"]
        for contract in selected_contracts.values()
    ]

    if not instrument_keys:
        return {
            "status": "error",
            "message": "No matching CE/PE contracts found."
        }

    # ------------------------------------
    # 8. Full market quotes
    # ------------------------------------

    quote_url = (
        "https://api.upstox.com/v2/"
        "market-quote/quotes"
    )

    quote_params = {
        "instrument_key": ",".join(
            instrument_keys
        )
    }

    quote_response = requests.get(
        quote_url,
        params=quote_params,
        headers=headers,
        timeout=15
    )

    quote_response.raise_for_status()

    quote_data = quote_response.json().get(
        "data",
        {}
    )

    print(
        "QUOTE DATA COUNT:",
        len(quote_data)
    )

    # ------------------------------------
    # 9. Create lookup by instrument token
    # ------------------------------------

    quote_lookup = {}

    for quote_key, quote in quote_data.items():

        instrument_token = quote.get(
            "instrument_token"
        )

        if instrument_token:
            quote_lookup[
                instrument_token
            ] = quote

    # ------------------------------------
    # 10. Build clean option chain
    # ------------------------------------

    option_chain = []

    total_ce_oi = 0
    total_pe_oi = 0

    for strike in selected_strikes:

        row = {
            "strike": strike,
            "ce": None,
            "pe": None
        }

        for option_type in ["CE", "PE"]:

            contract = selected_contracts.get(
                (strike, option_type)
            )

            if not contract:
                continue

            instrument_key = contract[
                "instrument_key"
            ]
            global previous_oi_snapshot
            previous_oi = previous_oi_snapshot.get(
                  instrument_key
            )

            quote = quote_lookup.get(
                instrument_key
            )

            if not quote:
                continue

            current_oi = quote.get("oi") or 0

            if option_type == "CE":
                total_ce_oi += current_oi

            elif option_type == "PE":
                total_pe_oi += current_oi

            if previous_oi is None:
                change_oi = 0
            else:
                change_oi = current_oi - previous_oi

            previous_oi_snapshot[instrument_key] = current_oi

            row[
                option_type.lower()
            ] = {
                "instrument_key":
                    instrument_key,

                "symbol":
                    contract.get(
                        "trading_symbol"
                    ),

                "ltp":
                    quote.get(
                        "last_price"
                    ),

                "oi": current_oi,

                "previous_oi": previous_oi,

                "change_oi": change_oi,

                "volume": 
                    quote.get(
                        "volume"
                    ),

                "net_change":
                    quote.get(
                        "net_change"
                    ),

                "average_price":
                    quote.get(
                        "average_price"
                    ),

                "oi_day_high":
                    quote.get(
                        "oi_day_high"
                    ),

                "oi_day_low":
                    quote.get(
                        "oi_day_low"
                    )
            }

        option_chain.append(row)

    if total_ce_oi > 0:
        pcr = total_pe_oi / total_ce_oi
    else:
        pcr = 0 

    # ========================================
    # MAX PAIN CALCULATION
    # ========================================

    max_pain = None
    lowest_pain = None

    for candidate_strike in selected_strikes:

        total_pain = 0

        for row in option_chain:

            strike = row["strike"]

            ce = row.get("ce")
            pe = row.get("pe")

            ce_oi = (
                ce.get("oi", 0)
                if ce else 0
            )

            pe_oi = (
                pe.get("oi", 0)
                if pe else 0
            )

            # CE pain
            if candidate_strike > strike:
                total_pain += (
                    candidate_strike - strike
                ) * ce_oi

            # PE pain
            if candidate_strike < strike:
                total_pain += (
                    strike - candidate_strike
                ) * pe_oi

        if (
            lowest_pain is None
            or total_pain < lowest_pain
        ):
            lowest_pain = total_pain
            max_pain = candidate_strike

    # ========================================
    # SUPPORT & RESISTANCE
    # ========================================

    support = None
    resistance = None

    highest_pe_oi = -1
    highest_ce_oi = -1

    for row in option_chain:

        strike = row["strike"]

        ce = row.get("ce")
        pe = row.get("pe")

        ce_oi = ce.get("oi", 0) if ce else 0
        pe_oi = pe.get("oi", 0) if pe else 0

        # Highest PE OI = Support
        if pe_oi > highest_pe_oi:
            highest_pe_oi = pe_oi
            support = strike

        # Highest CE OI = Resistance
        if ce_oi > highest_ce_oi:
            highest_ce_oi = ce_oi
            resistance = strike

# ========================================
# MARKET SCENARIO
# ========================================

    bullish_score = 0
    bearish_score = 0
    scenario_reasons = []

    # Spot vs Support / Resistance
    if support is not None and spot > support:
        bullish_score += 1
        scenario_reasons.append(
            f"Spot {spot:.2f} is above support {support}"
        )

    if resistance is not None and spot < resistance:
        bearish_score += 1
        scenario_reasons.append(
            f"Spot {spot:.2f} is below resistance {resistance}"
        )

    # PCR
    if pcr > 1:
        bullish_score += 1
        scenario_reasons.append(
            f"PCR is {pcr:.2f}, above 1"
        )

    elif pcr < 1:
        bearish_score += 1
        scenario_reasons.append(
            f"PCR is {pcr:.2f}, below 1"
        )

    # CE vs PE OI
    if total_pe_oi > total_ce_oi:
        bullish_score += 1
        scenario_reasons.append(
            "PE OI is higher than CE OI"
        )

    elif total_ce_oi > total_pe_oi:
        bearish_score += 1
        scenario_reasons.append(
            "CE OI is higher than PE OI"
        )
    
    # Final scenario
    if bullish_score > bearish_score:
        market_scenario = "BULLISH"
    elif bearish_score > bullish_score:
        market_scenario = "BEARISH"
    else:
        market_scenario = "NEUTRAL"

    return {
        "status": "success",
        "data": {
            "spot": spot,
            "atm": atm,
            "expiry": expiry,
            "strike_step": strike_step,
            "support": support,
            "resistance": resistance,
            "total_ce_oi": total_ce_oi,
            "total_pe_oi": total_pe_oi,
            "pcr": round(pcr, 2),
            "max_pain": max_pain,
            "market_scenario": market_scenario,
            "bullish_score": bullish_score,
            "bearish_score": bearish_score,
            "scenario_reasons": scenario_reasons,
            "chain": option_chain
        }
    }
