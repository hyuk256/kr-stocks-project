from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import re
import time
import json
import os
import feedparser
from bs4 import BeautifulSoup

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STOCKS = [
    {"name": "삼성전자", "symbol": "SMSN", "market": "KR", "path": "korea/samsung", "krx_code": "005930", "yahoo": "005930.KS"},
    {"name": "SK하이닉스", "symbol": "SKHX", "market": "KR", "path": "korea/hynix", "krx_code": "000660", "yahoo": "000660.KS"},
    {"name": "현대차", "symbol": "HYUNDAI", "market": "KR", "path": "korea/hyundai", "krx_code": "005380", "yahoo": "005380.KS"},

    {"name": "기아", "symbol": "KIA", "market": "KR", "yahoo": "000270.KS"},
    {"name": "NAVER", "symbol": "NAVER", "market": "KR", "yahoo": "035420.KS"},
    {"name": "카카오", "symbol": "KAKAO", "market": "KR", "yahoo": "035720.KS"},
    {"name": "LG에너지솔루션", "symbol": "LGES", "market": "KR", "yahoo": "373220.KS"},
    {"name": "삼성바이오로직스", "symbol": "SAMSUNG BIO", "market": "KR", "yahoo": "207940.KS"},

    {"name": "Apple", "symbol": "AAPL", "market": "US", "yahoo": "AAPL"},
    {"name": "Tesla", "symbol": "TSLA", "market": "US", "yahoo": "TSLA"},
    {"name": "NVIDIA", "symbol": "NVDA", "market": "US", "yahoo": "NVDA"},
    {"name": "Microsoft", "symbol": "MSFT", "market": "US", "yahoo": "MSFT"},
    {"name": "Amazon", "symbol": "AMZN", "market": "US", "yahoo": "AMZN"},
    {"name": "Meta", "symbol": "META", "market": "US", "yahoo": "META"},
    {"name": "Google", "symbol": "GOOGL", "market": "US", "yahoo": "GOOGL"},
]

CACHE = {"last_update": 0, "data": []}
NEWS_CACHE = {"last_update": 0, "data": []}

UPDATE_INTERVAL = 30
NEWS_UPDATE_INTERVAL = 300

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "*/*",
}


def clean_number(value):
    return float(value.replace("$", "").replace("₩", "").replace(",", "").strip())


def get_krx_close(code):
    url = f"https://finance.naver.com/item/sise_day.naver?code={code}"
    res = requests.get(url, headers=HEADERS, timeout=10)
    soup = BeautifulSoup(res.text, "html.parser")

    rows = soup.select("table.type2 tr")
    for row in rows:
        cols = row.select("td")
        if len(cols) >= 2:
            close_text = cols[1].get_text(strip=True).replace(",", "")
            if close_text.isdigit():
                return int(close_text)

    return 0


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


def fetch_yahoo_stock(stock):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{stock['yahoo']}?range=2d&interval=1d"

    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        data = res.json()

        result = data["chart"]["result"][0]
        meta = result["meta"]

        current = meta.get("regularMarketPrice", 0)
        previous = meta.get("chartPreviousClose", 0)

        if not current or not previous:
            raise Exception("가격 데이터 없음")

        diff = current - previous
        percent = (diff / previous) * 100

        if stock["market"] == "KR":
            price_text = f"₩{round(current):,}"
            base_text = f"₩{round(previous):,}"
            usd_text = "KRW"
            diff_text = f"{'+' if diff >= 0 else '-'}₩{abs(round(diff)):,}"
        else:
            price_text = f"${current:,.2f}"
            base_text = f"${previous:,.2f}"
            usd_text = f"${current:,.2f}"
            diff_text = f"{'+' if diff >= 0 else '-'}${abs(diff):,.2f}"

        return {
            "name": stock["name"],
            "symbol": stock["symbol"],
            "market": stock["market"],
            "price": price_text,
            "price_number": round(current, 2),
            "usd": usd_text,
            "fx_rate": 0,
            "base_price": round(previous, 2),
            "base_price_text": base_text,
            "diff_from_base": diff_text,
            "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
            "is_up": diff >= 0,
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source": url,
            "status": res.status_code,
        }

    except Exception as e:
        return {
            "name": stock["name"],
            "symbol": stock["symbol"],
            "market": stock["market"],
            "price": "데이터 없음",
            "usd": "데이터 없음",
            "fx_rate": 0,
            "base_price_text": "데이터 없음",
            "diff_from_base": "계산 불가",
            "percent_from_base": "0.00%",
            "is_up": False,
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source": str(e),
        }


def fetch_stock_data():
    results = []

    for stock in STOCKS:
        if stock.get("path") and stock.get("krx_code"):
            url = f"https://kr-stocks.com/{stock['path']}"

            try:
                response = requests.get(url, headers=HEADERS, timeout=10)
                usd_price, fx_rate = extract_usd_and_fx(response.text)
                krx_close = get_krx_close(stock["krx_code"])

                if usd_price != "데이터 없음" and krx_close > 0:
                    current_price = round(clean_number(usd_price) * fx_rate)
                    diff = current_price - krx_close
                    percent = (diff / krx_close) * 100

                    results.append({
                        "name": stock["name"],
                        "symbol": stock["symbol"],
                        "market": stock["market"],
                        "price": f"₩{current_price:,}",
                        "price_number": current_price,
                        "usd": usd_price,
                        "fx_rate": fx_rate,
                        "base_price": krx_close,
                        "base_price_text": f"₩{krx_close:,}",
                        "diff_from_base": f"{'+' if diff >= 0 else '-'}₩{abs(diff):,}",
                        "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
                        "is_up": diff >= 0,
                        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "source": url,
                        "status": response.status_code,
                    })
                else:
                    results.append(fetch_yahoo_stock(stock))

            except Exception:
                results.append(fetch_yahoo_stock(stock))
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
                news.append({
                    "title": entry.get("title", "제목 없음"),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "source": "Google News",
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


@app.get("/api/watchlist")
def get_watchlist():
    news_data = NEWS_CACHE["data"]

    if not news_data:
        news_data = fetch_news()
        NEWS_CACHE["data"] = news_data
        NEWS_CACHE["last_update"] = time.time()

    krx_symbols = load_krx_symbols()
    scores = {}

    for stock in krx_symbols:
        name = stock.get("name", "")
        symbol = stock.get("symbol", "")

        if not name:
            continue

        count = 0

        for news in news_data:
            title = news.get("title", "")
            if name in title:
                count += 1

        if count > 0:
            scores[symbol] = {
                "name": name,
                "symbol": symbol,
                "exchange": stock.get("exchange", "KRX"),
                "type": stock.get("type", "stock"),
                "tvSymbol": stock.get("tvSymbol", f"KRX:{symbol}"),
                "news_count": count,
                "score": count,
            }

    ranked = sorted(scores.values(), key=lambda x: x["score"], reverse=True)

    return {
        "standard": "뉴스 언급량 기준 TOP 10",
        "data": ranked[:10],
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
        {"name": "Amazon", "symbol": "AMZN", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:AMZN"},
        {"name": "Meta Platforms", "symbol": "META", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:META"},
        {"name": "Alphabet Class A", "symbol": "GOOGL", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:GOOGL"},
        {"name": "Netflix", "symbol": "NFLX", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:NFLX"},
        {"name": "AMD", "symbol": "AMD", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:AMD"},
        {"name": "Palantir", "symbol": "PLTR", "exchange": "NASDAQ", "type": "stock", "tvSymbol": "NASDAQ:PLTR"},
        {"name": "SPDR S&P 500 ETF", "symbol": "SPY", "exchange": "AMEX", "type": "ETF", "tvSymbol": "AMEX:SPY"},
        {"name": "Invesco QQQ Trust", "symbol": "QQQ", "exchange": "NASDAQ", "type": "ETF", "tvSymbol": "NASDAQ:QQQ"},
        {"name": "Vanguard S&P 500 ETF", "symbol": "VOO", "exchange": "AMEX", "type": "ETF", "tvSymbol": "AMEX:VOO"},
        {"name": "SOXL", "symbol": "SOXL", "exchange": "AMEX", "type": "ETF", "tvSymbol": "AMEX:SOXL"},
        {"name": "SOXS", "symbol": "SOXS", "exchange": "AMEX", "type": "ETF", "tvSymbol": "AMEX:SOXS"},
        {"name": "Toyota Motor", "symbol": "7203", "exchange": "TSE", "type": "stock", "tvSymbol": "TSE:7203"},
        {"name": "Sony Group", "symbol": "6758", "exchange": "TSE", "type": "stock", "tvSymbol": "TSE:6758"},
        {"name": "TSMC", "symbol": "TSM", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:TSM"},
        {"name": "Alibaba", "symbol": "BABA", "exchange": "NYSE", "type": "stock", "tvSymbol": "NYSE:BABA"},
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


def fetch_yahoo_index(symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=2d&interval=1d"

    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        data = res.json()

        result = data["chart"]["result"][0]
        meta = result["meta"]

        current = meta.get("regularMarketPrice", 0)
        previous = meta.get("chartPreviousClose", 0)

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
        {"name": "미국 반도체 지수", "symbol": "^SOX"},
        {"name": "원/달러 환율", "symbol": "KRW=X"},
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
    candidates = []

    if market == "KR":
        candidates = [f"{symbol}.KS", f"{symbol}.KQ"]
    else:
        candidates = [symbol]

    for yahoo_symbol in candidates:
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?range=2d&interval=1d"

            res = requests.get(url, headers=HEADERS, timeout=10)
            data = res.json()

            result = data["chart"]["result"][0]
            meta = result["meta"]

            current = meta.get("regularMarketPrice", 0)
            previous = meta.get("chartPreviousClose", 0)

            if not current or not previous:
                continue

            diff = current - previous
            percent = (diff / previous) * 100

            if market == "KR":
                price_text = f"₩{round(current):,}"
                base_text = f"₩{round(previous):,}"
                diff_text = f"{'+' if diff >= 0 else '-'}₩{abs(round(diff)):,}"
                usd_text = "KRW"
            else:
                price_text = f"${current:,.2f}"
                base_text = f"${previous:,.2f}"
                diff_text = f"{'+' if diff >= 0 else '-'}${abs(diff):,.2f}"
                usd_text = f"${current:,.2f}"

            return {
                "symbol": symbol,
                "market": market,
                "price": price_text,
                "usd": usd_text,
                "base_price_text": base_text,
                "diff_from_base": diff_text,
                "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
                "is_up": diff >= 0,
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "status": 200,
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

        url = f"https://kr-stocks.com/{stock['path']}"

        try:
            response = requests.get(url, headers=HEADERS, timeout=10)
            usd_price, fx_rate = extract_usd_and_fx(response.text)
            krx_close = get_krx_close(stock["krx_code"])

            if usd_price != "데이터 없음" and krx_close > 0:
                current_price = round(clean_number(usd_price) * fx_rate)
                diff = current_price - krx_close
                percent = (diff / krx_close) * 100

                results.append({
                    "name": stock["name"],
                    "symbol": stock["symbol"],
                    "market": "KR",
                    "krx_code": stock["krx_code"],
                    "tvSymbol": f"KRX:{stock['krx_code']}",
                    "price": f"₩{current_price:,}",
                    "price_number": current_price,
                    "usd": usd_price,
                    "fx_rate": fx_rate,
                    "base_price": krx_close,
                    "base_price_text": f"₩{krx_close:,}",
                    "diff_from_base": f"{'+' if diff >= 0 else '-'}₩{abs(diff):,}",
                    "percent_from_base": f"{'+' if percent >= 0 else ''}{percent:.2f}%",
                    "is_up": diff >= 0,
                    "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "source": url,
                    "status": response.status_code,
                    "is_24h_supported": True,
                })

        except Exception as e:
            print("24시간 지원 종목 검색 오류:", stock["name"], e)

    return {
        "standard": "24시간 시세 지원 국내 종목만 표시",
        "count": len(results),
        "data": results,
    }