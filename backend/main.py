from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import requests
import re
import time
import json
import os
import hashlib
import feedparser
from datetime import datetime, time as dt_time, timedelta
from zoneinfo import ZoneInfo
from bs4 import BeautifulSoup

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STOCKS = [
    {"name": "삼성전자", "symbol": "SMSN", "market": "KR", "quote_type": "24H", "path": "korea/samsung", "krx_code": "005930", "yahoo": "005930.KS"},
    {"name": "SK하이닉스", "symbol": "SKHX", "market": "KR", "quote_type": "24H", "path": "korea/hynix", "krx_code": "000660", "yahoo": "000660.KS"},
    {"name": "현대차", "symbol": "HYUNDAI", "market": "KR", "quote_type": "24H", "path": "korea/hyundai", "krx_code": "005380", "yahoo": "005380.KS"},

    {"name": "기아", "symbol": "KIA", "market": "KR", "quote_type": "REFERENCE", "krx_code": "000270", "yahoo": "000270.KS"},
    {"name": "NAVER", "symbol": "NAVER", "market": "KR", "quote_type": "REFERENCE", "krx_code": "035420", "yahoo": "035420.KS"},
    {"name": "카카오", "symbol": "KAKAO", "market": "KR", "quote_type": "REFERENCE", "krx_code": "035720", "yahoo": "035720.KS"},
    {"name": "LG에너지솔루션", "symbol": "LGES", "market": "KR", "quote_type": "REFERENCE", "krx_code": "373220", "yahoo": "373220.KS"},
    {"name": "삼성바이오로직스", "symbol": "SAMSUNG BIO", "market": "KR", "quote_type": "REFERENCE", "krx_code": "207940", "yahoo": "207940.KS"},

    {"name": "Apple", "symbol": "AAPL", "market": "US", "quote_type": "US", "path": "us/apple", "yahoo": "AAPL"},
    {"name": "Tesla", "symbol": "TSLA", "market": "US", "quote_type": "US", "path": "us/tesla", "yahoo": "TSLA"},
    {"name": "NVIDIA", "symbol": "NVDA", "market": "US", "quote_type": "US", "path": "us/nvidia", "yahoo": "NVDA"},
    {"name": "Microsoft", "symbol": "MSFT", "market": "US", "quote_type": "US", "path": "us/microsoft", "yahoo": "MSFT"},
    {"name": "Amazon", "symbol": "AMZN", "market": "US", "quote_type": "US", "path": "us/amazon", "yahoo": "AMZN"},
    {"name": "Meta", "symbol": "META", "market": "US", "quote_type": "US", "path": "us/meta", "yahoo": "META"},
    {"name": "Google", "symbol": "GOOGL", "market": "US", "quote_type": "US", "path": "us/google", "yahoo": "GOOGL"},
    {"name": "Micron Technology", "symbol": "MU", "market": "US", "quote_type": "US", "path": "us/micron", "yahoo": "MU"},
]

CACHE = {"last_update": 0, "data": []}
NEWS_CACHE = {"last_update": 0, "data": []}
INVESTOR_FLOW_CACHE = {"last_update": 0, "data": None}

VISITOR_STATS_FILE = os.path.join(os.path.dirname(__file__), "visitor_stats.json")
VISITOR_ACTIVE_WINDOW = 60
VISITOR_CACHE = {
    "total": 0,
    "visitors": {},
    "sessions": {},
}

UPDATE_INTERVAL = 30
NEWS_UPDATE_INTERVAL = 300
INVESTOR_FLOW_UPDATE_INTERVAL = 300
HYPER_CANDLE_CACHE = {}
HYPER_CANDLE_UPDATE_INTERVAL = 25

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "*/*",
}


def get_kr_session_label():
    # 한국 주식 세션 표시
    # - 평일 09:00~15:30: KRX 정규장
    # - 평일 08:00~09:00, 15:30~20:00: NXT 참고 시간
    # - 그 외 야간/새벽/주말: 24H 참고 시세
    now = datetime.now(ZoneInfo("Asia/Seoul"))

    if now.weekday() >= 5:
        return "24H"

    current = now.time()

    if dt_time(9, 0) <= current <= dt_time(15, 30):
        return "KRX"

    if dt_time(8, 0) <= current < dt_time(9, 0):
        return "NXT"

    if dt_time(15, 30) < current <= dt_time(20, 0):
        return "NXT"

    return "24H"


def get_kr_24h_supported_session_label():
    # 삼성전자/SK하이닉스/현대차처럼 실제 24H 참고 시세가 있는 종목은
    # 정규장에는 KRX, 그 외 시간에는 24H 거래소 기준으로 표시/계산합니다.
    session_label = get_kr_session_label()

    if session_label == "KRX":
        return "KRX"

    return "24H"


def get_kr_reference_session_label():
    # 24H 지원이 없는 일반 한국/NXT 참고 종목은 야간·주말에 24H가 아니라 CLOSED로 표시합니다.
    session_label = get_kr_session_label()

    if session_label == "KRX":
        return "KRX"

    if session_label == "NXT":
        return "NXT"

    return "CLOSED"


US_24H_PATHS = {
    # kr-stocks.com / Hyperliquid 화면에서 확인한 24H 미국 종목
    # 값은 우선 시도할 kr-stocks.com 경로 후보입니다.
    "TSLA": ["us/tesla"],
    "NVDA": ["us/nvidia"],
    "AAPL": ["us/apple"],
    "MSFT": ["us/microsoft"],
    "AMD": ["us/amd"],
    "GOOGL": ["us/google"],
    "GOOG": ["us/google"],
    "AMZN": ["us/amazon"],
    "META": ["us/meta"],

    # 추가 확인 종목
    "MSTR": ["us/microstrategy", "us/mstr"],
    "NFLX": ["us/netflix", "us/nflx"],
    "INTC": ["us/intel", "us/intc"],
    "PLTR": ["us/palantir", "us/pltr"],
    "COIN": ["us/coinbase", "us/coin"],
    "ORCL": ["us/oracle", "us/orcl"],
    "MU": ["us/micron", "us/mu"],
    "COST": ["us/costco", "us/cost"],
    "BABA": ["us/alibaba", "us/baba"],
    "RIVN": ["us/rivian", "us/rivn"],
    "TSM": ["us/tsmc", "us/tsm"],
    "HOOD": ["us/robinhood", "us/hood"],
    "LLY": ["us/eli-lilly", "us/lilly", "us/lly"],
    "CRCL": ["us/circle", "us/crcl"],
    "GME": ["us/gamestop", "us/gme"],
    "RKLB": ["us/rocket-lab", "us/rklb"],
    "DKNG": ["us/draftkings", "us/dkng"],
}


def get_us_24h_paths(symbol):
    symbol = str(symbol or "").strip().upper()
    paths = US_24H_PATHS.get(symbol, [])

    if isinstance(paths, str):
        return [paths]

    return paths


def get_us_24h_path(symbol):
    paths = get_us_24h_paths(symbol)
    return paths[0] if paths else None


def get_kr_regular_quote(code):
    # KRX 정규장/네이버 증권 기준 참고 가격
    latest_close, previous_close = get_krx_closes(code)

    if not latest_close or not previous_close:
        raise Exception("KRX 정규장 가격 데이터 부족")

    return latest_close, previous_close, "네이버증권 KRX 기준"


def get_kr_nxt_reference_quote(code):
    # NXT 시간대 참고 가격
    # 현재 무료 소스에서는 NXT 전용 체결가를 안정적으로 받기 어려워,
    # Yahoo/Naver 기준의 국내 종목 최신가를 참고 가격으로 사용합니다.
    latest_close, previous_close = get_krx_closes(code)
    current = latest_close

    for yahoo_symbol in [f"{code}.KS", f"{code}.KQ"]:
        try:
            url = (
                f"https://query1.finance.yahoo.com/v8/finance/chart/"
                f"{yahoo_symbol}?range=1d&interval=1m"
            )
            res = requests.get(url, headers=HEADERS, timeout=10)
            data = res.json()

            result = data["chart"]["result"][0]
            meta = result.get("meta", {})
            yahoo_current = meta.get("regularMarketPrice", 0)

            if yahoo_current:
                current = yahoo_current
                break
        except Exception as e:
            print("KR NXT 참고 현재가 Yahoo 조회 오류:", yahoo_symbol, e)

    if not current or not previous_close:
        raise Exception("NXT 참고 가격 데이터 부족")

    return current, previous_close, "NXT 참고 시세"


def extract_kr_24h_usd_and_krw(html):
    # kr-stocks.com 상세 페이지는 현재가($)와 원화 환산가(₩)를 같이 보여줍니다.
    # 첫 번째 원화값이 10,000원 이상이면 환율이 아니라 현재 원화 환산 가격으로 판단합니다.
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)

    usd_prices = re.findall(r"\$\s?[\d,.]+", text)
    won_prices = re.findall(r"₩\s?[\d,]+", text)

    usd_price = usd_prices[0] if usd_prices else "데이터 없음"
    krw_price = 0
    fx_rate = 0

    if won_prices:
        try:
            first_won = int(clean_number(won_prices[0]))
            if first_won >= 10000:
                krw_price = first_won
            else:
                fx_rate = first_won
        except Exception:
            pass

    if usd_price != "데이터 없음" and krw_price > 0:
        try:
            fx_rate = round(krw_price / clean_number(usd_price), 2)
        except Exception:
            pass

    return usd_price, krw_price, fx_rate


def get_kr_24h_quote(stock):
    # 24H 참고 가격: kr-stocks.com의 실제 24시간 거래소 표시 가격을 사용합니다.
    # 삼성전자/SK하이닉스/현대차는 페이지에 표시되는 원화 환산 현재가를 우선 사용해
    # 모범 사이트와 최대한 같은 가격이 나오도록 맞춥니다.
    url = f"https://kr-stocks.com/{stock['path']}"
    response = requests.get(url, headers=HEADERS, timeout=10)

    usd_price, krw_price, fx_rate = extract_kr_24h_usd_and_krw(response.text)
    base_close = get_krx_close(stock["krx_code"])

    if usd_price == "데이터 없음" or not base_close:
        raise Exception("24H 참고 시세 데이터 부족")

    if krw_price:
        current_price = round(krw_price)
    else:
        fallback_usd, fallback_fx = extract_usd_and_fx(response.text)
        if fallback_usd == "데이터 없음":
            raise Exception("24H 참고 시세 원화 환산 데이터 부족")
        current_price = round(clean_number(fallback_usd) * fallback_fx)
        fx_rate = fallback_fx

    return current_price, base_close, usd_price, fx_rate, url, response.status_code


def get_us_24h_quote(symbol, regular_close=None):
    # 미국 24H 지원 종목은 kr-stocks.com/Hyperliquid 참고 시세를 우선 사용합니다.
    # 현재가는 kr-stocks.com 24H/PRE 값을 그대로 사용하고,
    # 기준가는 Yahoo quote/chart에서 "가장 최근에 완료된 정규장 종가"만 사용합니다.
    # PRE/REGULAR 중이면 전장 종가, AFTER/CLOSED 중이면 방금 끝난 정규장 종가가 기준입니다.
    paths = get_us_24h_paths(symbol)

    if not paths:
        raise Exception("미국 24H 지원 경로 없음")

    last_error = None

    for path in paths:
        try:
            url = f"https://kr-stocks.com/{path}"
            response = requests.get(url, headers=HEADERS, timeout=10)
            usd_price, _ = extract_us_current_and_regular_close(response.text)

            if usd_price == "데이터 없음":
                raise Exception("미국 24H 참고 현재가 데이터 없음")

            current = clean_number(usd_price)
            base_price = get_yahoo_previous_close(symbol)

            if not current or not base_price:
                raise Exception("미국 24H 참고 가격 데이터 부족")

            return current, base_price, url, response.status_code

        except Exception as e:
            last_error = e
            print("미국 24H 경로 시도 실패:", symbol, path, e)

    raise Exception(f"미국 24H 참고 시세 데이터 부족: {last_error}")

def get_us_session_label(symbol=None):
    # 미국 주식 세션 표시: Yahoo quote API의 marketState를 우선 사용하고,
    # 실패하면 미국 동부시간 기준으로 PRE / REGULAR / AFTER / CLOSED를 계산합니다.
    if symbol:
        try:
            quote_url = (
                "https://query1.finance.yahoo.com/v7/finance/quote"
                f"?symbols={str(symbol).strip()}"
            )
            quote_res = requests.get(quote_url, headers=HEADERS, timeout=10)
            quote_data = quote_res.json()
            quote_result = quote_data.get("quoteResponse", {}).get("result", [])

            if quote_result:
                market_state = str(quote_result[0].get("marketState", "")).upper()

                if market_state in ["PRE", "PREPRE"]:
                    return "PRE"

                if market_state == "REGULAR":
                    return "REGULAR"

                if market_state in ["POST", "POSTPOST"]:
                    return "AFTER"

                if market_state in ["CLOSED", "CLOSE", "ENDED"]:
                    return "CLOSED"

        except Exception as e:
            print("미국 세션 상태 조회 오류:", symbol, e)

    now = datetime.now(ZoneInfo("America/New_York"))

    if now.weekday() >= 5:
        return "CLOSED"

    current = now.time()

    if dt_time(4, 0) <= current < dt_time(9, 30):
        return "PRE"

    if dt_time(9, 30) <= current < dt_time(16, 0):
        return "REGULAR"

    if dt_time(16, 0) <= current < dt_time(20, 0):
        return "AFTER"

    return "CLOSED"


def clean_number(value):
    return float(value.replace("$", "").replace("₩", "").replace(",", "").strip())


def get_krx_closes(code):
    url = f"https://finance.naver.com/item/sise_day.naver?code={code}"
    res = requests.get(url, headers=HEADERS, timeout=10)
    soup = BeautifulSoup(res.text, "html.parser")

    closes = []
    rows = soup.select("table.type2 tr")

    for row in rows:
        cols = row.select("td")
        if len(cols) >= 2:
            close_text = cols[1].get_text(strip=True).replace(",", "")
            if close_text.isdigit():
                closes.append(int(close_text))

        if len(closes) >= 2:
            break

    latest_close = closes[0] if len(closes) >= 1 else 0
    previous_close = closes[1] if len(closes) >= 2 else 0

    return latest_close, previous_close


def get_krx_close(code):
    latest_close, _ = get_krx_closes(code)
    return latest_close


def extract_usd_and_fx(html):
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)

    usd_prices = re.findall(r"\$\s?[\d,.]+", text)
    won_prices = re.findall(r"₩\s?[\d,]+", text)

    fx_rate = 1482

    if won_prices:
        try:
            fx_rate = int(clean_number(won_prices[0]))
        except:
            pass

    usd_price = usd_prices[0] if usd_prices else "데이터 없음"
    return usd_price, fx_rate


def extract_us_current_and_regular_close(html):
    text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)

    usd_prices = re.findall(r"\$\s?[\d,.]+", text)

    current_price = usd_prices[0] if usd_prices else "데이터 없음"

    regular_close = None

    close_patterns = [
        r"정규장\s*종가\s*[:：]?\s*\$?\s*([\d,.]+)",
        r"정규장\s*마감가\s*[:：]?\s*\$?\s*([\d,.]+)",
        r"전일\s*종가\s*[:：]?\s*\$?\s*([\d,.]+)",
        r"이전\s*종가\s*[:：]?\s*\$?\s*([\d,.]+)",
        r"기준가\s*[:：]?\s*\$?\s*([\d,.]+)",
        r"regular\s*market\s*close\s*[:：]?\s*\$?\s*([\d,.]+)",
        r"regular\s*close\s*[:：]?\s*\$?\s*([\d,.]+)",
        r"Regular\s*Close\s*[:：]?\s*\$?\s*([\d,.]+)",
        r"Previous\s*Close\s*[:：]?\s*\$?\s*([\d,.]+)",
        r"Prev\s*Close\s*[:：]?\s*\$?\s*([\d,.]+)",
    ]

    for pattern in close_patterns:
        match = re.search(pattern, text)
        if match:
            regular_close = clean_number(match.group(1))
            break

    return current_price, regular_close


def get_yahoo_previous_close(symbol):
    # 미국 기준가: "가장 최근에 완료된 정규장 종가"만 사용합니다.
    # - PRE/REGULAR: 전장 종가(regularMarketPreviousClose)
    # - AFTER/CLOSED: 방금 끝난 정규장 종가(regularMarketPrice)
    # 현재가(kr-stocks.com 24H/PRE)는 그대로 두고, 기준가만 Yahoo에서 세션별로 가져옵니다.
    symbol = str(symbol or "").strip().upper()

    # 1순위: Yahoo quote API
    # 정규장 이후에는 regularMarketPreviousClose가 전전장 종가처럼 보일 수 있으므로
    # POST/AFTER/CLOSED 상태에서는 regularMarketPrice를 기준가로 사용합니다.
    try:
        quote_url = (
            "https://query1.finance.yahoo.com/v7/finance/quote"
            f"?symbols={symbol}"
        )
        quote_res = requests.get(quote_url, headers=HEADERS, timeout=10)
        quote_data = quote_res.json()
        quote_result = quote_data.get("quoteResponse", {}).get("result", [])

        if quote_result:
            item = quote_result[0]
            market_state = str(item.get("marketState", "")).upper()

            regular_price = item.get("regularMarketPrice", 0) or 0
            previous_close = item.get("regularMarketPreviousClose", 0) or 0

            if market_state in ["POST", "POSTPOST", "CLOSED", "CLOSE", "ENDED"]:
                if regular_price and float(regular_price) > 0:
                    return float(regular_price)

            if market_state in ["PRE", "PREPRE", "REGULAR"]:
                if previous_close and float(previous_close) > 0:
                    return float(previous_close)

            if regular_price and float(regular_price) > 0:
                return float(regular_price)

            if previous_close and float(previous_close) > 0:
                return float(previous_close)

    except Exception as e:
        print("Yahoo quote 미국 기준가 조회 오류:", symbol, e)

    # 2순위 fallback: Yahoo 일봉 close
    # 오늘 정규장이 끝난 뒤에는 오늘 일봉 종가를 포함하고,
    # PRE/REGULAR 시간에는 오늘 미완성 일봉을 제외하고 전장 종가만 사용합니다.
    try:
        now_ny = datetime.now(ZoneInfo("America/New_York"))
        url = (
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
            f"?range=15d&interval=1d&events=history&includePrePost=false"
        )

        res = requests.get(url, headers=HEADERS, timeout=10)
        data = res.json()
        result = data["chart"]["result"][0]

        timestamps = result.get("timestamp", []) or []
        quote = result.get("indicators", {}).get("quote", [{}])[0]
        closes = quote.get("close", []) or []

        completed_today = (
            now_ny.weekday() < 5
            and now_ny.time() >= dt_time(16, 0)
        )

        valid_daily = []

        for ts, close_price in zip(timestamps, closes):
            if close_price is None or close_price <= 0:
                continue

            bar_date = datetime.fromtimestamp(ts, ZoneInfo("America/New_York")).date()

            # 정규장이 아직 끝나지 않은 오늘 일봉은 기준가에서 제외합니다.
            if bar_date == now_ny.date() and not completed_today:
                continue

            valid_daily.append(float(close_price))

        if valid_daily:
            return valid_daily[-1]

    except Exception as e:
        print("Yahoo 일봉 미국 기준가 조회 오류:", symbol, e)

    raise Exception("미국 최근 정규장 종가 데이터 없음")


def fetch_yahoo_stock(stock):
    if stock["market"] == "US":
        session_label = get_us_session_label(stock.get("yahoo") or stock.get("symbol"))

        # 미국 24H 지원 종목은 세션과 관계없이 kr-stocks.com/Hyperliquid 기준으로 표시합니다.
        # PRE / REGULAR / AFTER / CLOSED에서 Yahoo와 24H 소스가 섞이면 기준가가 틀어질 수 있습니다.
        if get_us_24h_path(stock.get("symbol") or stock.get("yahoo")):
            try:
                current, regular_close, source_url, status_code = get_us_24h_quote(stock.get("symbol") or stock.get("yahoo"))
                diff = current - regular_close
                percent = (diff / regular_close) * 100

                return {
                    "name": stock["name"],
                    "symbol": stock["symbol"],
                    "market": stock["market"],
                    "quote_type": "24H",
                    "price": f"${current:,.2f}",
                    "price_number": round(current, 2),
                    "usd": f"${current:,.2f}",
                    "fx_rate": 0,
                    "base_price": round(regular_close, 2),
                    "base_price_text": f"${regular_close:,.2f}",
                    "diff_from_base": f"{'+' if diff >= 0 else '-'}${abs(diff):,.2f}",
                    "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
                    "is_up": diff >= 0,
                    "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "source": source_url,
                    "status": status_code,
                    "session_label": "24H",
                    "is_24h_supported": True,
                }

            except Exception as e:
                print("미국 24H 참고 시세 오류:", stock["name"], e)

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{stock['yahoo']}?range=1d&interval=1m&includePrePost=true"

    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        data = res.json()

        result = data["chart"]["result"][0]
        meta = result["meta"]

        if stock["market"] == "KR":
            latest_close, previous_close = get_krx_closes(stock["krx_code"])

            if not latest_close or not previous_close:
                raise Exception("KRX 종가 데이터 부족")

            diff = latest_close - previous_close
            percent = (diff / previous_close) * 100

            return {
                "name": stock["name"],
                "symbol": stock["symbol"],
                "market": stock["market"],
                "quote_type": stock.get("quote_type", "REFERENCE"),
                "krx_code": stock.get("krx_code", ""),
                "tvSymbol": f"KRX:{stock.get('krx_code', '')}",
                "price": f"₩{round(latest_close):,}",
                "price_number": round(latest_close, 2),
                "usd": "KRX 최근 종가 기준 참고",
                "fx_rate": 0,
                "base_price": round(previous_close, 2),
                "base_price_text": f"₩{round(previous_close):,}",
                "diff_from_base": f"{'+' if diff >= 0 else '-'}₩{abs(round(diff)):,}",
                "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
                "is_up": diff >= 0,
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "source": url,
                "status": res.status_code,
                "is_24h_supported": False,
                "session_label": get_kr_reference_session_label(),
            }

        closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        valid_closes = [price for price in closes if price is not None]

        current = valid_closes[-1] if valid_closes else meta.get("regularMarketPrice", 0)
        previous = meta.get("regularMarketPreviousClose", 0) or meta.get("chartPreviousClose", 0)

        if not current or not previous:
            raise Exception("미국 주식 가격 데이터 부족")

        diff = current - previous
        percent = (diff / previous) * 100

        return {
            "name": stock["name"],
            "symbol": stock["symbol"],
            "market": stock["market"],
            "quote_type": stock.get("quote_type", "US"),
            "price": f"${current:,.2f}",
            "price_number": round(current, 2),
            "usd": f"${current:,.2f}",
            "fx_rate": 0,
            "base_price": round(previous, 2),
            "base_price_text": f"${previous:,.2f}",
            "diff_from_base": f"{'+' if diff >= 0 else '-'}${abs(diff):,.2f}",
            "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
            "is_up": diff >= 0,
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source": url,
            "status": res.status_code,
            "session_label": get_us_session_label(stock.get("yahoo") or stock.get("symbol")),
        }

    except Exception as e:
        return {
            "name": stock["name"],
            "symbol": stock["symbol"],
            "market": stock["market"],
            "quote_type": stock.get("quote_type", "UNKNOWN"),
            "price": "데이터 없음",
            "usd": "데이터 없음",
            "fx_rate": 0,
            "base_price_text": "데이터 없음",
            "diff_from_base": "계산 불가",
            "percent_from_base": "0.00%",
            "is_up": False,
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source": str(e),
            "session_label": get_kr_reference_session_label() if stock.get("market") == "KR" else get_us_session_label(stock.get("yahoo") or stock.get("symbol")),
        }


def fetch_stock_data():
    results = []

    for stock in STOCKS:
        if stock["market"] == "KR" and stock.get("quote_type") == "24H":
            session_label = get_kr_24h_supported_session_label()

            try:
                usd_price = ""
                fx_rate = 0
                source = ""
                status = 200

                if session_label == "KRX":
                    current_price, base_price, source_text = get_kr_regular_quote(stock["krx_code"])
                    usd_price = source_text
                    source = "https://finance.naver.com/item/sise_day.naver?code=" + stock["krx_code"]

                elif session_label == "NXT":
                    current_price, base_price, source_text = get_kr_nxt_reference_quote(stock["krx_code"])
                    usd_price = source_text
                    source = "NXT 참고:/api/stock-quote"

                else:
                    current_price, base_price, usd_price, fx_rate, source, status = get_kr_24h_quote(stock)

                diff = current_price - base_price
                percent = (diff / base_price) * 100

                results.append({
                    "name": stock["name"],
                    "symbol": stock["symbol"],
                    "market": stock["market"],
                    "quote_type": "24H",
                    "krx_code": stock["krx_code"],
                    "tvSymbol": f"KRX:{stock['krx_code']}",
                    "price": f"₩{round(current_price):,}",
                    "price_number": round(current_price, 2),
                    "usd": usd_price,
                    "fx_rate": fx_rate,
                    "base_price": round(base_price, 2),
                    "base_price_text": f"₩{round(base_price):,}",
                    "diff_from_base": f"{'+' if diff >= 0 else '-'}₩{abs(round(diff)):,}",
                    "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
                    "is_up": diff >= 0,
                    "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "source": source,
                    "status": status,
                    "is_24h_supported": True,
                    "session_label": session_label,
                })

            except Exception as e:
                print("한국 대표 종목 세션별 가격 데이터 오류:", stock["name"], e)

        else:
            results.append(fetch_yahoo_stock(stock))

    return results


def load_krx_symbols():
    file_path = os.path.join(os.path.dirname(__file__), "krx_symbols.json")

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("krx_symbols.json 불러오기 오류:", e)
        return []


def categorize_news_item(title):
    title = str(title or "")

    if re.search(r"환율|금리|물가|부동산|경기|경제", title):
        return "경제"

    if re.search(r"코스피|코스닥|증시|주식|시장|나스닥|S&P|다우", title):
        return "증시"

    if re.search(r"삼성|하이닉스|현대|기업|실적|반도체|배터리|2차전지", title):
        return "기업"

    if re.search(r"정부|정책|선거|대통령|국회|규제|세금", title):
        return "정책"

    return "글로벌"


def summarize_news_item(title):
    title = str(title or "")

    if re.search(r"환율|금리", title):
        return "환율과 금리 흐름이 국내 증시와 투자심리에 영향을 주고 있습니다."

    if re.search(r"반도체|삼성|하이닉스", title):
        return "반도체 업종 관련 뉴스로 주요 기술주 흐름을 함께 확인할 필요가 있습니다."

    if re.search(r"코스피|코스닥|증시|주식", title):
        return "증시 전반의 방향성과 수급 변화를 확인할 수 있는 주요 뉴스입니다."

    if re.search(r"미국|나스닥|S&P|연준", title):
        return "미국 시장 흐름이 국내 주식과 24시간 거래 종목에 영향을 줄 수 있습니다."

    return "시장 흐름과 투자 심리를 판단할 때 참고할 만한 주요 이슈입니다."


def fetch_news():
    rss_urls = [
        "https://news.google.com/rss/search?q=한국+경제+증시&hl=ko&gl=KR&ceid=KR:ko",
        "https://news.google.com/rss/search?q=코스피+코스닥+증시&hl=ko&gl=KR&ceid=KR:ko",
        "https://news.google.com/rss/search?q=주식시장+경제+속보&hl=ko&gl=KR&ceid=KR:ko",
        "https://news.google.com/rss/search?q=삼성전자+SK하이닉스+반도체&hl=ko&gl=KR&ceid=KR:ko",
        "https://news.google.com/rss/search?q=환율+금리+증시&hl=ko&gl=KR&ceid=KR:ko",
        "https://news.google.com/rss/search?q=미국증시+나스닥+S%26P500&hl=ko&gl=KR&ceid=KR:ko",
        "https://news.google.com/rss/search?q=자동차+2차전지+주식&hl=ko&gl=KR&ceid=KR:ko",
        "https://news.google.com/rss/search?q=AI+반도체+주식시장&hl=ko&gl=KR&ceid=KR:ko",
    ]

    news = []

    for rss_url in rss_urls:
        try:
            feed = feedparser.parse(rss_url)

            for entry in feed.entries[:15]:
                title = entry.get("title", "제목 없음")
                news.append({
                    "title": title,
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "source": "Google News",
                    "category": categorize_news_item(title),
                    "summary": summarize_news_item(title),
                })

        except Exception as e:
            print("뉴스 불러오기 오류:", e)

    unique_news = []
    seen_titles = set()

    for item in news:
        if item["title"] not in seen_titles:
            unique_news.append(item)
            seen_titles.add(item["title"])

    return unique_news[:60]



HYPER_KR_COIN_CANDIDATES = {
    # 실제 Hyperliquid 화면 기준
    # URL: app.hyperliquid.xyz/trade/xyz:SAMSUNG / xyz:SKHYNIX / xyz:HYUNDAI
    # 차트 표시 심볼: xyz:SMSNUSD / xyz:SKHXUSD / xyz:HYUNDAIUSD
    # Hyperliquid API는 HIP-3 종목에서 dex prefix 방식과 dex 필드 방식이 섞여 동작할 수 있어
    # 아래 후보들을 순서대로 모두 시도합니다.
    "SMSN": ["xyz:SAMSUNG", "xyz:SMSNUSD", "SAMSUNG", "SMSNUSD", "SMSN"],
    "SKHX": ["xyz:SKHYNIX", "xyz:SKHXUSD", "SKHYNIX", "SKHXUSD", "SKHX"],
    "HYUNDAI": ["xyz:HYUNDAI", "xyz:HYUNDAIUSD", "HYUNDAI", "HYUNDAIUSD"],
}

HYPER_KR_SEARCH_KEYWORDS = {
    "SMSN": ["SAMSUNG", "SMSN"],
    "SKHX": ["SKHYNIX", "SKHX"],
    "HYUNDAI": ["HYUNDAI"],
}


def get_hyper_interval_ms(interval):
    interval = str(interval or "5m").lower()
    mapping = {
        "1m": 60 * 1000,
        "5m": 5 * 60 * 1000,
        "15m": 15 * 60 * 1000,
        "30m": 30 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "4h": 4 * 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000,
    }
    return mapping.get(interval, mapping["5m"])


def normalize_hyper_interval(interval):
    interval = str(interval or "5m").lower()
    allowed = {"1m", "5m", "15m", "30m", "1h", "4h", "1d"}
    return interval if interval in allowed else "5m"


def get_hyper_dynamic_candidates(symbol):
    # allMids/meta를 통해 실제 xyz DEX에 등록된 이름을 한 번 더 찾아봅니다.
    # 실패해도 고정 후보로 계속 진행되므로 사이트 전체 동작에는 영향 없습니다.
    symbol = str(symbol or "").strip().upper()
    keywords = HYPER_KR_SEARCH_KEYWORDS.get(symbol, [])
    found = []

    if not keywords:
        return found

    request_bodies = [
        {"type": "allMids", "dex": "xyz"},
        {"type": "meta", "dex": "xyz"},
        {"type": "metaAndAssetCtxs", "dex": "xyz"},
    ]

    for body in request_bodies:
        try:
            res = requests.post("https://api.hyperliquid.xyz/info", json=body, headers=HEADERS, timeout=8)
            data = res.json()

            names = []

            if isinstance(data, dict):
                names.extend([str(key) for key in data.keys()])
                universe = data.get("universe") or []
                for item in universe:
                    if isinstance(item, dict):
                        names.append(str(item.get("name", "")))
                        names.append(str(item.get("coin", "")))
            elif isinstance(data, list):
                for part in data:
                    if isinstance(part, dict):
                        names.extend([str(key) for key in part.keys()])
                        universe = part.get("universe") or []
                        for item in universe:
                            if isinstance(item, dict):
                                names.append(str(item.get("name", "")))
                                names.append(str(item.get("coin", "")))

            for name in names:
                clean_name = name.strip()
                upper_name = clean_name.upper()
                if not clean_name:
                    continue

                if any(keyword in upper_name for keyword in keywords):
                    for candidate in [clean_name, upper_name]:
                        if candidate and candidate not in found:
                            found.append(candidate)
                        if not candidate.startswith("xyz:"):
                            prefixed = f"xyz:{candidate}"
                            if prefixed not in found:
                                found.append(prefixed)
        except Exception as e:
            print("Hyperliquid xyz 후보 자동 탐색 실패:", symbol, body.get("type"), e)

    return found


def build_hyper_candle_payloads(coin, interval, start_ms, now_ms):
    # 공식 문서상 HIP-3는 coin에 dex prefix를 붙이는 방식이 기본입니다.
    # 다만 일부 환경에서는 req 안에 dex 필드를 따로 넣은 요청도 동작하므로 둘 다 시도합니다.
    coin = str(coin or "").strip()
    payloads = []

    def add(req):
        payload = {"type": "candleSnapshot", "req": req}
        key = json.dumps(payload, sort_keys=True)
        if key not in seen:
            seen.add(key)
            payloads.append(payload)

    seen = set()
    base_req = {
        "coin": coin,
        "interval": interval,
        "startTime": start_ms,
        "endTime": now_ms,
    }

    add(base_req)

    if coin.startswith("xyz:"):
        bare = coin.split(":", 1)[1]
        add({**base_req, "dex": "xyz"})
        add({
            "coin": bare,
            "dex": "xyz",
            "interval": interval,
            "startTime": start_ms,
            "endTime": now_ms,
        })
    else:
        add({
            "coin": f"xyz:{coin}",
            "interval": interval,
            "startTime": start_ms,
            "endTime": now_ms,
        })
        add({**base_req, "dex": "xyz"})

    return payloads


def fetch_hyper_candles_from_api(symbol, interval="5m", limit=120):
    symbol = str(symbol or "").strip().upper()
    interval = normalize_hyper_interval(interval)
    limit = max(20, min(int(limit or 120), 300))

    base_candidates = HYPER_KR_COIN_CANDIDATES.get(symbol)
    if not base_candidates:
        raise Exception("지원하지 않는 24H 차트 종목입니다.")

    dynamic_candidates = get_hyper_dynamic_candidates(symbol)
    coin_candidates = []

    for candidate in [*dynamic_candidates, *base_candidates]:
        candidate = str(candidate or "").strip()
        if candidate and candidate not in coin_candidates:
            coin_candidates.append(candidate)

    now_ms = int(time.time() * 1000)
    start_ms = now_ms - get_hyper_interval_ms(interval) * limit
    last_error = None
    tried = []

    for coin in coin_candidates:
        for payload in build_hyper_candle_payloads(coin, interval, start_ms, now_ms):
            req = payload.get("req", {})
            request_label = req.get("coin", coin)
            if req.get("dex"):
                request_label = f"{request_label} / dex={req.get('dex')}"

            try:
                res = requests.post("https://api.hyperliquid.xyz/info", json=payload, headers=HEADERS, timeout=10)
                data = res.json()

                tried.append(request_label)

                if not isinstance(data, list) or not data:
                    raise Exception(f"캔들 응답 없음: {request_label}")

                candles = []
                for item in data[-limit:]:
                    try:
                        candles.append({
                            "time": int(item.get("t") or item.get("T") or 0),
                            "open": float(item.get("o")),
                            "high": float(item.get("h")),
                            "low": float(item.get("l")),
                            "close": float(item.get("c")),
                            "volume": float(item.get("v") or 0),
                        })
                    except Exception:
                        continue

                if not candles:
                    raise Exception(f"유효한 캔들 없음: {request_label}")

                return {
                    "symbol": symbol,
                    "coin": request_label,
                    "interval": interval,
                    "count": len(candles),
                    "data": candles,
                    "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                }

            except Exception as e:
                last_error = e
                print("Hyperliquid 캔들 조회 실패:", symbol, request_label, e)

    tried_text = ", ".join(tried[:18])
    raise Exception(f"Hyperliquid 24H 캔들 데이터를 찾지 못했습니다: {last_error} / 시도한 심볼: {tried_text}")


def load_visitor_stats():
    try:
        if os.path.exists(VISITOR_STATS_FILE):
            with open(VISITOR_STATS_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                VISITOR_CACHE["total"] = int(saved.get("total", 0))
                VISITOR_CACHE["visitors"] = saved.get("visitors", {}) or {}
    except Exception as e:
        print("방문자 통계 파일 불러오기 오류:", e)


def save_visitor_stats():
    try:
        with open(VISITOR_STATS_FILE, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "total": VISITOR_CACHE.get("total", 0),
                    "visitors": VISITOR_CACHE.get("visitors", {}),
                    "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                },
                f,
                ensure_ascii=False,
                indent=2,
            )
    except Exception as e:
        print("방문자 통계 파일 저장 오류:", e)


def get_visitor_key(request: Request, client_id: str = ""):
    raw_client_id = str(client_id or "").strip()

    if raw_client_id:
        raw_key = f"client:{raw_client_id}"
    else:
        user_agent = request.headers.get("user-agent", "")
        forwarded = request.headers.get("x-forwarded-for", "")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
        raw_key = f"fallback:{ip}:{user_agent}"

    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def update_visitor_stats(request: Request, client_id: str = ""):
    load_visitor_stats()

    now = time.time()
    key = get_visitor_key(request, client_id)
    visitors = VISITOR_CACHE.setdefault("visitors", {})
    sessions = VISITOR_CACHE.setdefault("sessions", {})

    if key not in visitors:
        VISITOR_CACHE["total"] = int(VISITOR_CACHE.get("total", 0)) + 1
        visitors[key] = {
            "first_seen": now,
            "last_seen": now,
        }
        save_visitor_stats()
    else:
        visitors[key]["last_seen"] = now

    sessions[key] = now

    # 60초 이상 신호가 없는 사용자는 현재 접속자에서 제외합니다.
    active_sessions = {
        session_key: last_seen
        for session_key, last_seen in sessions.items()
        if now - float(last_seen) <= VISITOR_ACTIVE_WINDOW
    }
    VISITOR_CACHE["sessions"] = active_sessions

    return {
        "active": len(active_sessions),
        "total": int(VISITOR_CACHE.get("total", 0)),
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "active_window_seconds": VISITOR_ACTIVE_WINDOW,
    }


@app.get("/api/hyper-candles")
def get_hyper_candles(symbol: str = Query(...), interval: str = Query("5m"), limit: int = Query(120)):
    symbol = str(symbol or "").strip().upper()
    interval = normalize_hyper_interval(interval)
    cache_key = f"{symbol}:{interval}:{limit}"
    now = time.time()

    cached = HYPER_CANDLE_CACHE.get(cache_key)
    if cached and now - cached.get("last_update", 0) < HYPER_CANDLE_UPDATE_INTERVAL:
        return cached["payload"]

    try:
        payload = fetch_hyper_candles_from_api(symbol, interval, limit)
        HYPER_CANDLE_CACHE[cache_key] = {
            "last_update": now,
            "payload": payload,
        }
        return payload
    except Exception as e:
        return {
            "symbol": symbol,
            "interval": interval,
            "error": str(e),
            "data": [],
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }


@app.get("/api/stocks")
def get_stocks():
    now = time.time()

    if now - CACHE["last_update"] > UPDATE_INTERVAL or not CACHE["data"]:
        CACHE["data"] = fetch_stock_data()
        CACHE["last_update"] = now

    return {
        "update_interval_seconds": UPDATE_INTERVAL,
        "last_update": CACHE["last_update"],
        "data": CACHE["data"],
    }


@app.get("/api/force-update")
def force_update():
    CACHE["data"] = fetch_stock_data()
    CACHE["last_update"] = time.time()

    return {
        "message": "강제 업데이트 완료",
        "data": CACHE["data"],
    }


@app.get("/api/visit")
def record_visit(request: Request, client_id: str = Query("")):
    return update_visitor_stats(request, client_id)


@app.get("/api/visitor-stats")
def get_visitor_stats(request: Request, client_id: str = Query("")):
    return update_visitor_stats(request, client_id)


@app.get("/api/issues")
def get_issues():
    now = time.time()

    if now - NEWS_CACHE["last_update"] > NEWS_UPDATE_INTERVAL or not NEWS_CACHE["data"]:
        NEWS_CACHE["data"] = fetch_news()
        NEWS_CACHE["last_update"] = now

    return {
        "update_interval_seconds": NEWS_UPDATE_INTERVAL,
        "last_update": NEWS_CACHE["last_update"],
        "data": NEWS_CACHE["data"],
    }



@app.get("/api/investor-flow")
def get_investor_flow():
    now = time.time()

    if (
        now - INVESTOR_FLOW_CACHE["last_update"] > INVESTOR_FLOW_UPDATE_INTERVAL
        or not INVESTOR_FLOW_CACHE["data"]
    ):
        INVESTOR_FLOW_CACHE["data"] = fetch_investor_flow()
        INVESTOR_FLOW_CACHE["last_update"] = now

    return {
        "update_interval_seconds": INVESTOR_FLOW_UPDATE_INTERVAL,
        "last_update": INVESTOR_FLOW_CACHE["last_update"],
        **INVESTOR_FLOW_CACHE["data"],
    }


def parse_korean_number(value):
    text = str(value).replace(",", "").replace(" ", "").strip()

    if not text or text in ["N/A", "-", "--"]:
        return 0

    try:
        return int(float(text))
    except:
        pass

    total = 0

    jo_match = re.search(r"([\d.]+)조", text)
    eok_match = re.search(r"([\d.]+)억", text)
    man_match = re.search(r"([\d.]+)만", text)

    if jo_match:
        total += int(float(jo_match.group(1)) * 1000000000000)

    if eok_match:
        total += int(float(eok_match.group(1)) * 100000000)

    if man_match:
        total += int(float(man_match.group(1)) * 10000)

    if total > 0:
        return total

    digits = re.sub(r"[^0-9]", "", text)
    return int(digits) if digits else 0


def format_trading_value(value):
    try:
        value = int(value)
    except:
        return "데이터 없음"

    if value >= 1000000000000:
        jo = value // 1000000000000
        eok = (value % 1000000000000) // 100000000
        if eok:
            return f"{jo}조 {eok:,}억 원"
        return f"{jo}조 원"

    if value >= 100000000:
        return f"{value // 100000000:,}억 원"

    if value >= 10000:
        return f"{value // 10000:,}만 원"

    return f"{value:,}원"



def parse_investor_amount_to_won(value):
    """네이버 투자자별 매매동향 숫자를 원 단위로 변환합니다.
    투자자별 매매동향 페이지의 금액은 보통 '억원' 단위 숫자로 제공됩니다.
    예: -1,234 -> -1,234억 원
    """
    text = str(value).replace(",", "").replace(" ", "").strip()

    if not text or text in ["N/A", "-", "--"]:
        return 0

    sign = -1 if text.startswith("-") else 1
    text = text.replace("+", "").replace("-", "")

    try:
        return int(float(text) * 100000000) * sign
    except:
        pass

    parsed = parse_korean_number(text)
    return parsed * sign


def format_investor_amount(value):
    try:
        value = int(value)
    except:
        return "데이터 없음"

    sign = "+" if value > 0 else "-" if value < 0 else ""
    abs_value = abs(value)

    if abs_value >= 1000000000000:
        jo = abs_value // 1000000000000
        eok = (abs_value % 1000000000000) // 100000000
        if eok:
            return f"{sign}{jo}조 {eok:,}억 원"
        return f"{sign}{jo}조 원"

    if abs_value >= 100000000:
        return f"{sign}{abs_value // 100000000:,}억 원"

    if abs_value >= 10000:
        return f"{sign}{abs_value // 10000:,}만 원"

    return f"{sign}{abs_value:,}원"


def build_investor_item(name, amount):
    amount = int(amount)
    return {
        "name": name,
        "amount": amount,
        "amount_text": format_investor_amount(amount),
        "direction": "순매수" if amount > 0 else "순매도" if amount < 0 else "중립",
        "is_buying": amount > 0,
    }


def summarize_investor_flow(markets):
    totals = {
        "개인": 0,
        "외국인": 0,
        "기관": 0,
    }

    for market in markets:
        for item in market.get("investors", []):
            if item["name"] in totals:
                totals[item["name"]] += int(item.get("amount", 0))

    total_items = [build_investor_item(name, amount) for name, amount in totals.items()]
    strongest = max(total_items, key=lambda item: abs(item["amount"]), default=None)

    if strongest and strongest["amount"] != 0:
        summary = f"{strongest['name']}이(가) {strongest['amount_text']} {strongest['direction']}하며 시장 수급을 주도하고 있습니다."
    else:
        summary = "개인·외국인·기관 수급이 뚜렷하게 한쪽으로 쏠리지 않은 상태입니다."

    return {
        "name": "전체",
        "investors": total_items,
        "summary": summary,
    }


def fetch_naver_investor_flow_market(market_name, sosok):
    # 네이버 금융 투자자별 매매동향: sosok=01 코스피, sosok=02 코스닥
    url = f"https://finance.naver.com/sise/investorDealTrendDay.naver?sosok={sosok}"

    res = requests.get(url, headers=HEADERS, timeout=10)
    html = normalize_naver_response(res)
    soup = BeautifulSoup(html, "html.parser")

    rows = soup.select("table.type_1 tr") or soup.select("tr")

    for row in rows:
        cols = row.select("td")

        if len(cols) < 4:
            continue

        texts = [col.get_text(" ", strip=True) for col in cols]

        # 일반적인 컬럼 구조: 날짜, 개인, 외국인, 기관계, ...
        if not re.search(r"\d{2}\.\d{2}", texts[0]) and not re.search(r"\d{4}", texts[0]):
            continue

        individual = parse_investor_amount_to_won(texts[1])
        foreigner = parse_investor_amount_to_won(texts[2])
        institution = parse_investor_amount_to_won(texts[3])

        investors = [
            build_investor_item("개인", individual),
            build_investor_item("외국인", foreigner),
            build_investor_item("기관", institution),
        ]

        strongest = max(investors, key=lambda item: abs(item["amount"]), default=None)

        if strongest and strongest["amount"] != 0:
            summary = f"{market_name}에서는 {strongest['name']}이(가) {strongest['amount_text']} {strongest['direction']} 흐름을 보이고 있습니다."
        else:
            summary = f"{market_name} 수급은 뚜렷한 쏠림 없이 중립에 가깝습니다."

        return {
            "market": market_name,
            "date": texts[0],
            "investors": investors,
            "summary": summary,
            "source": url,
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }

    raise Exception(f"{market_name} 투자자 수급 데이터를 찾지 못했습니다.")


def fetch_investor_flow():
    markets = []
    errors = []

    for market_name, sosok in [("코스피", "01"), ("코스닥", "02")]:
        try:
            markets.append(fetch_naver_investor_flow_market(market_name, sosok))
        except Exception as e:
            print("투자자 수급 데이터 오류:", market_name, e)
            errors.append({"market": market_name, "error": str(e)})

    total = summarize_investor_flow(markets) if markets else {
        "name": "전체",
        "investors": [
            build_investor_item("개인", 0),
            build_investor_item("외국인", 0),
            build_investor_item("기관", 0),
        ],
        "summary": "투자자 수급 데이터를 불러오지 못했습니다.",
    }

    return {
        "standard": "네이버 금융 투자자별 매매동향 기준, 금액은 억 원 단위 원화 환산",
        "summary": total.get("summary", ""),
        "total": total,
        "markets": markets,
        "errors": errors,
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


def detect_kr_market_standard():
    now = time.localtime()
    weekday = now.tm_wday
    current_minutes = now.tm_hour * 60 + now.tm_min

    if weekday >= 5:
        return "휴장: 최근 거래일 거래대금 기준"

    if 9 * 60 <= current_minutes <= 15 * 60 + 30:
        return "장중: 실시간 누적 거래대금 기준"

    return "장마감: 최근 정규장 거래대금 기준"


def normalize_naver_response(res):
    # 네이버 금융은 PC 페이지가 EUC-KR로 내려오는 경우가 많아서 인코딩 보정이 필요합니다.
    if not res.encoding or res.encoding.lower() in ["iso-8859-1", "ascii"]:
        res.encoding = "euc-kr"
    return res.text


def extract_trading_value_from_row(cols):
    # 네이버 거래대금 페이지의 일반적인 컬럼 구조:
    # N, 종목명, 현재가, 전일비, 등락률, 거래량, 거래대금, 매수호가, 매도호가, 시가총액, PER, ROE
    texts = [col.get_text(" ", strip=True) for col in cols]

    if len(texts) >= 7:
        value = parse_korean_number(texts[6])
        if value > 0:
            # 네이버 거래대금은 보통 백만원 단위 숫자로 표기됩니다.
            # 화면 값이 너무 작으면 원 단위로 환산합니다.
            return value * 1000000 if value < 100000000 else value

    numeric_values = [parse_korean_number(text) for text in texts if parse_korean_number(text) > 0]

    if len(numeric_values) >= 4:
        # 거래대금은 보통 현재가/등락률/거래량 뒤쪽에 오므로 앞 숫자들은 제외합니다.
        candidate = max(numeric_values[3:])
        return candidate * 1000000 if candidate < 100000000 else candidate

    return 0


def fetch_naver_trading_value_rank():
    market_pages = [
        {"sosok": 0, "exchange": "KOSPI"},
        {"sosok": 1, "exchange": "KOSDAQ"},
    ]

    results = []

    for market in market_pages:
        urls = [
            f"https://finance.naver.com/sise/sise_amount.naver?sosok={market['sosok']}",
            f"https://finance.naver.com/sise/sise_market_sum.naver?sosok={market['sosok']}",
        ]

        for url in urls:
            try:
                res = requests.get(url, headers=HEADERS, timeout=10)
                html = normalize_naver_response(res)
                soup = BeautifulSoup(html, "html.parser")

                rows = soup.select("table.type_2 tr") or soup.select("tr")

                for row in rows:
                    link = row.select_one("a[href*='code=']")
                    cols = row.select("td")

                    if not link or len(cols) < 6:
                        continue

                    href = link.get("href", "")
                    code_match = re.search(r"code=(\d+)", href)

                    if not code_match:
                        continue

                    code = code_match.group(1)
                    name = link.get_text(strip=True)

                    if not name:
                        continue

                    col_texts = [col.get_text(" ", strip=True) for col in cols]

                    price = 0
                    price_text = "데이터 없음"

                    # 종목명 다음에 나오는 숫자 중 현재가로 보이는 첫 값을 사용합니다.
                    for col_text in col_texts:
                        raw = col_text.replace(",", "").strip()
                        if raw.isdigit():
                            candidate = int(raw)
                            if candidate > 0:
                                price = candidate
                                price_text = f"₩{price:,}"
                                break

                    trading_value = extract_trading_value_from_row(cols)

                    if trading_value <= 0:
                        continue

                    results.append({
                        "name": name,
                        "symbol": code,
                        "exchange": market["exchange"],
                        "type": "stock",
                        "tvSymbol": f"KRX:{code}",
                        "price": price_text,
                        "price_number": price,
                        "trading_value": trading_value,
                        "trading_value_text": format_trading_value(trading_value),
                        "news_count": format_trading_value(trading_value),
                        "score": trading_value,
                        "standard": detect_kr_market_standard(),
                        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "source": url,
                    })

            except Exception as e:
                print("네이버 거래대금 순위 불러오기 오류:", market["exchange"], url, e)

    # 중복 종목 제거
    unique = {}
    for item in results:
        code = item["symbol"]
        if code not in unique or item["trading_value"] > unique[code]["trading_value"]:
            unique[code] = item

    ranked = sorted(unique.values(), key=lambda x: x["trading_value"], reverse=True)
    return ranked[:10]


def fallback_watchlist_from_current_stocks():
    # 거래대금 페이지 수집 실패 시에도 관심종목 화면이 비지 않도록 현재 대시보드 종목을 임시 표시합니다.
    data = CACHE.get("data") or []

    if not data:
        try:
            data = fetch_stock_data()
            CACHE["data"] = data
            CACHE["last_update"] = time.time()
        except Exception as e:
            print("관심종목 fallback 데이터 생성 오류:", e)
            data = []

    ranked = sorted(
        data,
        key=lambda item: abs(parsePercentValueForBackend(item.get("percent_from_base", "0"))),
        reverse=True,
    )

    fallback = []

    for item in ranked[:10]:
        symbol = item.get("krx_code") or item.get("symbol", "")
        tv_symbol = item.get("tvSymbol") or (f"KRX:{symbol}" if item.get("market") == "KR" else item.get("symbol", ""))

        fallback.append({
            "name": item.get("name", "이름 없음"),
            "symbol": symbol,
            "exchange": "KRX" if item.get("market") == "KR" else item.get("market", ""),
            "type": "stock",
            "tvSymbol": tv_symbol,
            "price": item.get("price", "데이터 없음"),
            "price_number": item.get("price_number", 0),
            "trading_value": 0,
            "trading_value_text": "거래대금 수집 실패",
            "news_count": "거래대금 수집 실패",
            "score": abs(parsePercentValueForBackend(item.get("percent_from_base", "0"))),
            "standard": "거래대금 수집 실패: 현재 대시보드 종목 변동률 기준 임시 표시",
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source": "fallback:/api/stocks",
        })

    return fallback


def parsePercentValueForBackend(value):
    if not value:
        return 0

    try:
        return float(str(value).replace("%", "").replace("+", ""))
    except:
        return 0


@app.get("/api/watchlist")
def get_watchlist():
    ranked = fetch_naver_trading_value_rank()

    if ranked:
        return {
            "standard": detect_kr_market_standard(),
            "sort_by": "trading_value",
            "data": ranked,
        }

    fallback = fallback_watchlist_from_current_stocks()

    return {
        "standard": "거래대금 데이터를 불러오지 못해 임시 fallback 데이터를 표시합니다.",
        "sort_by": "fallback_percent_change",
        "data": fallback,
    }

@app.get("/api/search-symbols")
def search_symbols(q: str = Query(...)):
    keyword = q.lower().replace(" ", "")
    results = []

    krx_symbols = load_krx_symbols()

    for item in krx_symbols:
        name = item.get("name", "")
        symbol = item.get("symbol", "")
        exchange = item.get("exchange", "")
        item_type = item.get("type", "")

        if (
            keyword in name.lower().replace(" ", "")
            or keyword in symbol.lower().replace(" ", "")
            or keyword in exchange.lower().replace(" ", "")
            or keyword in item_type.lower().replace(" ", "")
        ):
            results.append(item)

    overseas_data = [
        {"name": "Apple", "symbol": "AAPL", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:AAPL"},
        {"name": "Tesla", "symbol": "TSLA", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:TSLA"},
        {"name": "NVIDIA", "symbol": "NVDA", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:NVDA"},
        {"name": "Microsoft", "symbol": "MSFT", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:MSFT"},
        {"name": "MicroStrategy", "symbol": "MSTR", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:MSTR"},

        {"name": "Amazon", "symbol": "AMZN", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:AMZN"},
        {"name": "Meta Platforms", "symbol": "META", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:META"},
        {"name": "Alphabet Class A", "symbol": "GOOGL", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:GOOGL"},
        {"name": "Alphabet Class C", "symbol": "GOOG", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:GOOG"},
        {"name": "Netflix", "symbol": "NFLX", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:NFLX"},
        {"name": "AMD", "symbol": "AMD", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:AMD"},
        {"name": "Palantir", "symbol": "PLTR", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:PLTR"},
        {"name": "Broadcom", "symbol": "AVGO", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:AVGO"},
        {"name": "Oracle", "symbol": "ORCL", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:ORCL"},
        {"name": "Adobe", "symbol": "ADBE", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:ADBE"},
        {"name": "Salesforce", "symbol": "CRM", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:CRM"},
        {"name": "Cisco Systems", "symbol": "CSCO", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:CSCO"},
        {"name": "Intel", "symbol": "INTC", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:INTC"},
        {"name": "Qualcomm", "symbol": "QCOM", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:QCOM"},
        {"name": "Micron Technology", "symbol": "MU", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:MU"},
        {"name": "Applied Materials", "symbol": "AMAT", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:AMAT"},
        {"name": "Lam Research", "symbol": "LRCX", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:LRCX"},
        {"name": "ASML Holding", "symbol": "ASML", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:ASML"},
        {"name": "Taiwan Semiconductor", "symbol": "TSM", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:TSM"},
        {"name": "Texas Instruments", "symbol": "TXN", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:TXN"},
        {"name": "Arm Holdings", "symbol": "ARM", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:ARM"},
        {"name": "Super Micro Computer", "symbol": "SMCI", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:SMCI"},
        {"name": "Dell Technologies", "symbol": "DELL", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:DELL"},
        {"name": "IBM", "symbol": "IBM", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:IBM"},
        {"name": "ServiceNow", "symbol": "NOW", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:NOW"},
        {"name": "Snowflake", "symbol": "SNOW", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:SNOW"},
        {"name": "Datadog", "symbol": "DDOG", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:DDOG"},
        {"name": "CrowdStrike", "symbol": "CRWD", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:CRWD"},
        {"name": "Cloudflare", "symbol": "NET", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:NET"},
        {"name": "Palo Alto Networks", "symbol": "PANW", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:PANW"},
        {"name": "Zscaler", "symbol": "ZS", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:ZS"},
        {"name": "Fortinet", "symbol": "FTNT", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:FTNT"},
        {"name": "Shopify", "symbol": "SHOP", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:SHOP"},
        {"name": "Uber Technologies", "symbol": "UBER", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:UBER"},
        {"name": "Airbnb", "symbol": "ABNB", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:ABNB"},
        {"name": "Booking Holdings", "symbol": "BKNG", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:BKNG"},
        {"name": "PayPal", "symbol": "PYPL", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:PYPL"},
        {"name": "Block", "symbol": "XYZ", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:XYZ"},
        {"name": "Coinbase", "symbol": "COIN", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:COIN"},
        {"name": "Robinhood Markets", "symbol": "HOOD", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:HOOD"},
        {"name": "Circle Internet Group", "symbol": "CRCL", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:CRCL"},
        {"name": "GameStop", "symbol": "GME", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:GME"},
        {"name": "Rocket Lab", "symbol": "RKLB", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:RKLB"},
        {"name": "DraftKings", "symbol": "DKNG", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:DKNG"},

        {"name": "Visa", "symbol": "V", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:V"},
        {"name": "Mastercard", "symbol": "MA", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:MA"},
        {"name": "American Express", "symbol": "AXP", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:AXP"},
        {"name": "JPMorgan Chase", "symbol": "JPM", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:JPM"},
        {"name": "Bank of America", "symbol": "BAC", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:BAC"},
        {"name": "Morgan Stanley", "symbol": "MS", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:MS"},
        {"name": "Goldman Sachs", "symbol": "GS", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:GS"},
        {"name": "Citigroup", "symbol": "C", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:C"},
        {"name": "Wells Fargo", "symbol": "WFC", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:WFC"},
        {"name": "Berkshire Hathaway Class B", "symbol": "BRK.B", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:BRK.B"},
        {"name": "BlackRock", "symbol": "BLK", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:BLK"},
        {"name": "Charles Schwab", "symbol": "SCHW", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:SCHW"},
        {"name": "S&P Global", "symbol": "SPGI", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:SPGI"},
        {"name": "Moody's", "symbol": "MCO", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:MCO"},
        {"name": "UnitedHealth", "symbol": "UNH", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:UNH"},
        {"name": "Eli Lilly", "symbol": "LLY", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:LLY"},
        {"name": "Johnson & Johnson", "symbol": "JNJ", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:JNJ"},
        {"name": "AbbVie", "symbol": "ABBV", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:ABBV"},
        {"name": "Merck", "symbol": "MRK", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:MRK"},
        {"name": "Pfizer", "symbol": "PFE", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:PFE"},
        {"name": "Bristol Myers Squibb", "symbol": "BMY", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:BMY"},
        {"name": "Amgen", "symbol": "AMGN", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:AMGN"},
        {"name": "Gilead Sciences", "symbol": "GILD", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:GILD"},
        {"name": "Regeneron", "symbol": "REGN", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:REGN"},
        {"name": "Vertex Pharmaceuticals", "symbol": "VRTX", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:VRTX"},
        {"name": "Moderna", "symbol": "MRNA", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:MRNA"},
        {"name": "Intuitive Surgical", "symbol": "ISRG", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:ISRG"},
        {"name": "Medtronic", "symbol": "MDT", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:MDT"},
        {"name": "Boston Scientific", "symbol": "BSX", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:BSX"},
        {"name": "Thermo Fisher Scientific", "symbol": "TMO", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:TMO"},
        {"name": "Danaher", "symbol": "DHR", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:DHR"},
        {"name": "Abbott Laboratories", "symbol": "ABT", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:ABT"},
        {"name": "Walmart", "symbol": "WMT", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:WMT"},
        {"name": "Costco", "symbol": "COST", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:COST"},
        {"name": "Target", "symbol": "TGT", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:TGT"},
        {"name": "Home Depot", "symbol": "HD", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:HD"},
        {"name": "Lowe's", "symbol": "LOW", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:LOW"},
        {"name": "Nike", "symbol": "NKE", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:NKE"},
        {"name": "Lululemon", "symbol": "LULU", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:LULU"},
        {"name": "Starbucks", "symbol": "SBUX", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:SBUX"},
        {"name": "McDonald's", "symbol": "MCD", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:MCD"},
        {"name": "Chipotle Mexican Grill", "symbol": "CMG", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:CMG"},
        {"name": "Coca-Cola", "symbol": "KO", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:KO"},
        {"name": "PepsiCo", "symbol": "PEP", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:PEP"},
        {"name": "Procter & Gamble", "symbol": "PG", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:PG"},
        {"name": "Colgate-Palmolive", "symbol": "CL", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:CL"},
        {"name": "Mondelez", "symbol": "MDLZ", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:MDLZ"},
        {"name": "Kraft Heinz", "symbol": "KHC", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:KHC"},
        {"name": "Disney", "symbol": "DIS", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:DIS"},
        {"name": "Comcast", "symbol": "CMCSA", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:CMCSA"},
        {"name": "Warner Bros Discovery", "symbol": "WBD", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:WBD"},
        {"name": "Roku", "symbol": "ROKU", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:ROKU"},
        {"name": "Roblox", "symbol": "RBLX", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:RBLX"},
        {"name": "Electronic Arts", "symbol": "EA", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:EA"},
        {"name": "Take-Two Interactive", "symbol": "TTWO", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:TTWO"},
        {"name": "Ford Motor", "symbol": "F", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:F"},
        {"name": "General Motors", "symbol": "GM", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:GM"},
        {"name": "Rivian", "symbol": "RIVN", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:RIVN"},
        {"name": "Lucid Group", "symbol": "LCID", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:LCID"},
        {"name": "Toyota Motor ADR", "symbol": "TM", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:TM"},
        {"name": "Ferrari", "symbol": "RACE", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:RACE"},
        {"name": "NIO", "symbol": "NIO", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:NIO"},
        {"name": "Li Auto", "symbol": "LI", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:LI"},
        {"name": "Boeing", "symbol": "BA", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:BA"},
        {"name": "Lockheed Martin", "symbol": "LMT", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:LMT"},
        {"name": "RTX", "symbol": "RTX", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:RTX"},
        {"name": "Northrop Grumman", "symbol": "NOC", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:NOC"},
        {"name": "General Electric", "symbol": "GE", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:GE"},
        {"name": "Caterpillar", "symbol": "CAT", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:CAT"},
        {"name": "Deere", "symbol": "DE", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:DE"},
        {"name": "3M", "symbol": "MMM", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:MMM"},
        {"name": "Honeywell", "symbol": "HON", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:HON"},
        {"name": "Union Pacific", "symbol": "UNP", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:UNP"},
        {"name": "UPS", "symbol": "UPS", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:UPS"},
        {"name": "FedEx", "symbol": "FDX", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:FDX"},
        {"name": "Exxon Mobil", "symbol": "XOM", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:XOM"},
        {"name": "Chevron", "symbol": "CVX", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:CVX"},
        {"name": "ConocoPhillips", "symbol": "COP", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:COP"},
        {"name": "Occidental Petroleum", "symbol": "OXY", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:OXY"},
        {"name": "Schlumberger", "symbol": "SLB", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:SLB"},
        {"name": "NextEra Energy", "symbol": "NEE", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:NEE"},
        {"name": "Duke Energy", "symbol": "DUK", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:DUK"},
        {"name": "Realty Income", "symbol": "O", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:O"},
        {"name": "American Tower", "symbol": "AMT", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:AMT"},
        {"name": "Prologis", "symbol": "PLD", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:PLD"},
        {"name": "Marriott International", "symbol": "MAR", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:MAR"},
        {"name": "Hilton Worldwide", "symbol": "HLT", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:HLT"},
        {"name": "Las Vegas Sands", "symbol": "LVS", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:LVS"},
        {"name": "Royal Caribbean", "symbol": "RCL", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:RCL"},
        {"name": "Carnival", "symbol": "CCL", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:CCL"},
        {"name": "Delta Air Lines", "symbol": "DAL", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:DAL"},
        {"name": "United Airlines", "symbol": "UAL", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:UAL"},
        {"name": "American Airlines", "symbol": "AAL", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:AAL"},
        {"name": "Spotify", "symbol": "SPOT", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:SPOT"},
        {"name": "MercadoLibre", "symbol": "MELI", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:MELI"},
        {"name": "Sea Limited", "symbol": "SE", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:SE"},
        {"name": "Alibaba", "symbol": "BABA", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:BABA"},
        {"name": "PDD Holdings", "symbol": "PDD", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:PDD"},
        {"name": "Baidu", "symbol": "BIDU", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:BIDU"},
        {"name": "JD.com", "symbol": "JD", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:JD"},
        {"name": "Sony Group", "symbol": "SONY", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:SONY"},
        {"name": "Novo Nordisk", "symbol": "NVO", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:NVO"},
        {"name": "AstraZeneca", "symbol": "AZN", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:AZN"},
        {"name": "Shell", "symbol": "SHEL", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:SHEL"},
    ]

    for item in overseas_data:
        if (
            keyword in item["name"].lower().replace(" ", "")
            or keyword in item["symbol"].lower().replace(" ", "")
            or keyword in item["exchange"].lower().replace(" ", "")
            or keyword in item["type"].lower().replace(" ", "")
        ):
            results.append(item)

    return {"results": results[:50]}




def get_us_completed_previous_close_from_daily_chart(symbol):
    # 미국 종목/지수 가격 선택 최종 버전
    # - PRE: preMarketPrice 우선
    # - REGULAR: regularMarketPrice 우선
    # - AFTER: postMarketPrice 우선
    # - CLOSED: regularMarketPrice 또는 이전 종가 기준
    # 기준가: regularMarketPreviousClose 최우선
    yahoo_symbol = str(symbol).strip()
    session_label = get_us_session_label(yahoo_symbol)

    quote_url = (
        "https://query1.finance.yahoo.com/v7/finance/quote"
        f"?symbols={yahoo_symbol}"
    )

    current = 0
    previous = 0

    try:
        quote_res = requests.get(quote_url, headers=HEADERS, timeout=10)
        quote_data = quote_res.json()
        quote_result = quote_data.get("quoteResponse", {}).get("result", [])

        if quote_result:
            quote = quote_result[0]

            previous = (
                quote.get("regularMarketPreviousClose", 0)
                or quote.get("chartPreviousClose", 0)
                or quote.get("regularMarketOpen", 0)
                or 0
            )

            regular_price = quote.get("regularMarketPrice", 0) or 0
            pre_price = quote.get("preMarketPrice", 0) or 0
            post_price = quote.get("postMarketPrice", 0) or 0

            if session_label == "PRE":
                current = pre_price or regular_price

            elif session_label == "REGULAR":
                current = regular_price or pre_price or post_price

            elif session_label == "AFTER":
                current = post_price or regular_price

            else:
                current = regular_price or previous or post_price or pre_price

    except Exception as e:
        print("Yahoo quote API 조회 오류:", yahoo_symbol, e)

    if current and previous:
        return current, previous

    # quote API가 실패하거나 값이 비어 있을 때만 chart API로 보조 조회합니다.
    intraday_url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{yahoo_symbol}?range=1d&interval=1m&includePrePost=true"
    )

    intraday_res = requests.get(intraday_url, headers=HEADERS, timeout=10)
    intraday_data = intraday_res.json()

    intraday_result = intraday_data["chart"]["result"][0]
    intraday_meta = intraday_result.get("meta", {})

    closes = (
        intraday_result
        .get("indicators", {})
        .get("quote", [{}])[0]
        .get("close", [])
    )

    valid_closes = [
        price for price in closes
        if price is not None and price > 0
    ]

    if not current:
        current = (
            valid_closes[-1]
            if valid_closes
            else intraday_meta.get("regularMarketPrice", 0)
        )

    if not previous:
        previous = (
            intraday_meta.get("regularMarketPreviousClose", 0)
            or intraday_meta.get("chartPreviousClose", 0)
        )

    if not current or not previous:
        raise Exception("미국 직전 완료 거래일 종가 데이터 부족")

    return current, previous

def fetch_yahoo_index(symbol):
    # Yahoo meta의 chartPreviousClose 값이 지수에서 실제 직전 종가와 다르게 잡히는 경우가 있어
    # ETF와 동일하게 최근 일봉 close 배열에서 직전 완료 거래일 종가를 직접 계산합니다.
    try:
        current, previous = get_us_completed_previous_close_from_daily_chart(symbol)

        if not current or not previous:
            return None

        diff = current - previous
        percent = (diff / previous) * 100

        return {
            "price": round(current, 2),
            "previous": round(previous, 2),
            "diff": round(diff, 2),
            "percent": round(percent, 2),
            "is_up": diff >= 0,
            "standard": "Yahoo 1분봉 현재가 + regularMarketPreviousClose 기준",
        }

    except Exception as e:
        print("지수 데이터 오류:", symbol, e)
        return None


@app.get("/api/market-summary")
def get_market_summary():
    indexes = [
        {"name": "코스피", "symbol": "^KS11"},
        {"name": "코스닥", "symbol": "^KQ11"},
        {"name": "S&P500", "symbol": "^GSPC"},
        {"name": "나스닥", "symbol": "^IXIC"},
        {"name": "다우존스", "symbol": "^DJI"},
        {"symbol": "KRW=X", "name": "원/달러 환율"}
    ]

    results = []

    for item in indexes:
        data = fetch_yahoo_index(item["symbol"])

        if data:
            results.append({
                "name": item["name"],
                "symbol": item["symbol"],
                **data,
            })

    up_count = len([x for x in results if x["is_up"]])
    down_count = len([x for x in results if not x["is_up"]])

    if down_count > up_count:
        mood = "약세"
        summary = "주요 지수들이 전반적으로 하락하면서 시장 분위기는 약세에 가깝습니다."
    elif up_count > down_count:
        mood = "강세"
        summary = "주요 지수들이 전반적으로 상승하면서 시장 분위기는 강세에 가깝습니다."
    else:
        mood = "혼조"
        summary = "상승 지수와 하락 지수가 섞여 있어 시장은 혼조세입니다."

    return {
        "market_mood": mood,
        "summary": summary,
        "data": results,
    }


@app.get("/api/stock-quote")
def get_stock_quote(symbol: str = Query(...), market: str = Query("KR")):
    # KR 종목/ETF는 Yahoo의 chartPreviousClose가 국내 전일 종가와 다르게 잡히는 경우가 있어
    # 기준가(어제 종가)는 네이버 일별 시세의 직전 거래일 종가로 고정합니다.
    if market == "KR":
        try:
            latest_close, previous_close = get_krx_closes(symbol)

            if not previous_close:
                raise Exception("KRX 전일 종가 데이터 부족")

            current = latest_close if latest_close else 0

            # 현재가는 Yahoo 실시간/최근가를 우선 사용하고, 실패하면 네이버 최신 종가를 사용합니다.
            for yahoo_symbol in [f"{symbol}.KS", f"{symbol}.KQ"]:
                try:
                    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?range=1d&interval=1m"
                    res = requests.get(url, headers=HEADERS, timeout=10)
                    data = res.json()

                    result = data["chart"]["result"][0]
                    meta = result["meta"]

                    yahoo_current = meta.get("regularMarketPrice", 0)

                    if yahoo_current:
                        current = yahoo_current
                        break
                except Exception as e:
                    print("KR 현재가 Yahoo 조회 오류:", yahoo_symbol, e)

            if not current:
                raise Exception("KR 현재가 데이터 부족")

            diff = current - previous_close
            percent = (diff / previous_close) * 100

            return {
                "symbol": symbol,
                "market": market,
                "price": f"₩{round(current):,}",
                "usd": "KRW",
                "base_price": round(previous_close, 2),
                "base_price_text": f"₩{round(previous_close):,}",
                "diff_from_base": f"{'+' if diff >= 0 else '-'}₩{abs(round(diff)):,}",
                "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
                "is_up": diff >= 0,
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "status": 200,
                "standard": "KRX 직전 거래일 종가 기준",
                "session_label": get_kr_reference_session_label(),
            }

        except Exception as e:
            print("KR 검색 종목 가격 오류:", symbol, e)

            return {
                "symbol": symbol,
                "market": market,
                "price": "데이터 없음",
                "usd": "",
                "base_price_text": "데이터 없음",
                "diff_from_base": "계산 불가",
                "percent_from_base": "0.00%",
                "is_up": False,
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "status": 404,
                "session_label": get_kr_reference_session_label(),
            }

    for yahoo_symbol in [symbol]:
        try:
            us_session_label = get_us_session_label(yahoo_symbol)

            if get_us_24h_path(yahoo_symbol):
                # 검색/개별 조회도 기본 미국 종목과 같은 기준으로 맞춥니다.
                # 현재가와 기준가 모두 kr-stocks.com 24H 페이지를 우선 사용합니다.
                current, previous, source_url, status_code = get_us_24h_quote(yahoo_symbol)
            else:
                current, previous = get_us_completed_previous_close_from_daily_chart(yahoo_symbol)
                source_url = "Yahoo quote/chart"
                status_code = 200

            if not current or not previous:
                continue

            diff = current - previous
            percent = (diff / previous) * 100

            return {
                "symbol": symbol,
                "market": market,
                "price": f"${current:,.2f}",
                "usd": f"${current:,.2f}",
                "base_price": round(previous, 2),
                "base_price_text": f"${previous:,.2f}",
                "diff_from_base": f"{'+' if diff >= 0 else '-'}${abs(diff):,.2f}",
                "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
                "is_up": diff >= 0,
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "status": status_code,
                "standard": "kr-stocks.com 24H 현재가 + kr-stocks.com 정규장 종가 우선 기준" if get_us_24h_path(yahoo_symbol) else "Yahoo 세션별 현재가 + 직전 정규장 종가 기준",
                "source": source_url,
                "session_label": "24H" if get_us_24h_path(yahoo_symbol) else us_session_label,
                "is_24h_supported": bool(get_us_24h_path(yahoo_symbol)),
            }

        except Exception as e:
            print("검색 종목 가격 오류:", yahoo_symbol, e)

    return {
        "symbol": symbol,
        "market": market,
        "price": "데이터 없음",
        "usd": "",
        "base_price_text": "데이터 없음",
        "diff_from_base": "계산 불가",
        "percent_from_base": "0.00%",
        "is_up": False,
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "status": 404,
        "session_label": get_kr_reference_session_label() if market == "KR" else get_us_session_label(symbol),
    }

@app.get("/api/search-24h-stocks")
def search_24h_stocks(q: str = Query("")):
    keyword = q.lower().replace(" ", "")

    supported_stocks = [
        stock for stock in STOCKS
        if stock.get("path") and stock.get("krx_code")
    ]

    results = []

    for stock in supported_stocks:
        name = stock.get("name", "")
        symbol = stock.get("symbol", "")
        krx_code = stock.get("krx_code", "")

        if keyword:
            if (
                keyword not in name.lower().replace(" ", "")
                and keyword not in symbol.lower().replace(" ", "")
                and keyword not in krx_code.lower().replace(" ", "")
            ):
                continue

        session_label = get_kr_session_label()

        try:
            usd_price = ""
            fx_rate = 0
            source = ""
            status = 200

            if session_label == "KRX":
                current_price, base_price, source_text = get_kr_regular_quote(stock["krx_code"])
                usd_price = source_text
                source = "https://finance.naver.com/item/sise_day.naver?code=" + stock["krx_code"]

            elif session_label == "NXT":
                current_price, base_price, source_text = get_kr_nxt_reference_quote(stock["krx_code"])
                usd_price = source_text
                source = "NXT 참고:/api/search-24h-stocks"

            else:
                current_price, base_price, usd_price, fx_rate, source, status = get_kr_24h_quote(stock)

            diff = current_price - base_price
            percent = (diff / base_price) * 100

            results.append({
                "name": stock["name"],
                "symbol": stock["symbol"],
                "market": "KR",
                "quote_type": "24H",
                "krx_code": stock["krx_code"],
                "tvSymbol": f"KRX:{stock['krx_code']}",
                "price": f"₩{round(current_price):,}",
                "price_number": round(current_price, 2),
                "usd": usd_price,
                "fx_rate": fx_rate,
                "base_price": round(base_price, 2),
                "base_price_text": f"₩{round(base_price):,}",
                "diff_from_base": f"{'+' if diff >= 0 else '-'}₩{abs(round(diff)):,}",
                "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
                "is_up": diff >= 0,
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "source": source,
                "status": status,
                "is_24h_supported": True,
                "session_label": session_label,
            })

        except Exception as e:
            print("24시간 지원 종목 검색 오류:", stock["name"], e)

    return {
        "standard": "24시간 시세 지원 국내 종목만 표시",
        "count": len(results),
        "data": results,
    }

# =========================
# 투자자 수급 수집 보강 버전
# - 기존 기능은 그대로 두고 /api/investor-flow가 호출할 fetch_investor_flow만 재정의합니다.
# - 1순위: KB증권 모바일 투자자별 매매동향
# - 2순위: 네이버 투자자별 매매동향 일자별 페이지
# =========================

def _safe_texts_from_row(row):
    return [cell.get_text(" ", strip=True) for cell in row.select("th, td")]


def _extract_signed_number_text(value):
    text = str(value or "").replace("\xa0", " ").strip()
    match = re.search(r"[-+]?\d[\d,]*(?:\.\d+)?", text)
    return match.group(0) if match else ""


def _parse_investor_table_rows_from_html(html, source_url):
    soup = BeautifulSoup(html, "html.parser")
    markets = {}

    for table in soup.select("table"):
        rows = table.select("tr")
        if not rows:
            continue

        header = []
        for row in rows[:4]:
            texts = _safe_texts_from_row(row)
            joined = " ".join(texts)
            if "개인" in joined and "외국" in joined and "기관" in joined:
                header = texts
                break

        for row in rows:
            texts = _safe_texts_from_row(row)
            if len(texts) < 4:
                continue

            joined = " ".join(texts)
            market_name = None

            if "코스피" in joined or "KOSPI" in joined.upper():
                market_name = "코스피"
            elif "코스닥" in joined or "KOSDAQ" in joined.upper():
                market_name = "코스닥"

            if not market_name:
                continue

            numeric_texts = [_extract_signed_number_text(item) for item in texts[1:]]
            numeric_texts = [item for item in numeric_texts if item]

            if len(numeric_texts) < 3:
                continue

            individual_text = None
            foreign_text = None
            institution_text = None

            if header and len(header) == len(texts):
                for idx, title in enumerate(header):
                    value = _extract_signed_number_text(texts[idx])
                    if not value:
                        continue

                    if "개인" in title:
                        individual_text = value
                    elif "외국" in title:
                        foreign_text = value
                    elif "기관" in title:
                        institution_text = value

            if not (individual_text and foreign_text and institution_text):
                # KB증권 모바일 표의 일반 구조: 구분 / 외국인 / 개인 / 기관계
                # 헤더를 못 잡은 경우 이 순서를 기본값으로 사용합니다.
                foreign_text, individual_text, institution_text = numeric_texts[:3]

            individual = parse_investor_amount_to_won(individual_text)
            foreigner = parse_investor_amount_to_won(foreign_text)
            institution = parse_investor_amount_to_won(institution_text)

            markets[market_name] = {
                "market": market_name,
                "date": time.strftime("%Y-%m-%d"),
                "investors": [
                    build_investor_item("개인", individual),
                    build_investor_item("외국인", foreigner),
                    build_investor_item("기관", institution),
                ],
                "summary": "",
                "source": source_url,
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }

    for market in markets.values():
        strongest = max(market["investors"], key=lambda item: abs(item["amount"]), default=None)
        if strongest and strongest["amount"] != 0:
            market["summary"] = (
                f"{market['market']}에서는 {strongest['name']}이(가) "
                f"{strongest['amount_text']} {strongest['direction']} 흐름을 보이고 있습니다."
            )
        else:
            market["summary"] = f"{market['market']} 수급은 뚜렷한 쏠림 없이 중립에 가깝습니다."

    return [markets[key] for key in ["코스피", "코스닥"] if key in markets]


def fetch_kb_investor_flow():
    url = "https://m.kbsec.com/go.able?linkcd=m05040000"

    res = requests.get(url, headers=HEADERS, timeout=10)
    html = res.text
    markets = _parse_investor_table_rows_from_html(html, url)

    if not markets:
        raise Exception("KB증권 투자자 수급 표를 찾지 못했습니다.")

    return markets


def fetch_naver_investor_flow_all():
    # 네이버 일자별 투자자 매매동향은 날짜 파라미터가 필요한 경우가 있어
    # 최근 10일 날짜를 순차적으로 시도합니다.
    markets = []

    for day_offset in range(0, 10):
        target_time = time.time() - day_offset * 86400
        bizdate = time.strftime("%Y%m%d", time.localtime(target_time))

        urls = [
            f"https://finance.naver.com/sise/investorDealTrendDay.naver?bizdate={bizdate}&sosok=&page=1",
            f"https://finance.naver.com/sise/investorDealTrendDay.nhn?bizdate={bizdate}&sosok=&page=1",
        ]

        for url in urls:
            try:
                res = requests.get(url, headers=HEADERS, timeout=10)
                html = normalize_naver_response(res)
                soup = BeautifulSoup(html, "html.parser")

                rows = soup.select("table.type_1 tr") or soup.select("table tr") or soup.select("tr")

                for row in rows:
                    texts = _safe_texts_from_row(row)
                    if len(texts) < 4:
                        continue

                    # 일반 구조: 날짜 / 개인 / 외국인 / 기관계 ...
                    if not re.search(r"\d{2}\.\d{2}", texts[0]) and not re.search(r"\d{4}", texts[0]):
                        continue

                    individual = parse_investor_amount_to_won(texts[1])
                    foreigner = parse_investor_amount_to_won(texts[2])
                    institution = parse_investor_amount_to_won(texts[3])

                    investors = [
                        build_investor_item("개인", individual),
                        build_investor_item("외국인", foreigner),
                        build_investor_item("기관", institution),
                    ]

                    strongest = max(investors, key=lambda item: abs(item["amount"]), default=None)
                    summary = (
                        f"네이버 기준 전체 시장에서는 {strongest['name']}이(가) "
                        f"{strongest['amount_text']} {strongest['direction']} 흐름을 보이고 있습니다."
                        if strongest and strongest["amount"] != 0
                        else "네이버 기준 전체 시장 수급은 중립에 가깝습니다."
                    )

                    markets.append({
                        "market": "전체",
                        "date": texts[0],
                        "investors": investors,
                        "summary": summary,
                        "source": url,
                        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    })

                    return markets

            except Exception as e:
                print("네이버 투자자 수급 보강 조회 오류:", url, e)

    raise Exception("네이버 투자자 수급 데이터를 찾지 못했습니다.")


def fetch_investor_flow():
    errors = []
    markets = []

    try:
        markets = fetch_kb_investor_flow()
    except Exception as e:
        print("KB 투자자 수급 데이터 오류:", e)
        errors.append({"source": "KB증권", "error": str(e)})

    if not markets:
        try:
            markets = fetch_naver_investor_flow_all()
        except Exception as e:
            print("네이버 투자자 수급 데이터 오류:", e)
            errors.append({"source": "네이버 금융", "error": str(e)})

    total = summarize_investor_flow(markets) if markets else {
        "name": "전체",
        "investors": [
            build_investor_item("개인", 0),
            build_investor_item("외국인", 0),
            build_investor_item("기관", 0),
        ],
        "summary": "투자자 수급 데이터를 불러오지 못했습니다.",
    }

    return {
        "standard": "투자자별 매매동향 기준, 금액은 억 원 단위 원화 환산",
        "summary": total.get("summary", ""),
        "total": total,
        "markets": markets,
        "errors": errors,
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }