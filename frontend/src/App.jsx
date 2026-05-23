import { useEffect, useState } from "react";

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const SITE_PASSWORD = "kr1234";

  const [stocks, setStocks] = useState([]);
  const [activeTab, setActiveTab] = useState("주식");
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);
  const [chartSearch, setChartSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [issues, setIssues] = useState([]);
  const [issueSearch, setIssueSearch] = useState("");
  const [watchlist, setWatchlist] = useState([]);
  const [time, setTime] = useState("");

  const [marketSummary, setMarketSummary] = useState(null);
  
  const tabs = ["주식", "차트", "분석", "이슈", "관심종목"];

  const API_BASE = "https://kr-stocks-backend.onrender.com";

  const handleLogin = () => {
    if (passwordInput === SITE_PASSWORD) {
      setIsUnlocked(true);
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const fetchStocks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stocks`);
      const data = await res.json();

      const newStocks = data.data || [];
      setStocks(newStocks);
      setSelectedSymbol((prev) => prev || newStocks[0]?.symbol || null);
      setTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("데이터 불러오기 오류:", err);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/issues`);
      const data = await res.json();
      setIssues(data.data || []);
    } catch (err) {
      console.error("이슈 불러오기 오류:", err);
    }
  };

  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/watchlist`);
      const data = await res.json();
      setWatchlist(data.data || []);
    } catch (err) {
      console.error("관심종목 불러오기 오류:", err);
    }
  };

  const fetchMarketSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/market-summary`);
      const data = await res.json();
      setMarketSummary(data);
    } catch (err) {
      console.error("시장 분석 불러오기 오류:", err);
    }
  };

  const searchCharts = async (keyword) => {
    setChartSearch(keyword);

    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/search-symbols?q=${encodeURIComponent(keyword)}`
      );

      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error("차트 검색 오류:", err);
    }
  };

  useEffect(() => {
    if (!isUnlocked) return;

    fetchStocks();
    fetchIssues();
    fetchWatchlist();
    fetchMarketSummary();

    const stockInterval = setInterval(fetchStocks, 30000);
    const issueInterval = setInterval(fetchIssues, 300000);
    const watchlistInterval = setInterval(fetchWatchlist, 300000);
    const marketInterval = setInterval(fetchMarketSummary, 300000);

    return () => {
      clearInterval(stockInterval);
      clearInterval(issueInterval);
      clearInterval(watchlistInterval);
      clearInterval(marketInterval);
    };
  }, [isUnlocked]);

  if (!isUnlocked) {
    return (
      <div style={styles.lockPage}>
        <div style={styles.lockBox}>
          <h1 style={styles.lockTitle}>KR Stocks</h1>
          <p style={styles.lockText}>비밀번호를 입력하세요</p>

          <input
            style={styles.lockInput}
            type="password"
            placeholder="비밀번호"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />

          <button style={styles.lockButton} onClick={handleLogin}>
            입장하기
          </button>
        </div>
      </div>
    );
  }

  const selectedStock =
    stocks.find((stock) => stock.symbol === selectedSymbol) || stocks[0] || null;

  const tradingViewSymbolMap = {
    SMSN: "KRX:005930",
    SKHX: "KRX:000660",
    HYUNDAI: "KRX:005380",
    KIA: "KRX:000270",
    NAVER: "KRX:035420",
    KAKAO: "KRX:035720",
    LGES: "KRX:373220",
    "SAMSUNG BIO": "KRX:207940",

    AAPL: "NASDAQ:AAPL",
    TSLA: "NASDAQ:TSLA",
    NVDA: "NASDAQ:NVDA",
    MSFT: "NASDAQ:MSFT",
    AMZN: "NASDAQ:AMZN",
    META: "NASDAQ:META",
    GOOGL: "NASDAQ:GOOGL",
  };

  const handleStockClick = (stock) => {
    setSelectedSymbol(stock.symbol);

    setSelectedChart({
      name: stock.name,
      symbol: stock.symbol,
      tvSymbol: tradingViewSymbolMap[stock.symbol] || "KRX:005930",
      price: stock.price,
      usd: stock.usd,
      percent: stock.percent_from_base,
      isUp: stock.is_up,
    });

    setActiveTab("차트");
  };

  const currentChart =
    selectedChart ||
    (selectedStock && {
      name: selectedStock.name,
      symbol: selectedStock.symbol,
      tvSymbol: tradingViewSymbolMap[selectedStock.symbol] || "KRX:005930",
      price: selectedStock.price,
      usd: selectedStock.usd,
      percent: selectedStock.percent_from_base,
      isUp: selectedStock.is_up,
    });

  const filteredIssues = issues.filter((issue) => {
    const keyword = issueSearch.toLowerCase().replace(" ", "");

    if (!keyword) return true;

    return (
      issue.title.toLowerCase().replace(" ", "").includes(keyword) ||
      issue.source.toLowerCase().replace(" ", "").includes(keyword) ||
      issue.published.toLowerCase().replace(" ", "").includes(keyword)
    );
  });

  const renderStocks = () => (
    <div style={styles.grid}>
      {stocks.map((stock, index) => (
        <div key={index} style={styles.card} onClick={() => handleStockClick(stock)}>
          <div
            style={{
              ...styles.statusDot,
              backgroundColor: stock.is_up ? "#00ff88" : "#ff4d6d",
            }}
          />

          <div style={styles.stockName}>{stock.name}</div>
          <div style={styles.symbol}>{stock.symbol}</div>
          <div style={styles.price}>{stock.price}</div>
          <div style={styles.usd}>{stock.usd}</div>

          <div
            style={{
              color: stock.is_up ? "#00ff99" : "#ff4d6d",
              fontWeight: "bold",
              fontSize: "28px",
              marginTop: "10px",
            }}
          >
            {stock.percent_from_base}
          </div>

          <div
            style={{
              color: stock.is_up ? "#00ff99" : "#ff4d6d",
              marginTop: "10px",
              fontSize: "16px",
            }}
          >
            최근 종가 대비 {stock.diff_from_base}
          </div>

          <div style={styles.bottomRow}>
            <span>최근 종가: {stock.base_price_text}</span>
            <span>{stock.updated_at}</span>
          </div>

          <div style={styles.clickHint}>탭하여 차트 확인하기 →</div>
        </div>
      ))}
    </div>
  );

  const renderChart = () => {
    if (!currentChart) {
      return <div style={styles.panel}>종목을 선택해주세요.</div>;
    }

    const chartUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
      currentChart.tvSymbol
    )}`;

    return (
      <div style={styles.chartContainer}>
        <div style={styles.searchBox}>
          <input
            style={styles.searchInput}
            placeholder="차트 검색: 삼성전자, 하이닉스, 애플, TSLA, 005930..."
            value={chartSearch}
            onChange={(e) => searchCharts(e.target.value)}
          />

          {searchResults.length > 0 && (
            <div style={styles.searchResults}>
              {searchResults.map((item, index) => (
                <button
                  key={`${item.tvSymbol}-${index}`}
                  style={styles.resultButton}
                  onClick={() => {
                    setSelectedChart({
                      name: item.name,
                      symbol: item.symbol,
                      tvSymbol: item.tvSymbol,
                      price: "",
                      usd: "",
                      percent: "",
                      isUp: true,
                    });

                    setChartSearch("");
                    setSearchResults([]);
                  }}
                >
                  <strong>{item.name}</strong>
                  <br />
                  {item.tvSymbol} · {item.type}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={styles.chartHeader}>
          <div>
            <h2 style={styles.chartTitle}>{currentChart.name}</h2>
            <div style={styles.chartSymbol}>{currentChart.tvSymbol}</div>
          </div>

          <div style={styles.chartPrice}>{currentChart.price}</div>
        </div>

        <button
          style={styles.openChartButton}
          onClick={() => window.open(chartUrl, "_blank")}
        >
          {currentChart.name} 공식 차트 새 창으로 열기
        </button>

        <div style={styles.tvChartWrapper}>
          <iframe
            key={currentChart.tvSymbol}
            title={`${currentChart.name} TradingView Chart`}
            width="100%"
            height="100%"
            src={chartUrl}
            frameBorder="0"
          />
        </div>

        <div style={styles.chartInfo}>
          <div>USD 가격: {currentChart.usd || "검색 차트"}</div>
          <div style={{ color: currentChart.isUp ? "#00ff99" : "#ff4d6d" }}>
            {currentChart.percent}
          </div>
        </div>
      </div>
    );
  };

  const renderIssues = () => (
    <div>
      <div style={styles.issueSearchBox}>
        <input
          style={styles.issueSearchInput}
          placeholder="뉴스 검색: 삼성전자, 반도체, 환율, 금리, 코스피..."
          value={issueSearch}
          onChange={(e) => setIssueSearch(e.target.value)}
        />
      </div>

      <div style={styles.issueContainer}>
        {filteredIssues.map((issue, index) => (
          <div key={index} style={styles.issueCard}>
            <div style={styles.issueSource}>{issue.source}</div>
            <div style={styles.issueTitle}>{issue.title}</div>
            <div style={styles.issueTime}>{issue.published}</div>

            <button
              style={styles.issueButton}
              onClick={() => window.open(issue.link, "_blank")}
            >
              뉴스 보기
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWatchlist = () => (
    <div style={styles.issueContainer}>
      {watchlist.map((item, index) => (
        <div key={item.symbol} style={styles.issueCard}>
          <div style={styles.issueSource}>뉴스 언급 TOP {index + 1}</div>

          <div style={styles.issueTitle}>
            {item.name}
            <br />
            {item.tvSymbol}
          </div>

          <div style={styles.issueTime}>뉴스 언급 횟수: {item.news_count}회</div>

          <button
            style={styles.issueButton}
            onClick={() => {
              setSelectedChart({
                name: item.name,
                symbol: item.symbol,
                tvSymbol: item.tvSymbol,
                price: "",
                usd: "",
                percent: "",
                isUp: true,
              });

              setActiveTab("차트");
            }}
          >
            차트 보기
          </button>
        </div>
      ))}
    </div>
  );

  const renderAnalysis = () => {
    if (!marketSummary) {
      return (
        <div style={styles.panel}>
          <h2>시장 분석</h2>
          <p>시장 분석 데이터를 불러오는 중입니다...</p>
        </div>
      );
    }

    return (
      <div style={styles.panel}>
        <h2 style={{ marginBottom: "25px" }}>📊 시장 종합 분석</h2>

        <div
          style={{
            background: "#111827",
            padding: "25px",
            borderRadius: "20px",
            marginBottom: "30px",
            lineHeight: "38px",
          }}
        >
          <div
            style={{
              fontSize: "30px",
              fontWeight: "bold",
              color:
                marketSummary.market_mood === "강세"
                  ? "#00ff99"
                  : "#ff4d6d",
              marginBottom: "15px",
            }}
          >
            현재 시장 분위기: {marketSummary.market_mood}
          </div>

          <div style={{ color: "#cbd5e1", fontSize: "20px" }}>
            {marketSummary.summary}
          </div>
        </div>

        <div style={styles.issueContainer}>
          {marketSummary.data?.map((item, index) => (
            <div key={index} style={styles.issueCard}>
              <div style={styles.issueSource}>{item.symbol}</div>

              <div style={styles.issueTitle}>{item.name}</div>

              <div
                style={{
                  fontSize: "34px",
                  fontWeight: "bold",
                  marginBottom: "15px",
                }}
              >
                {item.price}
              </div>

              <div
                style={{
                  color: item.is_up ? "#00ff99" : "#ff4d6d",
                  fontSize: "28px",
                  fontWeight: "bold",
                  marginBottom: "15px",
                }}
              >
                {item.percent}%
              </div>

              <div style={styles.issueTime}>
                전일 대비: {item.diff}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === "주식") return renderStocks();
    if (activeTab === "차트") return renderChart();
    if (activeTab === "분석") return renderAnalysis();
    if (activeTab === "이슈") return renderIssues();
    if (activeTab === "관심종목") return renderWatchlist();

    return <div style={styles.panel}>{activeTab} 기능은 다음 단계에서 추가됩니다.</div>;
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>KR Stocks</h1>
          <p style={styles.subtitle}>미국 DEX 기반 한국 자산 시세</p>
        </div>

        <div style={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabButton,
                backgroundColor: activeTab === tab ? "#2563eb" : "#111827",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.topInfo}>
        <div>현재 탭: {activeTab}</div>
        <div>업데이트 주기: 30초</div>
        <div>화면 확인 시간: {time}</div>
      </div>

      {renderContent()}
    </div>
  );
}

const styles = {
  lockPage: {
    backgroundColor: "#020b24",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    fontFamily: "Arial",
  },

  lockBox: {
    background: "#08142f",
    padding: "45px",
    borderRadius: "28px",
    width: "360px",
    textAlign: "center",
    boxShadow: "0 0 25px rgba(0,0,0,0.4)",
  },

  lockTitle: {
    fontSize: "42px",
    marginBottom: "12px",
  },

  lockText: {
    color: "#94a3b8",
    marginBottom: "25px",
  },

  lockInput: {
    width: "100%",
    padding: "16px",
    borderRadius: "14px",
    border: "none",
    fontSize: "18px",
    marginBottom: "18px",
    boxSizing: "border-box",
  },

  lockButton: {
    width: "100%",
    padding: "16px",
    borderRadius: "14px",
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  page: {
    backgroundColor: "#020b24",
    minHeight: "100vh",
    padding: "40px",
    color: "white",
    fontFamily: "Arial",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "30px",
    marginBottom: "30px",
    flexWrap: "wrap",
  },

  title: {
    fontSize: "58px",
    margin: 0,
  },

  subtitle: {
    color: "#94a3b8",
    fontSize: "20px",
    marginTop: "8px",
  },

  tabs: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  tabButton: {
    border: "none",
    color: "white",
    padding: "16px 24px",
    borderRadius: "16px",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  topInfo: {
    background: "#081028",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "35px",
    fontSize: "20px",
    textAlign: "center",
    lineHeight: "34px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "30px",
  },

  card: {
    background: "#08142f",
    borderRadius: "30px",
    padding: "30px",
    position: "relative",
    boxShadow: "0 0 20px rgba(0,0,0,0.4)",
    textAlign: "center",
    cursor: "pointer",
  },

  stockName: {
    fontSize: "40px",
    fontWeight: "bold",
  },

  symbol: {
    color: "#94a3b8",
    fontSize: "24px",
    marginTop: "8px",
  },

  price: {
    fontSize: "54px",
    fontWeight: "bold",
    marginTop: "25px",
  },

  usd: {
    color: "#7dd3fc",
    fontSize: "30px",
    marginTop: "10px",
  },

  statusDot: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    position: "absolute",
    top: "25px",
    right: "25px",
  },

  bottomRow: {
    marginTop: "25px",
    display: "flex",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: "14px",
  },

  clickHint: {
    marginTop: "20px",
    color: "#60a5fa",
    fontSize: "15px",
  },

  panel: {
    background: "#08142f",
    borderRadius: "30px",
    padding: "40px",
    fontSize: "22px",
    lineHeight: "38px",
  },

  chartContainer: {
    background: "#08142f",
    borderRadius: "30px",
    padding: "40px",
  },

  searchBox: {
    marginBottom: "25px",
  },

  searchInput: {
    width: "100%",
    padding: "18px",
    borderRadius: "16px",
    border: "none",
    fontSize: "18px",
  },

  searchResults: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "15px",
  },

  resultButton: {
    background: "#111827",
    color: "white",
    border: "1px solid #2563eb",
    borderRadius: "12px",
    padding: "12px 16px",
    cursor: "pointer",
    fontSize: "15px",
    textAlign: "left",
  },

  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },

  chartTitle: {
    fontSize: "46px",
    margin: 0,
  },

  chartSymbol: {
    color: "#94a3b8",
    marginTop: "8px",
    fontSize: "22px",
  },

  chartPrice: {
    fontSize: "52px",
    fontWeight: "bold",
  },

  openChartButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "14px",
    padding: "14px 22px",
    fontSize: "17px",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "20px",
  },

  tvChartWrapper: {
    width: "100%",
    height: "650px",
    borderRadius: "20px",
    overflow: "hidden",
    backgroundColor: "#000",
  },

  chartInfo: {
    marginTop: "25px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "24px",
  },

  issueSearchBox: {
    marginBottom: "25px",
  },

  issueSearchInput: {
    width: "100%",
    padding: "18px",
    borderRadius: "16px",
    border: "none",
    fontSize: "18px",
  },

  issueContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "25px",
  },

  issueCard: {
    background: "#08142f",
    borderRadius: "24px",
    padding: "25px",
    boxShadow: "0 0 20px rgba(0,0,0,0.35)",
  },

  issueSource: {
    color: "#60a5fa",
    fontSize: "15px",
    marginBottom: "12px",
    fontWeight: "bold",
  },

  issueTitle: {
    fontSize: "21px",
    fontWeight: "bold",
    lineHeight: "32px",
    marginBottom: "14px",
  },

  issueTime: {
    color: "#94a3b8",
    fontSize: "14px",
    marginBottom: "18px",
  },

  issueButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default App;