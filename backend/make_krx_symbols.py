import FinanceDataReader as fdr
import json

df = fdr.StockListing("KRX")

symbols = []

for _, row in df.iterrows():
    code = str(row["Code"]).zfill(6)
    name = str(row["Name"])
    market = str(row.get("Market", "KRX"))

    symbols.append({
        "name": name,
        "symbol": code,
        "exchange": "KRX",
        "type": market,
        "tvSymbol": f"KRX:{code}",
    })

with open("krx_symbols.json", "w", encoding="utf-8") as f:
    json.dump(symbols, f, ensure_ascii=False, indent=2)

print(f"완료: {len(symbols)}개 종목 저장됨")