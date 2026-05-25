import { useEffect, useState } from "react";

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const SITE_PASSWORD = "kr1234";

  const [stocks, setStocks] = useState([]);
  const [activeTab, setActiveTab] = useState("주식");
  const [stockMarketTab, setStockMarketTab] = useState("KR");
  const [stockSearch, setStockSearch] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);
  const [chartSearch, setChartSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [issues, setIssues] = useState([]);
  const [issueSearch, setIssueSearch] = useState("");
  const [watchlist, setWatchlist] = useState([]);
  const [etfs, setEtfs] = useState([]);
  const [time, setTime] = useState("");
  const [marketSummary, setMarketSummary] = useState(null);
  const [isControlMenuOpen, setIsControlMenuOpen] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  const tabs = ["주식", "ETF", "차트", "분석", "이슈", "관심종목"];
  const API_BASE = "http://127.0.0.1:8000";

  const ETF_BASE_DATA = [
    {
      name: "SPDR S&P 500 ETF",
      symbol: "SPY",
      market: "US",
      tvSymbol: "AMEX:SPY",
      category: "미국 대표",
      description: "S&P500 대표 ETF",
    },
    {
      name: "Invesco QQQ Trust",
      symbol: "QQQ",
      market: "US",
      tvSymbol: "NASDAQ:QQQ",
      category: "나스닥",
      description: "나스닥 100 대표 ETF",
    },
    {
      name: "Vanguard S&P 500 ETF",
      symbol: "VOO",
      market: "US",
      tvSymbol: "AMEX:VOO",
      category: "미국 대표",
      description: "장기투자형 S&P500 ETF",
    },
    {
      name: "SOXL",
      symbol: "SOXL",
      market: "US",
      tvSymbol: "AMEX:SOXL",
      category: "반도체 레버리지",
      description: "미국 반도체 3배 레버리지 ETF",
    },
    {
      name: "SOXS",
      symbol: "SOXS",
      market: "US",
      tvSymbol: "AMEX:SOXS",
      category: "반도체 인버스",
      description: "미국 반도체 3배 인버스 ETF",
    },
    {
      name: "KODEX 200",
      symbol: "069500",
      market: "KR",
      tvSymbol: "KRX:069500",
      category: "국내 대표",
      description: "코스피200 대표 ETF",
    },
    {
      name: "TIGER 미국S&P500",
      symbol: "360750",
      market: "KR",
      tvSymbol: "KRX:360750",
      category: "국내상장 해외",
      description: "국내상장 미국 S&P500 ETF",
    },
    {
      name: "KODEX 반도체",
      symbol: "091160",
      market: "KR",
      tvSymbol: "KRX:091160",
      category: "국내 반도체",
      description: "국내 반도체 테마 ETF",
    },
  ];

  const globalResetStyle = `
    html,
    body,
    #root {
      width: 100% !important;
      min-width: 100% !important;
      max-width: none !important;
      min-height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #020617 !important;
      overflow-x: hidden !important;
    }

    body {
      display: block !important;
      place-items: initial !important;
    }

    #root {
      text-align: initial !important;
    }

    * {
      box-sizing: border-box;
    }
  `;

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

  const fetchEtfs = async () => {
    try {
      const results = await Promise.all(
        ETF_BASE_DATA.map(async (etf) => {
          try {
            const res = await fetch(
              `${API_BASE}/api/stock-quote?symbol=${encodeURIComponent(etf.symbol)}&market=${etf.market}`
            );

            const data = await res.json();

            return {
              ...etf,
              price: data.price || "데이터 없음",
              usd: data.usd || "",
              base_price_text: data.base_price_text || "데이터 없음",
              diff_from_base: data.diff_from_base || "계산 불가",
              percent_from_base: data.percent_from_base || "0.00%",
              is_up: data.is_up ?? true,
              updated_at: data.updated_at || "",
            };
          } catch (err) {
            return {
              ...etf,
              price: "데이터 없음",
              usd: "",
              base_price_text: "데이터 없음",
              diff_from_base: "계산 불가",
              percent_from_base: "0.00%",
              is_up: false,
              updated_at: "",
            };
          }
        })
      );

      setEtfs(results);
    } catch (err) {
      console.error("ETF 불러오기 오류:", err);
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

  const searchStockCards = (keyword) => {
    setStockSearch(keyword);
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
    fetchEtfs();
    fetchMarketSummary();

    const stockInterval = setInterval(fetchStocks, 30000);
    const issueInterval = setInterval(fetchIssues, 300000);
    const watchlistInterval = setInterval(fetchWatchlist, 300000);
    const etfInterval = setInterval(fetchEtfs, 300000);
    const marketInterval = setInterval(fetchMarketSummary, 300000);

    return () => {
      clearInterval(stockInterval);
      clearInterval(issueInterval);
      clearInterval(watchlistInterval);
      clearInterval(etfInterval);
      clearInterval(marketInterval);
    };
  }, [isUnlocked]);

  if (!isUnlocked) {
    return (
      <div style={styles.lockPage}>
        <style>{globalResetStyle}</style>
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

    SPY: "AMEX:SPY",
    QQQ: "NASDAQ:QQQ",
    VOO: "AMEX:VOO",
    SOXL: "AMEX:SOXL",
    SOXS: "AMEX:SOXS",
    "069500": "KRX:069500",
    "360750": "KRX:360750",
    "091160": "KRX:091160",
  };

  const handleStockClick = (stock) => {
    setSelectedSymbol(stock.symbol);

    setSelectedChart({
      name: stock.name,
      symbol: stock.symbol,
      tvSymbol: stock.tvSymbol || tradingViewSymbolMap[stock.symbol] || "KRX:005930",
      price: stock.price || "",
      usd: stock.usd || "",
      percent: stock.percent_from_base || "",
      isUp: stock.is_up ?? true,
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

  const upCount = stocks.filter((stock) => stock.is_up).length;
  const downCount = stocks.filter((stock) => !stock.is_up).length;
  const krCount = stocks.filter((stock) => stock.market === "KR").length;
  const usCount = stocks.filter((stock) => stock.market === "US").length;
  const liveCount = stocks.filter((stock) => stock.is_24h_supported === true).length;

  const parsePercentValue = (value) => {
    if (!value) return 0;
    const parsed = parseFloat(String(value).replace("%", "").replace("+", ""));
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const topStockList = [...stocks]
    .sort(
      (a, b) =>
        Math.abs(parsePercentValue(b.percent_from_base)) -
        Math.abs(parsePercentValue(a.percent_from_base))
    )
    .slice(0, 5);

  const recentIssueList = filteredIssues.slice(0, 4);

  const mainIndexList = (marketSummary?.data || [])
    .filter((item) =>
      ["코스피", "코스닥", "나스닥", "S&P500", "원/달러 환율"].includes(item.name)
    )
    .slice(0, 5);

  const sideMenuItems = [
    { label: "전체 시장", tab: "주식", icon: "⌂" },
    { label: "ETF 종목", tab: "ETF", icon: "◈" },
    { label: "실시간 차트", tab: "차트", icon: "⌁" },
    { label: "시장 분석", tab: "분석", icon: "◌" },
    { label: "이슈 뉴스", tab: "이슈", icon: "▤" },
    { label: "관심종목", tab: "관심종목", icon: "☆" },
  ];

  const upcomingMenuItems = [
    { label: "투자자 흐름", icon: "FLOW" },
    { label: "AI 요약", icon: "AI" },
  ];

  const dashboardColumns = `${showLeftSidebar ? "240px " : ""}minmax(0, 1fr)${
    showRightSidebar ? " 380px" : ""
  }`;

  const renderStockCard = (stock, index) => {
    const isReference =
      stock.market === "KR" && stock.is_24h_supported !== true;

    const isNoChange =
      stock.percent_from_base === "0.00%" ||
      stock.percent_from_base === "+0.00%" ||
      stock.diff_from_base === "+₩0" ||
      stock.diff_from_base === "-₩0";

    return (
      <div
        key={`${stock.symbol}-${index}`}
        style={styles.card}
        onClick={() => handleStockClick(stock)}
      >
        <div style={styles.cardTop}>
          <div>
            <div style={styles.stockName}>{stock.name}</div>
            <div style={styles.symbol}>
              {stock.symbol}
              {stock.is_24h_supported === true && (
                <span style={styles.liveBadge}>24H</span>
              )}
            </div>
          </div>

          <div
            style={{
              ...styles.statusDot,
              backgroundColor: stock.is_up ? "#16c784" : "#ea3943",
            }}
          />
        </div>

        <div style={styles.priceLabel}>현재 가격</div>
        <div style={styles.price}>{stock.price || "데이터 없음"}</div>

        <div style={styles.usd}>
          {isReference ? "KRX 종가 참고" : stock.usd || stock.tvSymbol || ""}
        </div>

        <div style={styles.cardDivider} />

        {isReference && isNoChange ? (
          <div style={styles.noChangeText}>어제 종가 대비 변동 없음</div>
        ) : (
          <div style={styles.changeArea}>
            <div style={styles.changeLabel}>어제 종가 대비</div>

            <div
              style={{
                ...styles.percent,
                color: stock.is_up ? "#16c784" : "#ea3943",
              }}
            >
              {stock.is_up ? "▲ " : "▼ "}
              {stock.percent_from_base || "0.00%"}
            </div>

            <div
              style={{
                ...styles.diff,
                color: stock.is_up ? "#16c784" : "#ea3943",
              }}
            >
              {stock.diff_from_base || "계산 불가"}
            </div>
          </div>
        )}

        <div style={styles.bottomRow}>
          <span>어제 종가</span>
          <strong style={styles.rowValue}>{stock.base_price_text || "데이터 없음"}</strong>
        </div>

        <div style={styles.bottomRow}>
          <span>업데이트</span>
          <strong style={styles.rowValue}>{stock.updated_at || ""}</strong>
        </div>
      </div>
    );
  };

  const renderStocks = () => {
    const keyword = stockSearch.toLowerCase().replace(" ", "");

    const realtimeKrStocks = stocks.filter(
      (stock) =>
        stock.market === "KR" &&
        stock.is_24h_supported === true
    );

    const referenceKrStocks = stocks.filter(
      (stock) =>
        stock.market === "KR" &&
        stock.is_24h_supported !== true
    );

    const filteredStocks =
      stockMarketTab === "KR"
        ? realtimeKrStocks
        : stockMarketTab === "NXT"
        ? referenceKrStocks
        : stocks.filter((stock) => stock.market === stockMarketTab);

    const displayStocks = keyword
      ? filteredStocks.filter((stock) => {
          return (
            stock.name?.toLowerCase().replace(" ", "").includes(keyword) ||
            stock.symbol?.toLowerCase().replace(" ", "").includes(keyword) ||
            stock.krx_code?.toLowerCase().replace(" ", "").includes(keyword)
          );
        })
      : filteredStocks;

    const displayRealtimeKrStocks = keyword
      ? displayStocks.filter((stock) => stock.is_24h_supported === true)
      : realtimeKrStocks;

    const displayReferenceKrStocks = keyword
      ? displayStocks.filter((stock) => stock.market === "KR" && stock.is_24h_supported !== true)
      : referenceKrStocks;

    return (
      <div>
        <div style={styles.stockControlRow}>
          <div style={styles.stockInnerTabs}>
            <button
              onClick={() => {
                setStockMarketTab("KR");
                setStockSearch("");
              }}
              style={{
                ...styles.stockInnerTabButton,
                background:
                  stockMarketTab === "KR"
                    ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                    : "rgba(15,23,42,0.88)",
              }}
            >
              <span style={styles.marketPrefix}>KR</span> 한국 주식
            </button>

            <button
              onClick={() => {
                setStockMarketTab("US");
                setStockSearch("");
              }}
              style={{
                ...styles.stockInnerTabButton,
                background:
                  stockMarketTab === "US"
                    ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                    : "rgba(15,23,42,0.88)",
              }}
            >
              <span style={styles.marketPrefix}>US</span> 미국 주식
            </button>

            <button
              onClick={() => {
                setStockMarketTab("NXT");
                setStockSearch("");
              }}
              style={{
                ...styles.stockInnerTabButton,
                background:
                  stockMarketTab === "NXT"
                    ? "linear-gradient(135deg, #0f766e, #0891b2)"
                    : "rgba(15,23,42,0.88)",
              }}
            >
              <span style={styles.marketPrefix}>NXT</span> 참고 시세
            </button>
          </div>

          <div style={styles.stockSearchBox}>
            <input
              style={styles.stockSearchInput}
              placeholder={
                stockMarketTab === "KR"
                  ? "실시간 한국 종목 검색..."
                  : stockMarketTab === "NXT"
                  ? "NXT 참고 시세 검색: 기아, 네이버, 카카오..."
                  : "Apple, Tesla, NVIDIA 검색..."
              }
              value={stockSearch}
              onChange={(e) => searchStockCards(e.target.value)}
            />
          </div>
        </div>

        {stockMarketTab === "KR" ? (
          <>
            <div style={styles.sectionPanel}>
              <div style={styles.sectionHeader}>
                <div>
                  <div style={styles.sectionTitle}>🔥 실시간 24시간 거래 종목 <span style={styles.liveBadge}>24H</span></div>
                  <div style={styles.sectionSub}>한국 종목 중 24시간 가격 변동이 확인되는 종목</div>
                </div>
                <div style={styles.sectionCount}>{displayRealtimeKrStocks.length}종목</div>
              </div>

              <div style={styles.grid}>
                {displayRealtimeKrStocks.map((stock, index) =>
                  renderStockCard(stock, index)
                )}
              </div>
            </div>
          </>
        ) : stockMarketTab === "NXT" ? (
          <>
            <div style={styles.sectionPanel}>
              <div style={styles.sectionHeader}>
                <div>
                  <div style={styles.sectionTitle}>📘 Yahoo/NXT 참고 시세</div>
                  <div style={styles.sectionSub}>KRX 최근 종가 기준 참고용 데이터</div>
                </div>
                <div style={styles.sectionCount}>{displayReferenceKrStocks.length}종목</div>
              </div>

              <div style={styles.grid}>
                {displayReferenceKrStocks.map((stock, index) =>
                  renderStockCard(stock, index)
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={styles.sectionPanel}>
              <div style={styles.sectionHeader}>
                <div>
                  <div style={styles.sectionTitle}>🇺🇸 미국 주식</div>
                  <div style={styles.sectionSub}>kr-stocks.com 기반 24시간 글로벌 자산 시세</div>
                </div>
                <div style={styles.sectionCount}>{displayStocks.length}종목</div>
              </div>

              <div style={styles.grid}>
                {displayStocks.map((stock, index) =>
                  renderStockCard(stock, index)
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderEtfs = () => {
    const etfList = etfs.length > 0 ? etfs : ETF_BASE_DATA;

    return (
      <div>
        <div style={styles.sectionPanel}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionTitle}>🎯 ETF 종목</div>
              <div style={styles.sectionSub}>
                미국 대표 ETF와 국내상장 주요 ETF를 한 화면에서 확인합니다.
              </div>
            </div>
            <div style={styles.sectionCount}>{etfList.length}종목</div>
          </div>

          <div style={styles.grid}>
            {etfList.map((etf, index) => (
              <div
                key={`${etf.symbol}-etf-${index}`}
                style={styles.card}
                onClick={() => {
                  setSelectedChart({
                    name: etf.name,
                    symbol: etf.symbol,
                    tvSymbol: etf.tvSymbol || tradingViewSymbolMap[etf.symbol],
                    price: etf.price || "",
                    usd: etf.usd || "",
                    percent: etf.percent_from_base || "",
                    isUp: etf.is_up ?? true,
                  });

                  setActiveTab("차트");
                }}
              >
                <div style={styles.cardTop}>
                  <div>
                    <div style={styles.stockName}>{etf.name}</div>
                    <div style={styles.symbol}>
                      {etf.symbol}
                      <span style={styles.liveBadge}>ETF</span>
                    </div>
                  </div>

                  <div
                    style={{
                      ...styles.statusDot,
                      backgroundColor: etf.is_up ? "#16c784" : "#ea3943",
                    }}
                  />
                </div>

                <div style={styles.priceLabel}>현재 가격</div>
                <div style={styles.price}>{etf.price || "데이터 없음"}</div>

                <div style={styles.usd}>{etf.category} · {etf.description}</div>

                <div style={styles.cardDivider} />

                <div style={styles.changeArea}>
                  <div style={styles.changeLabel}>어제 종가 대비</div>

                  <div
                    style={{
                      ...styles.percent,
                      color: etf.is_up ? "#16c784" : "#ea3943",
                    }}
                  >
                    {etf.is_up ? "▲ " : "▼ "}
                    {etf.percent_from_base || "0.00%"}
                  </div>

                  <div
                    style={{
                      ...styles.diff,
                      color: etf.is_up ? "#16c784" : "#ea3943",
                    }}
                  >
                    {etf.diff_from_base || "계산 불가"}
                  </div>
                </div>

                <div style={styles.bottomRow}>
                  <span>어제 종가</span>
                  <strong style={styles.rowValue}>{etf.base_price_text || "데이터 없음"}</strong>
                </div>

                <div style={styles.bottomRow}>
                  <span>업데이트</span>
                  <strong style={styles.rowValue}>{etf.updated_at || "연결 대기"}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
            <div style={{ color: currentChart.isUp ? "#16c784" : "#ea3943" }}>
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
            <div style={styles.issueSource}>거래대금 TOP {index + 1}</div>

            <div style={styles.issueTitle}>
              {item.name}
              <br />
              {item.tvSymbol}
            </div>

            <div style={styles.issueTime}>
              거래대금: {item.trading_value_text || item.news_count || "데이터 없음"}
              <br />
              기준: {item.standard || "최근 거래대금 기준"}
            </div>

            <button
              style={styles.issueButton}
              onClick={() => {
                setSelectedChart({
                  name: item.name,
                  symbol: item.symbol,
                  tvSymbol: item.tvSymbol,
                  price: item.price || "",
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

          <div style={styles.analysisSummary}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color:
                  marketSummary.market_mood === "강세"
                    ? "#16c784"
                    : "#ea3943",
                marginBottom: "12px",
              }}
            >
              현재 시장 분위기: {marketSummary.market_mood}
            </div>

            <div style={{ color: "#cbd5e1", fontSize: "16px" }}>
              {marketSummary.summary}
            </div>
          </div>

          <div style={styles.issueContainer}>
            {marketSummary.data?.map((item, index) => (
              <div key={index} style={styles.issueCard}>
                <div style={styles.issueSource}>{item.symbol}</div>

                <div style={styles.issueTitle}>{item.name}</div>

                <div style={styles.analysisPrice}>{item.price}</div>

                <div
                  style={{
                    color: item.is_up ? "#16c784" : "#ea3943",
                    fontSize: "24px",
                    fontWeight: "bold",
                    marginBottom: "12px",
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
      switch (activeTab) {
        case "주식":
          return renderStocks();

        case "ETF":
          return renderEtfs();

        case "차트":
          return renderChart();

        case "분석":
          return renderAnalysis();

        case "이슈":
          return renderIssues();

        case "관심종목":
          return renderWatchlist();

        default:
          return null;
      }
    };

    return (
      <div style={styles.app}>
        <style>{globalResetStyle}</style>
        <div style={styles.topBar}>
          <div style={styles.topInner}>
            <div style={styles.brandArea}>
              <button
                type="button"
                style={styles.menuIcon}
                onClick={() => setIsControlMenuOpen((prev) => !prev)}
              >
                ☰
              </button>

              {isControlMenuOpen && (
                <div style={styles.controlMenu}>
                  <div style={styles.controlMenuHeader}>
                    <div>
                      <div style={styles.controlMenuTitle}>대시보드 메뉴</div>
                      <div style={styles.controlMenuSub}>보기 설정과 빠른 이동</div>
                    </div>

                    <button
                      type="button"
                      style={styles.controlCloseButton}
                      onClick={() => setIsControlMenuOpen(false)}
                    >
                      ×
                    </button>
                  </div>

                  <div style={styles.controlSectionTitle}>레이아웃</div>

                  <button
                    type="button"
                    style={styles.controlItem}
                    onClick={() => setShowLeftSidebar((prev) => !prev)}
                  >
                    <span style={styles.controlItemIcon}>{showLeftSidebar ? "ON" : "OFF"}</span>
                    왼쪽 사이드 {showLeftSidebar ? "접기" : "펼치기"}
                  </button>

                  <button
                    type="button"
                    style={styles.controlItem}
                    onClick={() => setShowRightSidebar((prev) => !prev)}
                  >
                    <span style={styles.controlItemIcon}>{showRightSidebar ? "ON" : "OFF"}</span>
                    오른쪽 사이드 {showRightSidebar ? "접기" : "펼치기"}
                  </button>

                  <button
                    type="button"
                    style={styles.controlItem}
                    onClick={() => {
                      const shouldHideBoth = showLeftSidebar || showRightSidebar;
                      setShowLeftSidebar(!shouldHideBoth);
                      setShowRightSidebar(!shouldHideBoth);
                    }}
                  >
                    <span style={styles.controlItemIcon}>ALL</span>
                    양쪽 사이드 {showLeftSidebar || showRightSidebar ? "접기" : "펼치기"}
                  </button>

                  <div style={styles.controlSectionTitle}>빠른 이동</div>

                  {sideMenuItems.map((item) => (
                    <button
                      key={`control-${item.label}`}
                      type="button"
                      style={{
                        ...styles.controlItem,
                        ...(activeTab === item.tab ? styles.controlItemActive : {}),
                      }}
                      onClick={() => {
                        setActiveTab(item.tab);
                        setIsControlMenuOpen(false);
                      }}
                    >
                      <span style={styles.controlItemIcon}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}

                  <div style={styles.controlSectionTitle}>준비 중</div>

                  {upcomingMenuItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      style={styles.controlItem}
                      onClick={() => alert(`${item.label} 기능은 준비 중입니다.`)}
                    >
                      <span style={styles.controlItemIcon}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              <div style={styles.logoMark}>K</div>
              <div style={styles.logoWrap}>
                <div style={styles.logo}>KR Stocks</div>
                <div style={styles.logoSub}>
                  한국 · 미국 주식 24시간 글로벌 대시보드
                </div>
              </div>
            </div>

            <div style={styles.topEmptySpace} />

            <div style={styles.headerStatus}>
              <div style={styles.liveStatusDot} />
              <span>실시간 업데이트</span>
              <strong>{time || "--:--:--"}</strong>
            </div>
          </div>
        </div>

        <div
          style={{
            ...styles.dashboardShell,
            gridTemplateColumns: dashboardColumns,
          }}
        >
          {showLeftSidebar && (
          <aside style={styles.leftSidebar}>
            <div style={styles.sidebarBlockTitle}>시장 개요</div>

            <div style={styles.sidebarMenu}>
              {sideMenuItems.map((item) => (
                <button
                  key={item.label}
                  style={{
                    ...styles.sidebarButton,
                    ...(activeTab === item.tab ? styles.sidebarButtonActive : {}),
                  }}
                  onClick={() => setActiveTab(item.tab)}
                >
                  <span style={styles.sidebarIcon}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <div style={styles.sidebarDivider} />

            <div style={styles.sidebarBlockTitle}>오늘의 한 줄 요약</div>
            <div style={styles.sidebarSummaryText}>
              상승 종목 {upCount}개 · 하락 종목 {downCount}개 기준으로 시장 흐름을 확인 중입니다.
            </div>

            <button
              style={styles.sidebarSmallButton}
              onClick={() => setActiveTab("분석")}
            >
              자세히 보기
            </button>

            <div style={styles.sidebarFooter}>© KR Stocks</div>
          </aside>
          )}

          <main style={styles.mainArea}>
            <div style={styles.hero}>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>전체 종목</div>
                  <div style={styles.summaryValue}>{stocks.length}</div>
                </div>

                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>상승 종목</div>
                  <div style={{ ...styles.summaryValue, color: "#16c784" }}>
                    {upCount}
                  </div>
                </div>

                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>하락 종목</div>
                  <div style={{ ...styles.summaryValue, color: "#ea3943" }}>
                    {downCount}
                  </div>
                </div>

                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>한국 종목</div>
                  <div style={styles.summaryValue}>{krCount}</div>
                </div>

                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>미국 종목</div>
                  <div style={styles.summaryValue}>{usCount}</div>
                </div>

                <div style={styles.summaryCard}>
                  <div style={styles.summaryLabel}>24시간 지원</div>
                  <div style={styles.summaryValue}>{liveCount}</div>
                  <div style={styles.summaryMiniBadge}>24H</div>
                </div>
              </div>
            </div>

            {renderContent()}
          </main>

          {showRightSidebar && (
          <aside style={styles.rightSidebar}>
            <div style={styles.sidePanel}>
              <div style={styles.sidePanelTitle}>마지막 업데이트</div>
              <div style={styles.sidePanelTime}>{time || "--:--:--"}</div>
              <div style={styles.sidePanelDate}>{new Date().toLocaleDateString()}</div>
            </div>

            <div style={styles.sidePanel}>
              <div style={styles.sidePanelHeader}>
                <div style={styles.sidePanelTitle}>주요 이슈</div>
                <button style={styles.sidePanelMore} onClick={() => setActiveTab("이슈")}>
                  더보기
                </button>
              </div>

              {recentIssueList.length > 0 ? (
                recentIssueList.map((issue, index) => (
                  <div key={`${issue.title}-${index}`} style={styles.compactIssue}>
                    <div style={styles.compactIssueTitle}>{issue.title}</div>
                    <div style={styles.compactIssueTime}>{issue.published}</div>
                  </div>
                ))
              ) : (
                <div style={styles.emptySideText}>이슈 데이터를 불러오는 중입니다.</div>
              )}
            </div>

            <div style={styles.sidePanel}>
              <div style={styles.sidePanelHeader}>
                <div style={styles.sidePanelTitle}>주요 지수</div>
                <button style={styles.sidePanelMore} onClick={() => setActiveTab("분석")}>
                  보기
                </button>
              </div>

              {mainIndexList.length > 0 ? (
                mainIndexList.map((item, index) => (
                  <div
                    key={`${item.symbol}-index-${index}`}
                    style={styles.topStockRow}
                    onClick={() => setActiveTab("분석")}
                  >
                    <span style={styles.topStockRank}>{index + 1}</span>
                    <span style={styles.topStockName}>{item.name}</span>
                    <span style={styles.topStockPrice}>
                      {item.name === "원/달러 환율"
                        ? `₩${Number(item.price || 0).toLocaleString()}`
                        : Number(item.price || 0).toLocaleString()}
                    </span>
                    <span
                      style={{
                        ...styles.topStockPercent,
                        color: item.is_up ? "#16c784" : "#ea3943",
                      }}
                    >
                      {item.is_up ? "▲" : "▼"} {item.percent > 0 ? "+" : ""}
                      {item.percent}%
                    </span>
                  </div>
                ))
              ) : (
                <div style={styles.emptySideText}>주요 지수 데이터를 불러오는 중입니다.</div>
              )}
            </div>
          </aside>
          )}
        </div>
      </div>
    );
}

const styles = {
  app: {
    width: "100vw",
    minHeight: "100vh",
    overflowX: "hidden",
    background:
      "radial-gradient(circle at 8% 0%, rgba(37,99,235,0.16), transparent 26%), radial-gradient(circle at 92% 4%, rgba(14,165,233,0.10), transparent 28%), #020617",
    color: "white",
    fontFamily:
      "'Pretendard', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    paddingBottom: "28px",
  },

  topBar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(18px)",
    background: "rgba(2,6,23,0.92)",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
  },

  topInner: {
    width: "100%",
    maxWidth: "100%",
    margin: "0",
    padding: "16px 28px",
    display: "grid",
    gridTemplateColumns: "minmax(280px, 360px) minmax(420px, 1fr) minmax(220px, 280px)",
    alignItems: "center",
    gap: "20px",
    boxSizing: "border-box",
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  menuIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#dbeafe",
    fontSize: "20px",
    background: "rgba(15,23,42,0.86)",
    border: "1px solid rgba(148,163,184,0.18)",
    cursor: "pointer",
    position: "relative",
  },

  controlMenu: {
    position: "absolute",
    top: "58px",
    left: "24px",
    width: "292px",
    padding: "14px",
    borderRadius: "16px",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(8,14,27,0.98))",
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "0 26px 90px rgba(0,0,0,0.45)",
    zIndex: 300,
  },

  controlMenuHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
    marginBottom: "10px",
  },

  controlMenuTitle: {
    fontSize: "16px",
    fontWeight: "950",
    color: "#f8fafc",
  },

  controlMenuSub: {
    marginTop: "4px",
    color: "#8ea2bd",
    fontSize: "12px",
    fontWeight: "700",
  },

  controlCloseButton: {
    width: "28px",
    height: "28px",
    borderRadius: "9px",
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(15,23,42,0.8)",
    color: "#cbd5e1",
    fontSize: "18px",
    fontWeight: "900",
    cursor: "pointer",
  },

  controlSectionTitle: {
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "950",
    margin: "12px 0 7px",
  },

  controlItem: {
    width: "100%",
    height: "38px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 10px",
    marginBottom: "6px",
    borderRadius: "11px",
    border: "1px solid transparent",
    background: "transparent",
    color: "#d6e0f1",
    fontSize: "13px",
    fontWeight: "850",
    textAlign: "left",
    cursor: "pointer",
  },

  controlItemActive: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    border: "1px solid rgba(96,165,250,0.42)",
    color: "white",
  },

  controlItemIcon: {
    minWidth: "34px",
    height: "20px",
    padding: "0 6px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(30,41,59,0.88)",
    color: "#bfdbfe",
    fontSize: "10px",
    fontWeight: "950",
  },

  logoMark: {
    width: "30px",
    height: "30px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #2563eb, #16c784)",
    color: "white",
    fontSize: "15px",
    fontWeight: "950",
    boxShadow: "0 10px 28px rgba(37,99,235,0.32)",
  },

  logoWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  logo: {
    fontSize: "26px",
    fontWeight: "950",
    letterSpacing: "-0.045em",
    lineHeight: 1,
  },

  logoSub: {
    color: "#9fb0c8",
    fontSize: "13px",
    fontWeight: "700",
  },

  topEmptySpace: {
    minWidth: 0,
    width: "100%",
  },

  tabContainer: {
    display: "none",
    justifyContent: "center",
    gap: "10px",
  },

  tab: {
    minWidth: "86px",
    padding: "12px 18px",
    borderRadius: "10px",
    background: "transparent",
    color: "#d6e0f1",
    border: "1px solid transparent",
    cursor: "pointer",
    fontWeight: "900",
  },

  activeTab: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "white",
    border: "1px solid rgba(96,165,250,0.58)",
    boxShadow: "0 12px 28px rgba(37,99,235,0.32)",
  },

  headerStatus: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "9px",
    color: "#b8c7dc",
    fontSize: "13px",
    fontWeight: "800",
  },

  liveStatusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#16c784",
    boxShadow: "0 0 14px rgba(22,199,132,0.75)",
  },

  dashboardShell: {
    width: "100%",
    maxWidth: "100%",
    minHeight: "calc(100vh - 72px)",
    display: "grid",
    gridTemplateColumns: "240px minmax(0, 1fr) 380px",
    gap: "18px",
    padding: "18px 22px 0",
    boxSizing: "border-box",
  },

  leftSidebar: {
    minWidth: 0,
    position: "sticky",
    top: "90px",
    alignSelf: "start",
    minHeight: "calc(100vh - 112px)",
    borderRadius: "16px",
    padding: "18px",
    boxSizing: "border-box",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(8,14,27,0.96))",
    border: "1px solid rgba(148,163,184,0.13)",
    boxShadow: "0 18px 58px rgba(0,0,0,0.20)",
  },

  sidebarBlockTitle: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: "950",
    marginBottom: "10px",
  },

  sidebarMenu: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginBottom: "20px",
  },

  sidebarButton: {
    width: "100%",
    height: "40px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 12px",
    borderRadius: "11px",
    background: "transparent",
    border: "1px solid transparent",
    color: "#aebdd3",
    fontSize: "14px",
    fontWeight: "850",
    cursor: "pointer",
    textAlign: "left",
  },

  sidebarButtonActive: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "white",
    border: "1px solid rgba(96,165,250,0.36)",
  },

  sidebarIcon: {
    width: "20px",
    color: "inherit",
    fontWeight: "950",
  },

  sidebarDivider: {
    height: "1px",
    background: "rgba(148,163,184,0.14)",
    margin: "20px 0",
  },

  sidebarSummaryText: {
    color: "#d6e0f1",
    fontSize: "14px",
    fontWeight: "700",
    lineHeight: 1.65,
    marginBottom: "14px",
  },

  sidebarSmallButton: {
    width: "100%",
    height: "38px",
    borderRadius: "10px",
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.68)",
    color: "#dbeafe",
    fontWeight: "900",
    cursor: "pointer",
  },

  sidebarFooter: {
    position: "absolute",
    left: "18px",
    bottom: "16px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
  },

  mainArea: {
    minWidth: 0,
  },

  rightSidebar: {
    minWidth: 0,
    position: "sticky",
    top: "90px",
    alignSelf: "start",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  sidePanel: {
    minWidth: 0,
    overflow: "hidden",
    borderRadius: "16px",
    padding: "18px",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.94), rgba(8,14,27,0.96))",
    border: "1px solid rgba(148,163,184,0.14)",
    boxShadow: "0 18px 58px rgba(0,0,0,0.20)",
  },

  sidePanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  sidePanelTitle: {
    fontSize: "15px",
    fontWeight: "950",
    color: "#f8fafc",
  },

  sidePanelMore: {
    border: "none",
    background: "transparent",
    color: "#93a4bb",
    fontWeight: "800",
    cursor: "pointer",
  },

  sidePanelTime: {
    fontSize: "34px",
    fontWeight: "950",
    letterSpacing: "-0.06em",
    marginTop: "12px",
  },

  sidePanelDate: {
    marginTop: "8px",
    color: "#9fb0c8",
    fontSize: "13px",
    fontWeight: "800",
  },

  compactIssue: {
    padding: "11px 0",
    borderBottom: "1px solid rgba(148,163,184,0.10)",
  },

  compactIssueTitle: {
    color: "#dbeafe",
    fontSize: "13px",
    fontWeight: "800",
    lineHeight: 1.45,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  compactIssueTime: {
    color: "#7f91aa",
    fontSize: "12px",
    marginTop: "5px",
    fontWeight: "700",
  },

  emptySideText: {
    color: "#8ea2bd",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  topStockRow: {
    display: "grid",
    gridTemplateColumns: "24px 1fr auto auto",
    alignItems: "center",
    gap: "8px",
    padding: "9px 0",
    borderBottom: "1px solid rgba(148,163,184,0.09)",
    cursor: "pointer",
  },

  topStockRank: {
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: "900",
  },

  topStockName: {
    color: "#dbeafe",
    fontSize: "13px",
    fontWeight: "850",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  topStockPrice: {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: "850",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "86px",
  },

  topStockPercent: {
    fontSize: "12px",
    fontWeight: "950",
    whiteSpace: "nowrap",
  },

  hero: {
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.82), rgba(2,6,23,0.92))",
    border: "1px solid rgba(148,163,184,0.14)",
    borderRadius: "16px",
    padding: "14px",
    marginBottom: "14px",
    boxShadow: "0 20px 70px rgba(0,0,0,0.22)",
  },

  heroTitle: {
    fontSize: "0px",
    height: "0px",
    overflow: "hidden",
    margin: 0,
  },

  heroSub: {
    color: "#94a3b8",
    fontSize: "0px",
    height: "0px",
    overflow: "hidden",
    margin: 0,
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: "10px",
    marginBottom: 0,
  },

  summaryCard: {
    minHeight: "80px",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(8,14,27,0.98))",
    borderRadius: "13px",
    padding: "12px 10px",
    border: "1px solid rgba(148,163,184,0.14)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035)",
    textAlign: "center",
    boxSizing: "border-box",
  },

  summaryLabel: {
    color: "#b8c7dc",
    fontSize: "12px",
    marginBottom: "8px",
    fontWeight: "900",
  },

  summaryValue: {
    fontSize: "26px",
    fontWeight: "950",
    letterSpacing: "-0.04em",
    lineHeight: 1,
  },

  summaryTime: {
    fontSize: "22px",
    fontWeight: "950",
    letterSpacing: "-0.04em",
    lineHeight: 1.1,
  },

  summaryDate: {
    color: "#8ea2bd",
    fontSize: "12px",
    marginTop: "8px",
    fontWeight: "700",
  },

  summaryMiniBadge: {
    display: "inline-block",
    marginTop: "7px",
    padding: "3px 9px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #16c784, #0ea56c)",
    color: "white",
    fontSize: "10px",
    fontWeight: "950",
  },

  updateText: {
    color: "#94a3b8",
    fontSize: "13px",
    textAlign: "right",
    fontWeight: "700",
  },

  stockControlRow: {
    display: "grid",
    gridTemplateColumns: "minmax(460px, 660px) minmax(260px, 360px)",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    marginBottom: "14px",
  },

  stockInnerTabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
    width: "100%",
  },

  stockInnerTabButton: {
    padding: "10px 18px",
    borderRadius: "10px",
    border: "1px solid rgba(148,163,184,0.14)",
    color: "white",
    fontWeight: "950",
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },

  marketPrefix: {
    fontSize: "10px",
    marginRight: "5px",
    color: "#e5e7eb",
    fontWeight: "950",
  },

  stockSearchBox: {
    width: "100%",
    maxWidth: "100%",
  },

  stockSearchInput: {
    width: "100%",
    height: "42px",
    borderRadius: "11px",
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.88)",
    color: "white",
    padding: "0 15px",
    fontSize: "13px",
    boxSizing: "border-box",
    outline: "none",
  },

  sectionPanel: {
    background:
      "linear-gradient(180deg, rgba(2,6,23,0.40), rgba(2,6,23,0.24))",
    border: "1px solid rgba(148,163,184,0.14)",
    borderRadius: "16px",
    padding: "15px",
    marginBottom: "14px",
    boxShadow: "0 18px 58px rgba(0,0,0,0.18)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "14px",
  },

  sectionTitle: {
    fontSize: "20px",
    fontWeight: "950",
    letterSpacing: "-0.035em",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  sectionSub: {
    color: "#9fb0c8",
    marginTop: "5px",
    fontSize: "12px",
    fontWeight: "700",
  },

  sectionCount: {
    fontSize: "14px",
    fontWeight: "950",
    color: "#b8c7dc",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "13px",
    marginBottom: 0,
  },

  card: {
    minWidth: 0,
    overflow: "hidden",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(8,14,27,0.98))",
    borderRadius: "13px",
    padding: "17px 18px 14px",
    border: "1px solid rgba(148,163,184,0.16)",
    cursor: "pointer",
    boxShadow:
      "0 16px 42px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.035)",
    minHeight: "226px",
    boxSizing: "border-box",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },

  stockName: {
    maxWidth: "220px",
    fontSize: "clamp(17px, 1.18vw, 20px)",
    fontWeight: "950",
    letterSpacing: "-0.045em",
    lineHeight: 1.08,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  symbol: {
    maxWidth: "220px",
    color: "#9fb0c8",
    marginTop: "7px",
    display: "flex",
    gap: "8px",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: "800",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  liveBadge: {
    background: "linear-gradient(135deg, #16c784, #0ea56c)",
    color: "white",
    padding: "2px 7px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "950",
  },

  statusDot: {
    width: "11px",
    height: "11px",
    borderRadius: "999px",
    boxShadow: "0 0 16px currentColor",
  },

  priceLabel: {
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "850",
    marginBottom: "4px",
  },

  price: {
    maxWidth: "100%",
    fontSize: "clamp(22px, 1.75vw, 28px)",
    fontWeight: "950",
    marginBottom: "4px",
    letterSpacing: "-0.055em",
    lineHeight: 1.06,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  usd: {
    color: "#60a5fa",
    marginBottom: "13px",
    fontSize: "13px",
    fontWeight: "850",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  cardDivider: {
    height: "1px",
    background: "rgba(148,163,184,0.13)",
    marginBottom: "12px",
  },

  changeArea: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "end",
    gap: "8px",
    marginBottom: "12px",
  },

  changeLabel: {
    gridColumn: "1 / -1",
    color: "#9fb0c8",
    marginBottom: "0px",
    fontSize: "13px",
    fontWeight: "800",
  },

  percent: {
    minWidth: 0,
    fontSize: "clamp(17px, 1.25vw, 20px)",
    fontWeight: "950",
    letterSpacing: "-0.035em",
    display: "inline-block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  diff: {
    maxWidth: "120px",
    marginTop: "0px",
    fontWeight: "950",
    fontSize: "14px",
    textAlign: "right",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  noChangeText: {
    color: "#94a3b8",
    marginBottom: "13px",
    fontSize: "13px",
    fontWeight: "800",
  },

  bottomRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
    color: "#9fb0c8",
    fontSize: "13px",
    fontWeight: "800",
    gap: "12px",
    minWidth: 0,
  },

  rowValue: {
    minWidth: 0,
    maxWidth: "60%",
    textAlign: "right",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  clickHint: {
    display: "none",
  },

  chartContainer: {
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(8,14,27,0.96))",
    borderRadius: "18px",
    padding: "20px",
    border: "1px solid rgba(148,163,184,0.14)",
    boxShadow: "0 20px 70px rgba(0,0,0,0.24)",
  },

  searchBox: {
    position: "relative",
    marginBottom: "18px",
  },

  searchInput: {
    width: "100%",
    height: "48px",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,0.14)",
    background: "#020617",
    color: "white",
    padding: "0 18px",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  },

  searchResults: {
    position: "absolute",
    top: "54px",
    left: 0,
    right: 0,
    background: "#111827",
    borderRadius: "14px",
    padding: "10px",
    zIndex: 20,
    border: "1px solid rgba(148,163,184,0.14)",
  },

  resultButton: {
    width: "100%",
    textAlign: "left",
    padding: "12px",
    borderRadius: "12px",
    border: "none",
    background: "#1e293b",
    color: "white",
    marginBottom: "8px",
    cursor: "pointer",
  },

  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },

  chartTitle: {
    fontSize: "30px",
    fontWeight: "950",
    margin: 0,
  },

  chartSymbol: {
    color: "#94a3b8",
    marginTop: "4px",
  },

  chartPrice: {
    fontSize: "34px",
    fontWeight: "950",
  },

  openChartButton: {
    width: "100%",
    height: "50px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "white",
    fontWeight: "950",
    marginBottom: "18px",
    cursor: "pointer",
  },

  tvChartWrapper: {
    height: "760px",
    overflow: "hidden",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.14)",
  },

  chartInfo: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "14px",
    color: "#94a3b8",
    fontWeight: "800",
  },

  issueContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "14px",
  },

  issueCard: {
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(8,14,27,0.98))",
    borderRadius: "13px",
    padding: "18px",
    border: "1px solid rgba(148,163,184,0.14)",
    boxShadow: "0 16px 42px rgba(0,0,0,0.24)",
  },

  issueSource: {
    color: "#60a5fa",
    marginBottom: "10px",
    fontWeight: "900",
  },

  issueTitle: {
    fontSize: "18px",
    fontWeight: "950",
    marginBottom: "12px",
    lineHeight: 1.4,
  },

  issueTime: {
    color: "#94a3b8",
    marginBottom: "16px",
    fontSize: "14px",
  },

  issueButton: {
    width: "100%",
    height: "46px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "white",
    fontWeight: "900",
    cursor: "pointer",
  },

  issueSearchBox: {
    marginBottom: "18px",
  },

  issueSearchInput: {
    width: "100%",
    height: "48px",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,0.14)",
    background: "#0f172a",
    color: "white",
    padding: "0 18px",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  },

  panel: {
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(8,14,27,0.98))",
    borderRadius: "16px",
    padding: "22px",
    border: "1px solid rgba(148,163,184,0.14)",
  },

  analysisSummary: {
    background: "#111827",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "18px",
    border: "1px solid rgba(148,163,184,0.10)",
  },

  analysisPrice: {
    fontSize: "30px",
    fontWeight: "950",
    marginBottom: "10px",
  },

  lockPage: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(37,99,235,0.18), transparent 32%), #020617",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  lockBox: {
    width: "420px",
    padding: "38px",
    borderRadius: "24px",
    background: "linear-gradient(180deg, #0f172a, #080f1f)",
    textAlign: "center",
    border: "1px solid rgba(148,163,184,0.14)",
    boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
  },

  lockTitle: {
    fontSize: "42px",
    fontWeight: "950",
    marginBottom: "10px",
  },

  lockText: {
    color: "#94a3b8",
    marginBottom: "24px",
  },

  lockInput: {
    width: "100%",
    height: "54px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.14)",
    background: "#020617",
    color: "white",
    padding: "0 18px",
    boxSizing: "border-box",
    marginBottom: "14px",
    outline: "none",
  },

  lockButton: {
    width: "100%",
    height: "54px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "white",
    fontWeight: "950",
    cursor: "pointer",
  },
};

export default App;