import { useEffect, useState } from "react";

function App() {
  const [isUnlocked, setIsUnlocked] = useState(true);
    const [stocks, setStocks] = useState([]);
  const [activeTab, setActiveTab] = useState("주식");
  const [stockMarketTab, setStockMarketTab] = useState("KR");
  const [stockSearch, setStockSearch] = useState("");
  const [stockLookupResults, setStockLookupResults] = useState([]);
  const [searchedStockCards, setSearchedStockCards] = useState([]);
  const [isStockLookupLoading, setIsStockLookupLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);
  const [chartSearch, setChartSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [issues, setIssues] = useState([]);
  const [issueSearch, setIssueSearch] = useState("");
  const [issueCategory, setIssueCategory] = useState("전체");
  const [watchlist, setWatchlist] = useState([]);
  const [etfs, setEtfs] = useState([]);
  const [time, setTime] = useState("");
  const [marketSummary, setMarketSummary] = useState(null);
  const [investorFlow, setInvestorFlow] = useState(null);
  const [isControlMenuOpen, setIsControlMenuOpen] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [hyperInterval, setHyperInterval] = useState("5m");
  const [hyperCandles, setHyperCandles] = useState([]);
  const [hyperChartLoading, setHyperChartLoading] = useState(false);
  const [hyperChartError, setHyperChartError] = useState("");
  const [visitorStats, setVisitorStats] = useState({ active: 0, total: 0 });
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const isMobile = windowWidth <= 768;

  const tabs = ["주식", "ETF", "차트", "분석", "이슈", "관심종목"];
  const API_BASE = "https://kr-stocks-project.onrender.com";
  const NEXA_LOGO_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="nexaBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#020617"/>
          <stop offset="100%" stop-color="#111827"/>
        </linearGradient>
        <linearGradient id="nexaMain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#2dd4bf"/>
          <stop offset="48%" stop-color="#0ea5e9"/>
          <stop offset="100%" stop-color="#2563eb"/>
        </linearGradient>
        <linearGradient id="nexaArrow" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="#2563eb"/>
          <stop offset="100%" stop-color="#5eead4"/>
        </linearGradient>
        <filter id="nexaGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.13 0 0 0 0 0.68 0 0 0 0 0.96 0 0 0 0.72 0"/>
          <feBlend in="SourceGraphic"/>
        </filter>
      </defs>
      <rect width="128" height="128" rx="30" fill="url(#nexaBg)"/>
      <path d="M37 86V32c0-5.4 4.4-9.8 9.8-9.8H58v39.4l30.7-39.4h20.6L76.2 62.1l34.2 43.7H88.8L58 65.9V106H46.8C41.4 106 37 101.6 37 96.2V86Z" fill="url(#nexaMain)" filter="url(#nexaGlow)"/>
      <path d="M19 92L38 73L53 82L72 62L84 70L107 43" fill="none" stroke="url(#nexaArrow)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M96 42H108V54" fill="none" stroke="#5eead4" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  const LOGO_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(NEXA_LOGO_SVG)}`;

  const CONTACT_EMAIL = "moonhyuk1010@gmail.com";
  const SERVICE_NOTICE =
    "NEXA는 주식 및 금융시장 정보를 제공하는 참고용 서비스이며, 특정 종목의 매수·매도 또는 투자를 권유하지 않습니다. 모든 투자 결정과 그에 따른 손익 책임은 투자자 본인에게 있습니다.";
  const DATA_SOURCES = ["Yahoo Finance", "Hyperliquid", "Google News", "TradingView", "NXT", "네이버 증권"];
  const ADMIN_KEY = "nexa-admin-2026";


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

  useEffect(() => {
    document.title = "NEXA | 24H Global Markets";

    const faviconHref = LOGO_SRC;
    let favicon = document.querySelector("link[rel='icon']");

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }

    favicon.type = "image/svg+xml";
    favicon.href = faviconHref;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
              session_label: data.session_label || "",
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

  const fetchInvestorFlow = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/investor-flow`);
      const data = await res.json();
      setInvestorFlow(data);
    } catch (err) {
      console.error("투자자 수급 불러오기 오류:", err);
    }
  };


  const getVisitorClientId = () => {
    try {
      const savedId = window.localStorage.getItem("nexa_visitor_id");

      if (savedId) {
        return savedId;
      }

      const newId = `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem("nexa_visitor_id", newId);
      return newId;
    } catch (err) {
      return `visitor-fallback-${Date.now()}`;
    }
  };

  const fetchVisitorStats = async () => {
    try {
      const clientId = getVisitorClientId();
      const res = await fetch(`${API_BASE}/api/visit?client_id=${encodeURIComponent(clientId)}`);
      const data = await res.json();

      setVisitorStats({
        active: data.active ?? 0,
        total: data.total ?? 0,
      });
    } catch (err) {
      console.error("방문자 통계 불러오기 오류:", err);
    }
  };

  const fetchHyperLiquidCandles = async (symbol, interval = hyperInterval) => {
    const targetSymbol = String(symbol || "").toUpperCase();

    if (!["SMSN", "SKHX", "HYUNDAI"].includes(targetSymbol)) {
      setHyperCandles([]);
      setHyperChartError("");
      return;
    }

    setHyperChartLoading(true);
    setHyperChartError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/hyper-candles?symbol=${encodeURIComponent(targetSymbol)}&interval=${encodeURIComponent(interval)}`
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "24H 차트 데이터를 불러오지 못했습니다.");
      }

      setHyperCandles(data.data || []);
    } catch (err) {
      console.error("24H 차트 데이터 불러오기 오류:", err);
      setHyperCandles([]);
      setHyperChartError(err.message || "24H 차트 데이터를 불러오지 못했습니다.");
    } finally {
      setHyperChartLoading(false);
    }
  };

  const normalizeSearchKeyword = (value) =>
    String(value || "").toLowerCase().replace(/\s/g, "");

  const getMarketFromSearchItem = (item) => {
    const tvSymbol = item?.tvSymbol || "";
    const exchange = String(item?.exchange || "").toUpperCase();

    if (
      tvSymbol.startsWith("KRX:") ||
      exchange.includes("KOSPI") ||
      exchange.includes("KOSDAQ") ||
      exchange.includes("KRX")
    ) {
      return "KR";
    }

    return "US";
  };

  const searchStockCards = async (keyword) => {
    setStockSearch(keyword);

    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      setStockLookupResults([]);
      setIsStockLookupLoading(false);
      return;
    }

    if (trimmedKeyword.length < 1) {
      setStockLookupResults([]);
      return;
    }

    setIsStockLookupLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/search-symbols?q=${encodeURIComponent(trimmedKeyword)}`
      );

      const data = await res.json();
      const targetMarket = stockMarketTab === "US" ? "US" : "KR";
      const filteredResults = (data.results || []).filter(
        (item) => getMarketFromSearchItem(item) === targetMarket
      );
      setStockLookupResults(filteredResults.slice(0, 12));
    } catch (err) {
      console.error("전체 시장 종목 검색 오류:", err);
      setStockLookupResults([]);
    } finally {
      setIsStockLookupLoading(false);
    }
  };

  const handleStockLookupSelect = async (item) => {
    const market = getMarketFromSearchItem(item);
    const tvSymbol =
      item.tvSymbol ||
      (market === "KR" ? `KRX:${item.symbol}` : `${item.exchange}:${item.symbol}`);

    const normalizedItemSymbol = normalizeSearchKeyword(item.symbol);
    const normalizedItemName = normalizeSearchKeyword(item.name);
    const normalizedItemTvSymbol = normalizeSearchKeyword(tvSymbol);

    const alreadyExistsInMainStocks = stocks.some((stock) => {
      const stockTvSymbol = stock.tvSymbol || tradingViewSymbolMap[stock.symbol] || "";

      return (
        stock.market === market &&
        (
          normalizeSearchKeyword(stock.symbol) === normalizedItemSymbol ||
          normalizeSearchKeyword(stock.name) === normalizedItemName ||
          normalizeSearchKeyword(stockTvSymbol) === normalizedItemTvSymbol
        )
      );
    });

    if (alreadyExistsInMainStocks) {
      setStockLookupResults([]);
      setStockSearch("");
      return;
    }

    const loadingCard = {
      name: item.name,
      symbol: item.symbol,
      market,
      tvSymbol,
      price: "불러오는 중...",
      usd: market === "KR" ? "KRX 조회 중" : "미국 시세 조회 중",
      base_price_text: "불러오는 중...",
      diff_from_base: "계산 중",
      percent_from_base: "0.00%",
      is_up: true,
      updated_at: "",
      is_24h_supported: false,
      is_lookup_result: true,
      session_label: "",
    };

    setSearchedStockCards((prev) => {
      const filtered = prev.filter((stock) => stock.tvSymbol !== tvSymbol);
      return [loadingCard, ...filtered].slice(0, 8);
    });

    try {
      const res = await fetch(
        `${API_BASE}/api/stock-quote?symbol=${encodeURIComponent(item.symbol)}&market=${market}`
      );

      const data = await res.json();

      const nextCard = {
        name: item.name,
        symbol: item.symbol,
        market,
        tvSymbol,
        price: data.price || "데이터 없음",
        usd:
          market === "KR"
            ? "KRX 조회 시세"
            : data.usd || item.exchange || "미국 시세",
        base_price: data.base_price || 0,
        base_price_text: data.base_price_text || "데이터 없음",
        diff_from_base: data.diff_from_base || "계산 불가",
        percent_from_base: data.percent_from_base || "0.00%",
        is_up: data.is_up ?? true,
        updated_at: data.updated_at || "",
        is_24h_supported: false,
        is_lookup_result: true,
        session_label: data.session_label || (market === "KR" ? "NXT" : "CLOSED"),
      };

      setSearchedStockCards((prev) => {
        const filtered = prev.filter((stock) => stock.tvSymbol !== tvSymbol);
        return [nextCard, ...filtered].slice(0, 8);
      });

      setStockLookupResults([]);
      setStockSearch("");
    } catch (err) {
      console.error("검색 종목 가격 불러오기 오류:", err);

      setSearchedStockCards((prev) => {
        const filtered = prev.filter((stock) => stock.tvSymbol !== tvSymbol);
        return [
          {
            ...loadingCard,
            price: "데이터 없음",
            usd: "가격 조회 실패",
            base_price_text: "데이터 없음",
            diff_from_base: "계산 불가",
            percent_from_base: "0.00%",
            is_up: false,
            updated_at: "",
          },
          ...filtered,
        ].slice(0, 8);
      });
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
    fetchEtfs();
    fetchMarketSummary();
    fetchInvestorFlow();
    fetchVisitorStats();

    const stockInterval = setInterval(fetchStocks, 30000);
    const issueInterval = setInterval(fetchIssues, 300000);
    const watchlistInterval = setInterval(fetchWatchlist, 300000);
    const etfInterval = setInterval(fetchEtfs, 300000);
    const marketInterval = setInterval(fetchMarketSummary, 300000);
    const investorFlowInterval = setInterval(fetchInvestorFlow, 300000);
    const visitorStatsInterval = setInterval(fetchVisitorStats, 15000);

    return () => {
      clearInterval(stockInterval);
      clearInterval(issueInterval);
      clearInterval(watchlistInterval);
      clearInterval(etfInterval);
      clearInterval(marketInterval);
      clearInterval(investorFlowInterval);
      clearInterval(visitorStatsInterval);
    };
  }, [isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;

    const targetSymbol = String(selectedChart?.symbol || selectedSymbol || "").toUpperCase();

    if (!["SMSN", "SKHX", "HYUNDAI"].includes(targetSymbol)) {
      setHyperCandles([]);
      setHyperChartError("");
      return;
    }

    fetchHyperLiquidCandles(targetSymbol, hyperInterval);

    const intervalId = setInterval(() => {
      fetchHyperLiquidCandles(targetSymbol, hyperInterval);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isUnlocked, selectedChart?.symbol, selectedSymbol, hyperInterval]);

  const isAdminPage = window.location.pathname === "/admin";
  const adminKey = new URLSearchParams(window.location.search).get("key") || "";
  const isAdminAuthorized = adminKey === ADMIN_KEY;

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
    MU: "NASDAQ:MU",

    SPY: "AMEX:SPY",
    QQQ: "NASDAQ:QQQ",
    VOO: "AMEX:VOO",
    SOXL: "AMEX:SOXL",
    SOXS: "AMEX:SOXS",
    "069500": "KRX:069500",
    "360750": "KRX:360750",
    "091160": "KRX:091160",
  };

  const hyperLiquidChartMap = {
    SMSN: {
      symbol: "SMSN",
      tvSymbol: "SMSN 24H",
      pairName: "삼성전자 24H",
      url: "https://app.hyperliquid.xyz/trade/xyz:SMSNUSD",
    },
    SKHX: {
      symbol: "SKHX",
      tvSymbol: "SKHX 24H",
      pairName: "SK하이닉스 24H",
      url: "https://app.hyperliquid.xyz/trade/xyz:SKHXUSD",
    },
    HYUNDAI: {
      symbol: "HYUNDAI",
      tvSymbol: "HYUNDAI 24H",
      pairName: "현대차 24H",
      url: "https://app.hyperliquid.xyz/trade/xyz:HYUNDAIUSD",
    },
  };

  const getHyperLiquidChartInfo = (stock) => {
    const symbol = String(stock?.symbol || "").toUpperCase();
    const name = String(stock?.name || "");

    if (hyperLiquidChartMap[symbol]) {
      return hyperLiquidChartMap[symbol];
    }

    if (name.includes("삼성전자")) {
      return hyperLiquidChartMap.SMSN;
    }

    if (name.includes("하이닉스")) {
      return hyperLiquidChartMap.SKHX;
    }

    if (name.includes("현대차")) {
      return hyperLiquidChartMap.HYUNDAI;
    }

    return null;
  };

  const handleStockClick = (stock) => {
    setSelectedSymbol(stock.symbol);

    const hyperChartInfo = getHyperLiquidChartInfo(stock);

    setSelectedChart({
      name: stock.name,
      symbol: stock.symbol,
      tvSymbol:
        hyperChartInfo?.tvSymbol ||
        stock.tvSymbol ||
        tradingViewSymbolMap[stock.symbol] ||
        "KRX:005930",
      price: stock.price || "",
      usd: hyperChartInfo ? "24H 거래소 실시간 차트" : stock.usd || "",
      percent: stock.percent_from_base || "",
      isUp: stock.is_up ?? true,
      isHyperLiquidChart: Boolean(hyperChartInfo),
      hyperLiquidPairName: hyperChartInfo?.pairName || "",
      hyperLiquidUrl: hyperChartInfo?.url || "",
    });

    setActiveTab("차트");
  };

  const currentChart =
    selectedChart ||
    (selectedStock && {
      name: selectedStock.name,
      symbol: selectedStock.symbol,
      tvSymbol:
        getHyperLiquidChartInfo(selectedStock)?.tvSymbol ||
        tradingViewSymbolMap[selectedStock.symbol] ||
        "KRX:005930",
      price: selectedStock.price,
      usd: getHyperLiquidChartInfo(selectedStock)
        ? "24H 거래소 실시간 차트"
        : selectedStock.usd,
      percent: selectedStock.percent_from_base,
      isUp: selectedStock.is_up,
      isHyperLiquidChart: Boolean(getHyperLiquidChartInfo(selectedStock)),
      hyperLiquidPairName: getHyperLiquidChartInfo(selectedStock)?.pairName || "",
      hyperLiquidUrl: getHyperLiquidChartInfo(selectedStock)?.url || "",
    });

  const issueCategoryTabs = ["전체", "경제", "증시", "기업", "정책", "글로벌"];

  const getIssueCategory = (issue) => {
    const title = String(issue?.title || "");
    const category = String(issue?.category || "");

    if (category) return category;

    if (/환율|금리|물가|부동산|경기|경제/.test(title)) return "경제";
    if (/코스피|코스닥|증시|주식|시장|나스닥|S&P|다우/.test(title)) return "증시";
    if (/삼성|하이닉스|현대|기업|실적|반도체|배터리|2차전지/.test(title)) return "기업";
    if (/정부|정책|선거|대통령|국회|규제|세금/.test(title)) return "정책";
    return "글로벌";
  };

  const getIssueSummary = (issue) => {
    if (issue?.summary) return issue.summary;

    const title = String(issue?.title || "시장 이슈").replace(/\s+/g, " ").trim();

    if (/환율|금리/.test(title)) {
      return "환율과 금리 흐름이 국내 증시와 투자심리에 영향을 주고 있습니다.";
    }

    if (/반도체|삼성|하이닉스/.test(title)) {
      return "반도체 업종 관련 뉴스로 주요 기술주 흐름을 함께 확인할 필요가 있습니다.";
    }

    if (/코스피|코스닥|증시|주식/.test(title)) {
      return "증시 전반의 방향성과 수급 변화를 확인할 수 있는 주요 뉴스입니다.";
    }

    if (/미국|나스닥|S&P|연준/.test(title)) {
      return "미국 시장 흐름이 국내 주식과 24시간 거래 종목에 영향을 줄 수 있습니다.";
    }

    return "시장 흐름과 투자 심리를 판단할 때 참고할 만한 주요 이슈입니다.";
  };

  const getIssueVisual = (issue) => {
    const category = getIssueCategory(issue);

    if (category === "경제") return { icon: "₩", gradient: "linear-gradient(135deg, #0f766e, #14b8a6)" };
    if (category === "증시") return { icon: "↗", gradient: "linear-gradient(135deg, #1d4ed8, #06b6d4)" };
    if (category === "기업") return { icon: "B", gradient: "linear-gradient(135deg, #2563eb, #7c3aed)" };
    if (category === "정책") return { icon: "P", gradient: "linear-gradient(135deg, #92400e, #f97316)" };
    return { icon: "G", gradient: "linear-gradient(135deg, #4f46e5, #9333ea)" };
  };

  const getIssueCategoryStyle = (issue) => {
    const category = getIssueCategory(issue);

    if (category === "경제") {
      return { ...styles.newsCategoryBadge, background: "rgba(22,163,74,0.18)", color: "#86efac", border: "1px solid rgba(134,239,172,0.22)" };
    }

    if (category === "증시") {
      return { ...styles.newsCategoryBadge, background: "rgba(220,38,38,0.18)", color: "#fecaca", border: "1px solid rgba(254,202,202,0.20)" };
    }

    if (category === "기업") {
      return { ...styles.newsCategoryBadge, background: "rgba(37,99,235,0.18)", color: "#bfdbfe", border: "1px solid rgba(191,219,254,0.22)" };
    }

    if (category === "정책") {
      return { ...styles.newsCategoryBadge, background: "rgba(180,83,9,0.20)", color: "#fed7aa", border: "1px solid rgba(254,215,170,0.20)" };
    }

    return { ...styles.newsCategoryBadge, background: "rgba(124,58,237,0.18)", color: "#ddd6fe", border: "1px solid rgba(221,214,254,0.20)" };
  };

  const filteredIssues = issues.filter((issue) => {
    const keyword = issueSearch.toLowerCase().replace(/\s/g, "");
    const issueCategoryName = getIssueCategory(issue);

    if (issueCategory !== "전체" && issueCategoryName !== issueCategory) {
      return false;
    }

    if (!keyword) return true;

    return (
      String(issue.title || "").toLowerCase().replace(/\s/g, "").includes(keyword) ||
      String(issue.source || "").toLowerCase().replace(/\s/g, "").includes(keyword) ||
      String(issue.published || "").toLowerCase().replace(/\s/g, "").includes(keyword) ||
      issueCategoryName.toLowerCase().replace(/\s/g, "").includes(keyword)
    );
  });

  const summaryStocks = [...stocks, ...searchedStockCards].reduce((acc, stock) => {
    const key = stock.tvSymbol || `${stock.market || ""}:${stock.symbol || stock.name}`;

    if (!key) return acc;

    const existingIndex = acc.findIndex(
      (item) => (item.tvSymbol || `${item.market || ""}:${item.symbol || item.name}`) === key
    );

    if (existingIndex >= 0) {
      acc[existingIndex] = stock;
      return acc;
    }

    acc.push(stock);
    return acc;
  }, []);

  const upCount = summaryStocks.filter((stock) => stock.is_up).length;
  const downCount = summaryStocks.filter((stock) => !stock.is_up).length;
  const krCount = summaryStocks.filter((stock) => stock.market === "KR").length;
  const usCount = summaryStocks.filter((stock) => stock.market === "US").length;
  const liveCount = stocks.filter((stock) => stock.is_24h_supported === true).length;

  const parsePercentValue = (value) => {
    if (!value) return 0;
    const parsed = parseFloat(String(value).replace("%", "").replace("+", ""));
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const topStockList = [...summaryStocks]
    .sort(
      (a, b) =>
        Math.abs(parsePercentValue(b.percent_from_base)) -
        Math.abs(parsePercentValue(a.percent_from_base))
    )
    .slice(0, 5);

  const getTopRisingStocks = (items) =>
    [...items]
      .filter((stock) => {
        const percent = parsePercentValue(stock.percent_from_base);
        return percent > 0 && stock.price && stock.price !== "데이터 없음" && stock.price !== "불러오는 중...";
      })
      .sort(
        (a, b) =>
          parsePercentValue(b.percent_from_base) -
          parsePercentValue(a.percent_from_base)
      )
      .slice(0, 3);

  const top24hRisers = getTopRisingStocks(
    stocks.filter(
      (stock) =>
        stock.market === "KR" &&
        stock.is_24h_supported === true
    )
  );

  const topNxtRisers = getTopRisingStocks(
    [...stocks, ...searchedStockCards].filter(
      (stock) =>
        stock.market === "KR" &&
        stock.is_24h_supported !== true
    )
  );

  const recentIssueList = filteredIssues.slice(0, 4);

  const mainIndexList = (marketSummary?.data || [])
    .filter((item) =>
      ["코스피", "코스닥", "나스닥", "S&P500", "원/달러 환율"].includes(item.name)
    )
    .slice(0, 5);

  const investorFlowItems = investorFlow?.total?.investors || [];
  const investorFlowMarkets = investorFlow?.markets || [];
  const investorFlowSummary =
    investorFlow?.summary || "투자자 수급 데이터를 불러오는 중입니다.";
  const investorFlowUpdatedAt = investorFlow?.updated_at || "";

  const getInvestorAmountColor = (item) => {
    if (!item || item.amount === 0) return "#cbd5e1";
    return item.is_buying ? "#16c784" : "#ea3943";
  };

  const getKoreaRealtimeSessionLabel = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const weekday = parts.find((part) => part.type === "weekday")?.value || "";
    const hourText = parts.find((part) => part.type === "hour")?.value || "0";
    const minuteText = parts.find((part) => part.type === "minute")?.value || "0";

    const hour = Number(hourText === "24" ? "0" : hourText);
    const minute = Number(minuteText);
    const currentMinutes = hour * 60 + minute;
    const isWeekend = weekday === "Sat" || weekday === "Sun";

    if (isWeekend) return "24H";

    if (currentMinutes >= 9 * 60 && currentMinutes <= 15 * 60 + 30) {
      return "KRX";
    }

    if (currentMinutes >= 15 * 60 + 40 && currentMinutes <= 20 * 60) {
      return "NXT";
    }

    return "24H";
  };

  const getSessionBadgeStyle = (label) => {
    const normalized = String(label || "").toUpperCase();

    if (normalized === "KRX" || normalized === "REGULAR") {
      return {
        ...styles.sessionBadge,
        background: "rgba(22,199,132,0.14)",
        color: "#34d399",
        border: "1px solid rgba(52,211,153,0.28)",
      };
    }

    if (normalized === "NXT" || normalized === "PRE") {
      return {
        ...styles.sessionBadge,
        background: "rgba(37,99,235,0.16)",
        color: "#93c5fd",
        border: "1px solid rgba(147,197,253,0.28)",
      };
    }

    if (normalized === "24H") {
      return {
        ...styles.sessionBadge,
        background: "rgba(20,184,166,0.16)",
        color: "#5eead4",
        border: "1px solid rgba(94,234,212,0.30)",
      };
    }

    if (normalized === "AFTER") {
      return {
        ...styles.sessionBadge,
        background: "rgba(168,85,247,0.16)",
        color: "#c4b5fd",
        border: "1px solid rgba(196,181,253,0.28)",
      };
    }

    return {
      ...styles.sessionBadge,
      background: "rgba(100,116,139,0.16)",
      color: "#cbd5e1",
      border: "1px solid rgba(203,213,225,0.18)",
    };
  };

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

  const dashboardColumns = isMobile
    ? "minmax(0, 1fr)"
    : `${showLeftSidebar ? "240px " : ""}minmax(0, 1fr)${
        showRightSidebar ? " 380px" : ""
      }`;

  const topInnerStyle = isMobile
    ? {
        ...styles.topInner,
        gridTemplateColumns: "1fr",
        padding: "12px 14px",
        gap: "10px",
      }
    : styles.topInner;

  const brandAreaStyle = isMobile
    ? {
        ...styles.brandArea,
        gap: "9px",
      }
    : styles.brandArea;

  const logoMarkStyle = isMobile
    ? {
        ...styles.logoMark,
        width: "38px",
        height: "38px",
        borderRadius: "11px",
      }
    : styles.logoMark;

  const logoStyle = isMobile
    ? {
        ...styles.logo,
        fontSize: "22px",
      }
    : styles.logo;

  const logoSubStyle = isMobile
    ? {
        ...styles.logoSub,
        fontSize: "12px",
      }
    : styles.logoSub;

  const headerStatusStyle = isMobile
    ? {
        ...styles.headerStatus,
        justifyContent: "flex-start",
        flexWrap: "wrap",
        gap: "8px",
        fontSize: "11px",
      }
    : styles.headerStatus;

  const dashboardShellStyle = isMobile
    ? {
        ...styles.dashboardShell,
        gridTemplateColumns: dashboardColumns,
        padding: "12px 10px 0",
        gap: "12px",
        minHeight: "auto",
      }
    : {
        ...styles.dashboardShell,
        gridTemplateColumns: dashboardColumns,
      };

  const moverHeroHeaderStyle = isMobile
    ? {
        ...styles.moverHeroHeader,
        flexDirection: "column",
        gap: "8px",
      }
    : styles.moverHeroHeader;

  const moverHeroGridStyle = isMobile
    ? {
        ...styles.moverHeroGrid,
        gridTemplateColumns: "1fr",
      }
    : styles.moverHeroGrid;

  const stockControlRowStyle = isMobile
    ? {
        ...styles.stockControlRow,
        gridTemplateColumns: "1fr",
        gap: "10px",
      }
    : styles.stockControlRow;

  const stockInnerTabsStyle = isMobile
    ? {
        ...styles.stockInnerTabs,
        gridTemplateColumns: "1fr",
      }
    : styles.stockInnerTabs;

  const stockInnerTabButtonStyle = isMobile
    ? {
        ...styles.stockInnerTabButton,
        minHeight: "44px",
        padding: "11px 12px",
      }
    : styles.stockInnerTabButton;

  const stockSearchPlaceholderStyle = isMobile
    ? {
        ...styles.stockSearchPlaceholder,
        minHeight: "40px",
        fontSize: "11px",
        textAlign: "center",
      }
    : styles.stockSearchPlaceholder;

  const sectionPanelStyle = isMobile
    ? {
        ...styles.sectionPanel,
        padding: "12px",
        borderRadius: "14px",
      }
    : styles.sectionPanel;

  const sectionHeaderStyle = isMobile
    ? {
        ...styles.sectionHeader,
        alignItems: "flex-start",
        gap: "8px",
      }
    : styles.sectionHeader;

  const gridStyle = isMobile
    ? {
        ...styles.grid,
        gridTemplateColumns: "1fr",
        gap: "12px",
      }
    : styles.grid;

  const cardStyle = isMobile
    ? {
        ...styles.card,
        padding: "13px",
      }
    : styles.card;

  const legalFooterStyle = isMobile
    ? {
        ...styles.legalFooter,
        margin: "14px 10px 0",
        padding: "16px 14px",
        borderRadius: "18px",
      }
    : styles.legalFooter;

  const legalFooterTopStyle = isMobile
    ? {
        ...styles.legalFooterTop,
        flexDirection: "column",
      }
    : styles.legalFooterTop;

  const legalSourceRowStyle = isMobile
    ? {
        ...styles.legalSourceRow,
        alignItems: "flex-start",
        flexDirection: "column",
      }
    : styles.legalSourceRow;

  const legalFooterBottomStyle = isMobile
    ? {
        ...styles.legalFooterBottom,
        flexDirection: "column",
      }
    : styles.legalFooterBottom;

  const buildMiniSparklinePath = (stock, width = 138, height = 44) => {
    const percent = parsePercentValue(stock.percent_from_base);
    const seed = String(stock.symbol || stock.name || "KR")
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const points = Array.from({ length: 10 }, (_, index) => {
      const wave = Math.sin((index + seed) * 0.9) * 4;
      const trend = (percent / 100) * index * 16;
      const noise = ((seed + index * 7) % 9) - 4;
      const rawY = height / 2 - trend - wave - noise;
      const y = Math.max(7, Math.min(height - 7, rawY));
      const x = (width / 9) * index;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(" L ")}`;
  };

  const renderMiniSparkline = (stock) => {
    const isUp = stock.is_up ?? true;
    const lineColor = isUp ? "#16c784" : "#ea3943";
    const fillColor = isUp ? "rgba(22,199,132,0.16)" : "rgba(234,57,67,0.14)";
    const width = 138;
    const height = 44;
    const path = buildMiniSparklinePath(stock, width, height);
    const areaPath = `${path} L ${width},${height} L 0,${height} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.miniSparklineSvg} preserveAspectRatio="none">
        <path d={areaPath} fill={fillColor} />
        <path d={path} fill="none" stroke={lineColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const getRankBadgeStyle = (rank) => ({
    ...styles.moverRankBadge,
    background:
      rank === 0
        ? "linear-gradient(135deg, #f59e0b, #ca8a04)"
        : rank === 1
        ? "linear-gradient(135deg, #64748b, #475569)"
        : "linear-gradient(135deg, #b45309, #92400e)",
    border:
      rank === 0
        ? "1px solid rgba(250,204,21,0.45)"
        : rank === 1
        ? "1px solid rgba(203,213,225,0.30)"
        : "1px solid rgba(251,146,60,0.30)",
  });

  const renderTopMoverRow = (stock, index, sourceLabel) => {
    const changeColor = stock.is_up ? "#16c784" : "#ea3943";

    return (
      <button
        key={`${sourceLabel}-${stock.symbol}-${index}`}
        type="button"
        style={styles.moverRow}
        onClick={() => handleStockClick(stock)}
      >
        <div style={getRankBadgeStyle(index)}>{index + 1}</div>

        <div style={styles.moverLogo}>
          {String(stock.name || stock.symbol || "K").slice(0, 1)}
        </div>

        <div style={styles.moverInfo}>
          <div style={styles.moverName}>{stock.name}</div>
          <div style={styles.moverSymbol}>
            {stock.krx_code || stock.symbol}
            {stock.session_label && (
              <span style={getSessionBadgeStyle(stock.session_label)}>
                {stock.session_label}
              </span>
            )}
          </div>
        </div>

        <div style={styles.moverPriceBox}>
          <div style={styles.moverPrice}>{stock.price || "데이터 없음"}</div>
          <div style={{ ...styles.moverPercent, color: changeColor }}>
            ▲ {stock.percent_from_base || "0.00%"}
          </div>
        </div>
      </button>
    );
  };

  const renderTopMoverGroup = ({ title, subTitle, badgeText, badgeColor, items, sourceLabel }) => (
    <div style={styles.moverGroup}>
      <div style={styles.moverGroupHeader}>
        <div>
          <div style={styles.moverGroupTitle}>{title}</div>
          <div style={styles.moverGroupSub}>{subTitle}</div>
        </div>
        <span
          style={{
            ...styles.moverGroupBadge,
            background: badgeColor,
          }}
        >
          {badgeText}
        </span>
      </div>

      <div style={styles.moverList}>
        {items.length > 0 ? (
          items.map((stock, index) => renderTopMoverRow(stock, index, sourceLabel))
        ) : (
          <div style={styles.moverEmpty}>상승 종목 데이터를 불러오는 중입니다.</div>
        )}
      </div>
    </div>
  );

  const renderStockCard = (stock, index) => {
    const isReference =
      stock.market === "KR" && stock.is_24h_supported !== true;

    const isNoChange =
      stock.percent_from_base === "0.00%" ||
      stock.percent_from_base === "+0.00%" ||
      stock.diff_from_base === "+₩0" ||
      stock.diff_from_base === "-₩0";

    const sessionLabel = stock.session_label || "";
    const changeColor = stock.is_up ? "#16c784" : "#ea3943";
    const shortSource = isReference
      ? "KRX 참고"
      : stock.session_label === "24H"
      ? "24H 실시간"
      : stock.usd || stock.tvSymbol || "";

    return (
      <div
        key={`${stock.symbol}-${index}`}
        style={cardStyle}
        onClick={() => handleStockClick(stock)}
      >
        <div style={styles.cardTopCompact}>
          <div style={styles.cardIdentityArea}>
            <div style={styles.stockLogoMini}>{String(stock.name || stock.symbol || "K").slice(0, 1)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={styles.stockName}>{stock.name}</div>
              <div style={styles.symbol}>
                {stock.symbol}
                {sessionLabel && (
                  <span style={getSessionBadgeStyle(sessionLabel)}>{sessionLabel}</span>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              ...styles.statusDot,
              backgroundColor: stock.is_up ? "#16c784" : "#ea3943",
            }}
          />
        </div>

        <div style={styles.miniCardMiddle}>
          <div style={styles.miniChartBox}>{renderMiniSparkline(stock)}</div>
          <div style={styles.miniPriceBox}>
            <div style={styles.price}>{stock.price || "데이터 없음"}</div>
            <div style={{ ...styles.percent, color: changeColor }}>
              {stock.is_up ? "▲ " : "▼ "}
              {stock.percent_from_base || "0.00%"}
            </div>
          </div>
        </div>

        <div style={styles.miniMetaRow}>
          <span>{shortSource}</span>
          <strong style={{ color: changeColor }}>{isNoChange ? "변동 없음" : stock.diff_from_base || "계산 불가"}</strong>
        </div>

        <div style={styles.miniFooterRow}>
          <span>기준 {stock.base_price_text || "데이터 없음"}</span>
          <span>{stock.updated_at || "연결 대기"}</span>
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

    const searchedStocksForCurrentMarket = searchedStockCards.filter((stock) => {
      if (stockMarketTab === "NXT") {
        return stock.market === "KR";
      }

      return stock.market === stockMarketTab;
    });

    const searchPlaceholderText =
      stockMarketTab === "US"
        ? "미국 종목 검색: Apple, Tesla, AMD, PLTR, NFLX..."
        : "NXT 참고 시세 검색: 두산, 한화, 네이버, 012450...";

    const searchLoadingText =
      stockMarketTab === "US"
        ? "미국 종목을 검색하는 중입니다..."
        : "국내 종목을 검색하는 중입니다...";

    const searchEmptyText =
      stockMarketTab === "US"
        ? "검색 결과가 없습니다. 미국 종목명 또는 티커를 다시 입력해 주세요."
        : "검색 결과가 없습니다. 국내 종목명 또는 종목코드를 다시 입력해 주세요.";

    const searchedSectionTitle =
      stockMarketTab === "US" ? "🔎 검색한 미국 종목 시세" : "🔎 검색한 종목 시세";

    const searchedSectionSub =
      stockMarketTab === "US"
        ? "검색 결과에서 선택한 미국 종목의 현재 가격, 어제 종가, 등락률을 표시합니다."
        : "검색 결과에서 선택한 종목의 현재 가격, 어제 종가, 등락률을 표시합니다.";

    return (
      <div>
        <div style={stockControlRowStyle}>
          <div style={stockInnerTabsStyle}>
            <button
              onClick={() => {
                setStockMarketTab("KR");
                setStockSearch("");
              }}
              style={{
                ...stockInnerTabButtonStyle,
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
                ...stockInnerTabButtonStyle,
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
                ...stockInnerTabButtonStyle,
                background:
                  stockMarketTab === "NXT"
                    ? "linear-gradient(135deg, #0f766e, #0891b2)"
                    : "rgba(15,23,42,0.88)",
              }}
            >
              <span style={styles.marketPrefix}>NXT</span> 참고 시세
            </button>
          </div>

          {stockMarketTab === "NXT" ? (
            <div style={styles.stockSearchBox}>
              <input
                style={styles.stockSearchInput}
                placeholder={searchPlaceholderText}
                value={stockSearch}
                onChange={(e) => searchStockCards(e.target.value)}
              />

              {stockSearch.trim() && (
                <div style={styles.marketSearchResults}>
                  {isStockLookupLoading ? (
                    <div style={styles.marketSearchStatus}>{searchLoadingText}</div>
                  ) : stockLookupResults.length > 0 ? (
                    stockLookupResults.map((item, index) => (
                      <button
                        key={`${item.tvSymbol || item.symbol}-market-${index}`}
                        type="button"
                        style={styles.marketResultButton}
                        onClick={() => handleStockLookupSelect(item)}
                      >
                        <span style={styles.marketResultName}>{item.name}</span>
                        <span style={styles.marketResultMeta}>
                          {item.tvSymbol || item.symbol} · {item.exchange || item.type || "종목"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div style={styles.marketSearchStatus}>
                      {searchEmptyText}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={stockSearchPlaceholderStyle}>
              {stockMarketTab === "US"
                ? "미국 기본 종목은 고정 목록만 표시됩니다."
                : "24시간 지원 종목은 고정 목록만 표시됩니다."}
            </div>
          )}
        </div>

        {stockMarketTab === "NXT" &&
          searchedStocksForCurrentMarket.length > 0 && (
          <div style={sectionPanelStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <div style={styles.sectionTitle}>{searchedSectionTitle}</div>
                <div style={styles.sectionSub}>
                  {searchedSectionSub}
                </div>
              </div>
              <button
                type="button"
                style={styles.clearSearchButton}
                onClick={() => {
                  setSearchedStockCards((prev) =>
                    prev.filter((stock) =>
                      stockMarketTab === "NXT"
                        ? stock.market !== "KR"
                        : stock.market !== stockMarketTab
                    )
                  );
                  setStockSearch("");
                  setStockLookupResults([]);
                }}
              >
                검색 목록 비우기
              </button>
            </div>

            <div style={gridStyle}>
              {searchedStocksForCurrentMarket.map((stock, index) =>
                renderStockCard(stock, index)
              )}
            </div>
          </div>
        )}

        {stockMarketTab === "KR" ? (
          <>
            <div style={sectionPanelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={styles.sectionTitle}>🔥 한국 대표 종목 <span style={styles.liveBadge}>KRX/NXT</span></div>
                  <div style={styles.sectionSub}>정규장에는 KRX, 장외 참고 시세는 NXT로 표시됩니다.</div>
                </div>
                <div style={styles.sectionCount}>{displayRealtimeKrStocks.length}종목</div>
              </div>

              <div style={gridStyle}>
                {displayRealtimeKrStocks.map((stock, index) =>
                  renderStockCard(stock, index)
                )}
              </div>
            </div>
          </>
        ) : stockMarketTab === "NXT" ? (
          <>
            <div style={sectionPanelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={styles.sectionTitle}>📘 Yahoo/NXT 참고 시세</div>
                  <div style={styles.sectionSub}>KRX 최근 종가 기준 참고용 데이터</div>
                </div>
                <div style={styles.sectionCount}>{displayReferenceKrStocks.length}종목</div>
              </div>

              <div style={gridStyle}>
                {displayReferenceKrStocks.map((stock, index) =>
                  renderStockCard(stock, index)
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={sectionPanelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={styles.sectionTitle}>🇺🇸 미국 주식</div>
                  <div style={styles.sectionSub}>24H 거래소 기반 글로벌 자산 참고 시세</div>
                </div>
                <div style={styles.sectionCount}>{displayStocks.length}종목</div>
              </div>

              <div style={gridStyle}>
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
        <div style={sectionPanelStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={styles.sectionTitle}>🎯 ETF 종목</div>
              <div style={styles.sectionSub}>
                미국 대표 ETF와 국내상장 주요 ETF를 한 화면에서 확인합니다.
              </div>
            </div>
            <div style={styles.sectionCount}>{etfList.length}종목</div>
          </div>

          <div style={gridStyle}>
            {etfList.map((etf, index) => (
              <div
                key={`${etf.symbol}-etf-${index}`}
                style={cardStyle}
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

  const renderHyperLiquidCandlestickChart = () => {
    const candles = hyperCandles.slice(-90);

    if (hyperChartLoading && candles.length === 0) {
      return <div style={styles.hyperChartStatus}>24H 차트 데이터를 불러오는 중입니다...</div>;
    }

    if (hyperChartError && candles.length === 0) {
      return (
        <div style={styles.hyperChartStatus}>
          {hyperChartError}
          <br />
          잠시 후 다시 시도하거나 위 버튼으로 거래소 차트를 열어 확인해 주세요.
        </div>
      );
    }

    if (candles.length === 0) {
      return <div style={styles.hyperChartStatus}>표시할 24H 캔들 데이터가 아직 없습니다.</div>;
    }

    const width = 1000;
    const height = 520;
    const padding = { top: 24, right: 72, bottom: 46, left: 52 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const highs = candles.map((candle) => Number(candle.high));
    const lows = candles.map((candle) => Number(candle.low));
    const maxPrice = Math.max(...highs);
    const minPrice = Math.min(...lows);
    const priceRange = maxPrice - minPrice || 1;
    const scaleY = (price) => padding.top + ((maxPrice - price) / priceRange) * chartHeight;
    const step = chartWidth / Math.max(candles.length, 1);
    const candleWidth = Math.max(4, Math.min(12, step * 0.62));
    const lastCandle = candles[candles.length - 1];
    const lastPrice = Number(lastCandle.close);
    const firstPrice = Number(candles[0].open);
    const diff = lastPrice - firstPrice;
    const percent = firstPrice ? (diff / firstPrice) * 100 : 0;
    const gridLines = Array.from({ length: 5 }, (_, index) => {
      const value = maxPrice - (priceRange / 4) * index;
      return { value, y: scaleY(value) };
    });

    return (
      <div style={styles.hyperLiveChartBox}>
        <div style={styles.hyperLiveChartTop}>
          <div>
            <div style={styles.hyperLiveChartName}>{currentChart.hyperLiquidPairName || currentChart.name}</div>
            <div style={styles.hyperLiveChartMeta}>Hyperliquid 24H · {hyperInterval} · 30초 자동 갱신</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={styles.hyperLiveChartPrice}>${lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div style={{ ...styles.hyperLiveChartPercent, color: diff >= 0 ? "#16c784" : "#ea3943" }}>
              {diff >= 0 ? "▲" : "▼"} {percent >= 0 ? "+" : ""}{percent.toFixed(2)}%
            </div>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} style={styles.hyperSvgChart} preserveAspectRatio="none">
          <rect x="0" y="0" width={width} height={height} fill="rgba(2,6,23,0.72)" />

          {gridLines.map((line, index) => (
            <g key={`grid-${index}`}>
              <line x1={padding.left} x2={width - padding.right} y1={line.y} y2={line.y} stroke="rgba(148,163,184,0.13)" strokeWidth="1" />
              <text x={width - padding.right + 10} y={line.y + 4} fill="#94a3b8" fontSize="12" fontWeight="700">
                {line.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </text>
            </g>
          ))}

          {candles.map((candle, index) => {
            const open = Number(candle.open);
            const high = Number(candle.high);
            const low = Number(candle.low);
            const close = Number(candle.close);
            const x = padding.left + index * step + step / 2;
            const yOpen = scaleY(open);
            const yClose = scaleY(close);
            const yHigh = scaleY(high);
            const yLow = scaleY(low);
            const isUp = close >= open;
            const color = isUp ? "#16c784" : "#ea3943";
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

            return (
              <g key={`candle-${candle.time || index}`}>
                <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth="1.3" />
                <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1.5" fill={color} />
              </g>
            );
          })}

          <line x1={padding.left} x2={width - padding.right} y1={scaleY(lastPrice)} y2={scaleY(lastPrice)} stroke={diff >= 0 ? "#16c784" : "#ea3943"} strokeDasharray="4 4" strokeWidth="1" opacity="0.75" />
          <rect x={width - padding.right + 8} y={scaleY(lastPrice) - 13} width="60" height="26" rx="5" fill={diff >= 0 ? "#16c784" : "#ea3943"} />
          <text x={width - padding.right + 38} y={scaleY(lastPrice) + 5} textAnchor="middle" fill="white" fontSize="12" fontWeight="900">
            {lastPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </text>
        </svg>

        <div style={styles.hyperLiveChartBottom}>
          <span>캔들 {candles.length}개</span>
          <span>고가 {maxPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          <span>저가 {minPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          {hyperChartLoading && <span>갱신 중...</span>}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    if (!currentChart) {
      return <div style={styles.panel}>종목을 선택해주세요.</div>;
    }

    const chartUrl = currentChart.isHyperLiquidChart
      ? currentChart.hyperLiquidUrl
      : `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
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
                    const hyperChartInfo = getHyperLiquidChartInfo(item);

                    setSelectedChart({
                      name: item.name,
                      symbol: item.symbol,
                      tvSymbol: hyperChartInfo?.tvSymbol || item.tvSymbol,
                      price: "",
                      usd: hyperChartInfo ? "24H 거래소 실시간 차트" : "",
                      percent: "",
                      isUp: true,
                      isHyperLiquidChart: Boolean(hyperChartInfo),
                      hyperLiquidPairName: hyperChartInfo?.pairName || "",
                      hyperLiquidUrl: hyperChartInfo?.url || "",
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
            {currentChart.isHyperLiquidChart
              ? `${currentChart.name} 24H 거래소 차트 새 창으로 열기`
              : `${currentChart.name} 공식 차트 새 창으로 열기`}
          </button>

          {currentChart.isHyperLiquidChart ? (
            <div style={styles.hyperChartPanel}>
              <div style={styles.hyperChartTitle}>
                {currentChart.hyperLiquidPairName || currentChart.name}
              </div>
              <div style={styles.hyperChartSub}>
                삼성전자·SK하이닉스·현대차 3종목은 거래소 24H 캔들 데이터를 받아와 사이트 안에서 직접 차트로 표시합니다.
              </div>

              <div style={styles.hyperIntervalRow}>
                {["5m", "15m", "1h", "1d"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    style={{
                      ...styles.hyperIntervalButton,
                      ...(hyperInterval === item ? styles.hyperIntervalButtonActive : {}),
                    }}
                    onClick={() => setHyperInterval(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {renderHyperLiquidCandlestickChart()}
            </div>
          ) : (
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
          )}

          <div style={styles.chartInfo}>
            <div>{currentChart.isHyperLiquidChart ? "차트 출처" : "USD 가격"}: {currentChart.usd || "검색 차트"}</div>
            <div style={{ color: currentChart.isUp ? "#16c784" : "#ea3943" }}>
              {currentChart.percent}
            </div>
          </div>
        </div>
      );
    };

    const renderIssues = () => {
      const visibleIssues = filteredIssues.slice(0, 12);

      return (
        <div style={styles.newsPage}>
          <div style={styles.newsHeroHeader}>
            <div style={styles.newsTitleArea}>
              <div style={styles.newsIconBox}>▤</div>
              <div>
                <div style={styles.newsPageTitle}>이슈 뉴스</div>
                <div style={styles.newsPageSub}>주요 경제·시장 이슈를 빠르게 확인하세요</div>
              </div>
            </div>

            <div style={styles.newsSearchBox}>
              <input
                style={styles.newsSearchInput}
                placeholder="뉴스 검색..."
                value={issueSearch}
                onChange={(e) => setIssueSearch(e.target.value)}
              />
              <span style={styles.newsSearchIcon}>⌕</span>
            </div>
          </div>

          <div style={styles.newsFilterRow}>
            {issueCategoryTabs.map((category) => (
              <button
                key={category}
                type="button"
                style={{
                  ...styles.newsFilterButton,
                  ...(issueCategory === category ? styles.newsFilterButtonActive : {}),
                }}
                onClick={() => setIssueCategory(category)}
              >
                {category === "전체" ? "◈ 전체" : category}
              </button>
            ))}
          </div>

          <div style={styles.newsMainPanel}>
            {visibleIssues.length > 0 ? (
              visibleIssues.map((issue, index) => {
                const visual = getIssueVisual(issue);
                const isHot = index < 3;

                return (
                  <div
                    key={`${issue.title}-${index}`}
                    style={styles.newsRow}
                    onClick={() => window.open(issue.link, "_blank")}
                  >
                    <div
                      style={{
                        ...styles.newsThumb,
                        background: visual.gradient,
                      }}
                    >
                      <span style={styles.newsThumbIcon}>{visual.icon}</span>
                      <div style={styles.newsThumbGlow} />
                    </div>

                    <div style={styles.newsContent}>
                      <div style={styles.newsTitleLine}>
                        <span>{issue.title}</span>
                        {isHot && <span style={styles.newsHotBadge}>N</span>}
                      </div>

                      <div style={styles.newsMetaLine}>
                        <span>◷ {issue.published || "방금 전"}</span>
                        <span>·</span>
                        <span>{issue.source || "Google News"}</span>
                      </div>

                      <div style={styles.newsSummaryText}>
                        {getIssueSummary(issue)}
                      </div>
                    </div>

                    <div style={styles.newsRightArea}>
                      <span style={getIssueCategoryStyle(issue)}>{getIssueCategory(issue)}</span>
                      <span style={styles.newsOpenHint}>보기</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={styles.newsEmptyBox}>검색 조건에 맞는 뉴스가 없습니다.</div>
            )}

          </div>
        </div>
      );
    };

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

      const analysisItems = marketSummary.data || [];
      const mood = marketSummary.market_mood || "혼조세";
      const moodColor =
        mood === "강세" ? "#16c784" : mood === "약세" ? "#ea3943" : "#fbbf24";
      const moodPercent = mood === "강세" ? 76 : mood === "약세" ? 24 : 50;
      const updatedText = new Date().toLocaleString("ko-KR", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const getIndexBadge = (name, symbol) => {
        const label = String(name || symbol || "").toUpperCase();

        if (label.includes("코스피")) return { text: "KOSPI", bg: "linear-gradient(135deg, #1d4ed8, #38bdf8)" };
        if (label.includes("코스닥")) return { text: "KQ", bg: "linear-gradient(135deg, #2563eb, #60a5fa)" };
        if (label.includes("S&P")) return { text: "SPX", bg: "linear-gradient(135deg, #6d28d9, #8b5cf6)" };
        if (label.includes("나스닥")) return { text: "IXIC", bg: "linear-gradient(135deg, #4f46e5, #06b6d4)" };
        if (label.includes("다우")) return { text: "DJI", bg: "linear-gradient(135deg, #ea580c, #f59e0b)" };
        if (label.includes("환율") || label.includes("달러")) return { text: "FX", bg: "linear-gradient(135deg, #059669, #10b981)" };

        return { text: String(symbol || "IDX").replace("^", "").slice(0, 4), bg: "linear-gradient(135deg, #334155, #64748b)" };
      };

      const renderIndexSparkline = (item, index) => {
        const percent = Number(item.percent || 0);
        const isUp = item.is_up;
        const color = isUp ? "#16c784" : "#ea3943";
        const width = 84;
        const height = 24;
        const seed = String(item.symbol || item.name || index)
          .split("")
          .reduce((sum, char) => sum + char.charCodeAt(0), 0);

        const points = Array.from({ length: 12 }, (_, pointIndex) => {
          const x = (width / 11) * pointIndex;
          const wave = Math.sin((pointIndex + seed) * 0.85) * 3.8;
          const trend = (percent / 100) * pointIndex * 5.5;
          const noise = ((seed + pointIndex * 11) % 5) - 2;
          const rawY = height / 2 - trend - wave - noise;
          const y = Math.max(4, Math.min(height - 4, rawY));
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        });

        const path = `M ${points.join(" L ")}`;

        return (
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "84px", height: "24px" }} preserveAspectRatio="none">
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      };

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.96))",
              border: "1px solid rgba(148,163,184,0.16)",
              borderRadius: "20px",
              padding: "16px",
              boxShadow: "0 18px 48px rgba(0,0,0,0.24)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "14px",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg, rgba(37,99,235,0.35), rgba(20,184,166,0.18))",
                    border: "1px solid rgba(96,165,250,0.25)",
                    fontSize: "19px",
                    flex: "0 0 auto",
                  }}
                >
                  ◌
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: "25px", fontWeight: 900, color: "#f8fafc" }}>
                    시장 분석
                  </h2>
                  <div style={{ marginTop: "3px", color: "#93a4bd", fontSize: "13px", fontWeight: 700 }}>
                    글로벌 주요 지수와 시장 방향을 한눈에 확인합니다.
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right", color: "#93a4bd", fontSize: "12px", fontWeight: 800, flex: "0 0 auto" }}>
                업데이트
                <div style={{ color: "#dbeafe", marginTop: "4px" }}>{updatedText}</div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 170px",
                gap: "12px",
                alignItems: "center",
                background: "rgba(15,23,42,0.60)",
                border: "1px solid rgba(148,163,184,0.12)",
                borderRadius: "16px",
                padding: "13px 14px",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", gap: "12px", alignItems: "center", minWidth: 0 }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "16px",
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg, rgba(37,99,235,0.45), rgba(14,165,233,0.18))",
                    color: "#60a5fa",
                    fontSize: "23px",
                    fontWeight: 900,
                    flex: "0 0 auto",
                  }}
                >
                  ⌁
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#cbd5e1", fontSize: "13px", fontWeight: 800 }}>현재 시장 분위기</div>
                  <div style={{ color: moodColor, fontSize: "27px", fontWeight: 950, marginTop: "3px" }}>
                    {mood}
                  </div>
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: "13px",
                      lineHeight: 1.55,
                      marginTop: "5px",
                      maxWidth: "560px",
                    }}
                  >
                    {marketSummary.summary || "상승 지수와 하락 지수가 섞여 있어 시장 흐름을 함께 확인해야 합니다."}
                  </div>
                </div>
              </div>

              <div style={{ position: "relative", height: "84px", display: "grid", placeItems: "center" }}>
                <svg width="150" height="84" viewBox="0 0 150 84">
                  <path d="M 22 66 A 53 53 0 0 1 128 66" fill="none" stroke="rgba(234,57,67,0.85)" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 54 26 A 53 53 0 0 1 128 66" fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 91 26 A 53 53 0 0 1 128 66" fill="none" stroke="rgba(22,199,132,0.9)" strokeWidth="8" strokeLinecap="round" />
                  <line
                    x1="75"
                    y1="66"
                    x2={75 + 41 * Math.cos((Math.PI * (180 - (moodPercent * 1.8))) / 180)}
                    y2={66 - 41 * Math.sin((Math.PI * (180 - (moodPercent * 1.8))) / 180)}
                    stroke="#e2e8f0"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="75" cy="66" r="4.5" fill="#e2e8f0" />
                  <text x="18" y="81" fill="#94a3b8" fontSize="10" fontWeight="800">약세</text>
                  <text x="64" y="81" fill="#94a3b8" fontSize="10" fontWeight="800">중립</text>
                  <text x="116" y="81" fill="#94a3b8" fontSize="10" fontWeight="800">강세</text>
                </svg>
              </div>
            </div>

            <div
              style={{
                background: "rgba(15,23,42,0.58)",
                border: "1px solid rgba(148,163,184,0.12)",
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderBottom: "1px solid rgba(148,163,184,0.10)",
                }}
              >
                <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: 900 }}>주요 지수</div>
                <div style={{ color: "#93a4bd", fontSize: "12px", fontWeight: 700 }}>
                  {updatedText} 기준
                </div>
              </div>

              <div>
                {analysisItems.map((item, index) => {
                  const badge = getIndexBadge(item.name, item.symbol);
                  const isUp = item.is_up;
                  const color = isUp ? "#16c784" : "#ea3943";
                  const percentText = `${isUp ? "+" : ""}${item.percent}%`;
                  const diffText = `${isUp ? "+" : ""}${item.diff}`;

                  return (
                    <div
                      key={`${item.symbol || item.name}-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "34px minmax(86px, 1fr) 86px 112px 82px 72px",
                        alignItems: "center",
                        gap: "10px",
                        padding: "9px 14px",
                        minHeight: "58px",
                        borderBottom:
                          index === analysisItems.length - 1
                            ? "none"
                            : "1px solid rgba(148,163,184,0.09)",
                      }}
                    >
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          background: badge.bg,
                          color: "#fff",
                          fontSize: badge.text.length > 4 ? "7px" : "9px",
                          fontWeight: 950,
                          letterSpacing: "-0.5px",
                          lineHeight: 1,
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          boxShadow: "0 8px 24px rgba(37,99,235,0.12)",
                        }}
                      >
                        {badge.text}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: "#f8fafc",
                            fontWeight: 900,
                            fontSize: "15px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, marginTop: "2px" }}>
                          {item.symbol}
                        </div>
                      </div>

                      <div>{renderIndexSparkline(item, index)}</div>

                      <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: 950, textAlign: "right" }}>
                        {item.price}
                      </div>

                      <div style={{ color, fontSize: "13px", fontWeight: 900, textAlign: "right" }}>
                        {diffText}
                      </div>

                      <div
                        style={{
                          justifySelf: "end",
                          width: "72px",
                          textAlign: "center",
                          padding: "7px 5px",
                          borderRadius: "10px",
                          background: isUp ? "rgba(22,199,132,0.14)" : "rgba(234,57,67,0.14)",
                          color,
                          fontWeight: 950,
                          fontSize: "14px",
                          border: isUp ? "1px solid rgba(22,199,132,0.18)" : "1px solid rgba(234,57,67,0.18)",
                        }}
                      >
                        {percentText}
                        <span style={{ display: "block", fontSize: "12px", marginTop: "1px" }}>{isUp ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: "10px", color: "#64748b", fontSize: "11px", fontWeight: 700 }}>
              * 데이터는 정보 제공 목적이며 투자 판단의 근거가 되지 않습니다.
            </div>
          </div>
        </div>
      );
    };

        const renderAdminPage = () => {
      if (!isAdminAuthorized) {
        return (
          <div style={styles.app}>
            <style>{globalResetStyle}</style>
            <div style={styles.adminPageWrap}>
              <div style={styles.adminCard}>
                <div style={styles.adminLogoRow}>
                  <img src={LOGO_SRC} alt="NEXA" style={styles.adminLogo} />
                  <div>
                    <div style={styles.adminTitle}>NEXA 관리자</div>
                    <div style={styles.adminSub}>접근 권한이 없습니다.</div>
                  </div>
                </div>
                <div style={styles.adminWarningBox}>
                  관리자 주소는 <strong>/admin?key=관리자키</strong> 형식으로 접속해야 합니다.
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div style={styles.app}>
          <style>{globalResetStyle}</style>
          <div style={styles.adminPageWrap}>
            <div style={styles.adminCard}>
              <div style={styles.adminLogoRow}>
                <img src={LOGO_SRC} alt="NEXA" style={styles.adminLogo} />
                <div>
                  <div style={styles.adminTitle}>NEXA 관리자</div>
                  <div style={styles.adminSub}>방문자 통계 전용 화면</div>
                </div>
              </div>

              <div style={styles.adminStatsGrid}>
                <div style={styles.adminStatBox}>
                  <div style={styles.adminStatLabel}>현재 접속자</div>
                  <div style={styles.adminStatValue}>{visitorStats.active.toLocaleString()}명</div>
                  <div style={styles.adminStatHint}>최근 60초 기준</div>
                </div>

                <div style={styles.adminStatBox}>
                  <div style={styles.adminStatLabel}>총 방문자</div>
                  <div style={styles.adminStatValue}>{visitorStats.total.toLocaleString()}명</div>
                  <div style={styles.adminStatHint}>브라우저 방문 ID 기준</div>
                </div>
              </div>

              <div style={styles.adminInfoBox}>
                <div>마지막 확인 시간: <strong>{time || new Date().toLocaleTimeString()}</strong></div>
                <div>15초마다 자동 갱신됩니다.</div>
              </div>

              <button
                type="button"
                style={styles.adminBackButton}
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                사이트로 돌아가기
              </button>
            </div>
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

    if (isAdminPage) {
      return renderAdminPage();
    }

    return (
      <div style={styles.app}>
        <style>{globalResetStyle}</style>
        <div style={styles.topBar}>
          <div style={topInnerStyle}>
            <div style={brandAreaStyle}>
              <button
                type="button"
                style={styles.menuIcon}
                onClick={() => setIsControlMenuOpen((prev) => !prev)}
              >
                ☰
              </button>

              {isControlMenuOpen && (
                <div style={isMobile ? { ...styles.controlMenu, left: "10px", right: "10px", width: "auto", top: "54px" } : styles.controlMenu}>
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

              <div style={logoMarkStyle}>
                <img
                  src={LOGO_SRC}
                  alt="NEXA"
                  style={styles.logoImage}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span style={styles.logoFallback}>N</span>
              </div>
              <div style={styles.logoWrap}>
                <div style={logoStyle}>NEXA</div>
                <div style={logoSubStyle}>
                  24H Global Markets
                </div>
              </div>
            </div>

            <div style={isMobile ? { display: "none" } : styles.topEmptySpace} />

            <div style={headerStatusStyle}>
              <div style={styles.liveStatusDot} />
              <span>실시간 업데이트</span>
              <strong>{time || "--:--:--"}</strong>
              <span style={styles.visitorDivider} />
              <span style={styles.visitorPill}>관리자 전용 통계 운영 중</span>
            </div>
          </div>
        </div>

        <div style={dashboardShellStyle}>
          {showLeftSidebar && !isMobile && (
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

            <div style={styles.sidebarFooter}>
              <div>© 2026 NEXA</div>
              <div style={styles.sidebarFooterSmall}>투자 판단 책임은 본인에게 있습니다.</div>
            </div>
          </aside>
          )}

          <main style={styles.mainArea}>
            <div style={styles.hero}>
              <div style={styles.moverHero}>
                <div style={moverHeroHeaderStyle}>
                  <div>
                    <div style={styles.moverHeroTitle}>🚀 오늘의 급등 종목</div>
                    <div style={styles.moverHeroSub}>24시간 거래 종목과 NXT 참고 종목의 상승률 TOP3를 한눈에 확인합니다.</div>
                  </div>

                  <div style={styles.moverHeroMeta}>
                    <span>마지막 업데이트</span>
                    <strong>{time || "--:--:--"}</strong>
                  </div>
                </div>

                <div style={moverHeroGridStyle}>
                  {renderTopMoverGroup({
                    title: "24H 급등 TOP3",
                    subTitle: "Hyperliquid 24시간 기준 상승률 상위 종목",
                    badgeText: "24H",
                    badgeColor: "linear-gradient(135deg, #16c784, #0f766e)",
                    items: top24hRisers,
                    sourceLabel: "24H",
                  })}

                  {renderTopMoverGroup({
                    title: "NXT 급등 TOP3",
                    subTitle: "국내 NXT 참고 시세 기준 상승률 상위 종목",
                    badgeText: "NXT",
                    badgeColor: "linear-gradient(135deg, #7c3aed, #2563eb)",
                    items: topNxtRisers,
                    sourceLabel: "NXT",
                  })}
                </div>

                <div style={styles.moverMiniStats}>
                  <span>전체 {summaryStocks.length}</span>
                  <span style={{ color: "#16c784" }}>상승 {upCount}</span>
                  <span style={{ color: "#ea3943" }}>하락 {downCount}</span>
                  <span>24H {liveCount}</span>
                </div>

                <div style={styles.loadingNotice}>
                  처음 접속하거나 서버가 대기 상태일 경우 데이터 로드까지 1~2분 정도 소요될 수 있습니다.
                </div>
              </div>
            </div>

            {renderContent()}
          </main>

          {showRightSidebar && !isMobile && (
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

        <footer style={legalFooterStyle}>
          <div style={legalFooterTopStyle}>
            <div>
              <div style={styles.legalFooterTitle}>NEXA</div>
              <div style={styles.legalFooterSub}>24H Global Markets</div>
            </div>

            <div style={styles.legalContactBox}>
              <div style={styles.legalContactTitle}>제작자 문의</div>
              <a href={`mailto:${CONTACT_EMAIL}`} style={styles.legalEmail}>
                {CONTACT_EMAIL}
              </a>
              <div style={styles.legalContactTime}>
                평일 오후 5:00 ~ 오후 9:00 · 주말 오전 9:00 ~ 오후 11:00
              </div>
            </div>
          </div>

          <div style={styles.legalNoticeBox}>
            <strong>투자 유의사항</strong>
            <span>{SERVICE_NOTICE}</span>
          </div>

          <div style={legalSourceRowStyle}>
            <span style={styles.legalSourceLabel}>데이터 참고 및 시장 리서치</span>
            <div style={styles.legalSourceList}>
              {DATA_SOURCES.map((source) => (
                <span key={source} style={styles.legalSourcePill}>
                  {source}
                </span>
              ))}
            </div>
          </div>

          <div style={legalFooterBottomStyle}>
            <span>본 서비스는 위 서비스들의 공개 데이터를 참고하여 자체적으로 가공·표시합니다.</span>
            <span>각 서비스와 공식 제휴 관계는 아닙니다.</span>
            <span>© 2026 NEXA. All Rights Reserved.</span>
          </div>
        </footer>
      </div>
    );
}

const styles = {
  adminPageWrap: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px",
  },

  adminCard: {
    width: "min(720px, 100%)",
    borderRadius: "28px",
    border: "1px solid rgba(148,163,184,0.18)",
    background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.98))",
    boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
    padding: "30px",
  },

  adminLogoRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },

  adminLogo: {
    width: "58px",
    height: "58px",
    borderRadius: "16px",
  },

  adminTitle: {
    fontSize: "28px",
    fontWeight: 950,
    color: "#f8fafc",
  },

  adminSub: {
    marginTop: "4px",
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: 800,
  },

  adminStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    marginTop: "18px",
  },

  adminStatBox: {
    borderRadius: "20px",
    border: "1px solid rgba(59,130,246,0.20)",
    background: "rgba(15,23,42,0.78)",
    padding: "22px",
  },

  adminStatLabel: {
    color: "#93c5fd",
    fontSize: "14px",
    fontWeight: 900,
  },

  adminStatValue: {
    marginTop: "10px",
    color: "#ffffff",
    fontSize: "42px",
    fontWeight: 950,
    letterSpacing: "-1px",
  },

  adminStatHint: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 800,
  },

  adminInfoBox: {
    marginTop: "18px",
    borderRadius: "16px",
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(2,6,23,0.45)",
    color: "#cbd5e1",
    padding: "16px",
    lineHeight: 1.7,
    fontSize: "14px",
    fontWeight: 800,
  },

  adminWarningBox: {
    borderRadius: "16px",
    border: "1px solid rgba(234,179,8,0.28)",
    background: "rgba(234,179,8,0.10)",
    color: "#fde68a",
    padding: "16px",
    lineHeight: 1.7,
    fontSize: "14px",
    fontWeight: 800,
  },

  adminBackButton: {
    marginTop: "18px",
    width: "100%",
    border: "1px solid rgba(59,130,246,0.35)",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "white",
    padding: "15px 18px",
    fontSize: "15px",
    fontWeight: 950,
    cursor: "pointer",
  },

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
    gridTemplateColumns: "minmax(280px, 360px) minmax(320px, 1fr) minmax(380px, 520px)",
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
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    display: "flex",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "rgba(15,23,42,0.9)",
    boxShadow: "0 12px 34px rgba(37,99,235,0.34)",
  },

  logoImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    position: "relative",
    zIndex: 2,
  },

  logoFallback: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: "950",
    color: "#5eead4",
    zIndex: 1,
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

  investorHero: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  investorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
  },

  investorTitle: {
    fontSize: "20px",
    fontWeight: "950",
    letterSpacing: "-0.035em",
  },

  investorSummary: {
    marginTop: "7px",
    color: "#b8c7dc",
    fontSize: "13px",
    fontWeight: "750",
    lineHeight: 1.55,
  },

  investorMeta: {
    minWidth: "150px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "5px",
    color: "#8ea2bd",
    fontSize: "12px",
    fontWeight: "800",
  },

  investorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "10px",
  },

  investorCard: {
    minHeight: "92px",
    borderRadius: "13px",
    padding: "14px",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(8,14,27,0.98))",
    border: "1px solid rgba(148,163,184,0.14)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035)",
  },

  investorName: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: "950",
    marginBottom: "8px",
  },

  investorAmount: {
    fontSize: "24px",
    fontWeight: "950",
    letterSpacing: "-0.045em",
    lineHeight: 1.05,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  investorDirection: {
    marginTop: "7px",
    fontSize: "12px",
    fontWeight: "950",
  },

  investorEmpty: {
    gridColumn: "1 / -1",
    minHeight: "84px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "13px",
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.14)",
    color: "#9fb0c8",
    fontSize: "13px",
    fontWeight: "850",
  },

  investorMarketList: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },

  investorMarketRow: {
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: "11px",
    background: "rgba(15,23,42,0.58)",
    border: "1px solid rgba(148,163,184,0.10)",
    color: "#9fb0c8",
    fontSize: "12px",
    fontWeight: "800",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  investorMiniStats: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    color: "#9fb0c8",
    fontSize: "12px",
    fontWeight: "900",
  },

  moverHero: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  moverHeroHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
  },

  moverHeroTitle: {
    fontSize: "22px",
    fontWeight: "950",
    letterSpacing: "-0.04em",
  },

  moverHeroSub: {
    marginTop: "7px",
    color: "#b8c7dc",
    fontSize: "13px",
    fontWeight: "750",
    lineHeight: 1.55,
  },

  moverHeroMeta: {
    minWidth: "145px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "5px",
    color: "#8ea2bd",
    fontSize: "12px",
    fontWeight: "850",
  },

  moverHeroGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  moverGroup: {
    minWidth: 0,
    borderRadius: "16px",
    padding: "14px",
    background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(8,14,27,0.92))",
    border: "1px solid rgba(148,163,184,0.14)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.035)",
  },

  moverGroupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "12px",
  },

  moverGroupTitle: {
    color: "#f8fafc",
    fontSize: "17px",
    fontWeight: "950",
    letterSpacing: "-0.035em",
  },

  moverGroupSub: {
    marginTop: "5px",
    color: "#8ea2bd",
    fontSize: "12px",
    fontWeight: "750",
    lineHeight: 1.45,
  },

  moverGroupBadge: {
    flexShrink: 0,
    padding: "5px 10px",
    borderRadius: "999px",
    color: "white",
    fontSize: "11px",
    fontWeight: "950",
    boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
  },

  moverList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  moverRow: {
    width: "100%",
    minHeight: "62px",
    display: "grid",
    gridTemplateColumns: "30px 38px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "10px",
    padding: "9px",
    borderRadius: "13px",
    border: "1px solid rgba(148,163,184,0.10)",
    background: "rgba(2,6,23,0.35)",
    color: "white",
    textAlign: "left",
    cursor: "pointer",
  },

  moverRankBadge: {
    width: "26px",
    height: "26px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: "12px",
    fontWeight: "950",
  },

  moverLogo: {
    width: "34px",
    height: "34px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #2563eb, #0891b2)",
    color: "white",
    fontSize: "15px",
    fontWeight: "950",
    boxShadow: "0 10px 24px rgba(37,99,235,0.24)",
  },

  moverInfo: {
    minWidth: 0,
  },

  moverName: {
    color: "#f8fafc",
    fontSize: "14px",
    fontWeight: "950",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  moverSymbol: {
    marginTop: "4px",
    color: "#9fb0c8",
    fontSize: "12px",
    fontWeight: "850",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  moverPriceBox: {
    textAlign: "right",
    minWidth: "88px",
  },

  moverPrice: {
    color: "#f8fafc",
    fontSize: "13px",
    fontWeight: "950",
    whiteSpace: "nowrap",
  },

  moverPercent: {
    marginTop: "4px",
    fontSize: "14px",
    fontWeight: "950",
    whiteSpace: "nowrap",
  },

  moverEmpty: {
    minHeight: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    borderRadius: "13px",
    background: "rgba(15,23,42,0.58)",
    border: "1px dashed rgba(148,163,184,0.18)",
    color: "#9fb0c8",
    fontSize: "13px",
    fontWeight: "850",
    padding: "12px",
  },

  moverMiniStats: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    color: "#9fb0c8",
    fontSize: "12px",
    fontWeight: "900",
  },

  loadingNotice: {
    padding: "10px 12px",
    borderRadius: "12px",
    background: "rgba(37,99,235,0.10)",
    border: "1px solid rgba(96,165,250,0.18)",
    color: "#bfdbfe",
    fontSize: "12px",
    fontWeight: "850",
    lineHeight: 1.45,
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

  stockSearchPlaceholder: {
    width: "100%",
    minHeight: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 14px",
    borderRadius: "11px",
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(15,23,42,0.45)",
    color: "#8ea2bd",
    fontSize: "12px",
    fontWeight: "850",
    textAlign: "center",
  },

  stockSearchBox: {
    width: "100%",
    maxWidth: "100%",
    position: "relative",
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

  marketSearchResults: {
    position: "absolute",
    top: "48px",
    left: 0,
    right: 0,
    zIndex: 60,
    maxHeight: "330px",
    overflowY: "auto",
    padding: "8px",
    borderRadius: "13px",
    background: "linear-gradient(180deg, rgba(15,23,42,0.99), rgba(8,14,27,0.99))",
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "0 20px 65px rgba(0,0,0,0.42)",
  },

  marketResultButton: {
    width: "100%",
    minHeight: "48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: "4px",
    padding: "9px 11px",
    marginBottom: "6px",
    borderRadius: "10px",
    border: "1px solid rgba(148,163,184,0.10)",
    background: "rgba(15,23,42,0.78)",
    color: "white",
    cursor: "pointer",
    textAlign: "left",
  },

  marketResultName: {
    maxWidth: "100%",
    color: "#f8fafc",
    fontSize: "13px",
    fontWeight: "950",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  marketResultMeta: {
    maxWidth: "100%",
    color: "#8ea2bd",
    fontSize: "12px",
    fontWeight: "750",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  marketSearchStatus: {
    padding: "12px",
    color: "#9fb0c8",
    fontSize: "13px",
    fontWeight: "800",
    lineHeight: 1.45,
  },

  clearSearchButton: {
    height: "34px",
    padding: "0 13px",
    borderRadius: "10px",
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(15,23,42,0.82)",
    color: "#dbeafe",
    fontSize: "12px",
    fontWeight: "900",
    cursor: "pointer",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: 0,
  },

  card: {
    minWidth: 0,
    overflow: "hidden",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(8,14,27,0.96))",
    borderRadius: "16px",
    padding: "14px",
    border: "1px solid rgba(148,163,184,0.14)",
    cursor: "pointer",
    boxShadow:
      "0 14px 36px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.035)",
    minHeight: "156px",
    boxSizing: "border-box",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "10px",
  },

  cardTopCompact: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "10px",
  },

  cardIdentityArea: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },

  stockLogoMini: {
    width: "34px",
    height: "34px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: "linear-gradient(135deg, rgba(37,99,235,0.95), rgba(20,184,166,0.95))",
    color: "white",
    fontSize: "15px",
    fontWeight: "950",
    boxShadow: "0 10px 26px rgba(37,99,235,0.22)",
  },

  stockName: {
    maxWidth: "180px",
    fontSize: "clamp(16px, 1.05vw, 19px)",
    fontWeight: "950",
    letterSpacing: "-0.045em",
    lineHeight: 1.05,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  symbol: {
    maxWidth: "180px",
    color: "#9fb0c8",
    marginTop: "5px",
    display: "flex",
    gap: "6px",
    alignItems: "center",
    fontSize: "13px",
    fontWeight: "850",
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

  sessionBadge: {
    display: "inline-block",
    marginLeft: "5px",
    padding: "2px 7px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "950",
    verticalAlign: "middle",
    letterSpacing: "0.02em",
  },

  statusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    boxShadow: "0 0 16px currentColor",
    flexShrink: 0,
  },

  priceLabel: {
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "850",
    marginBottom: "4px",
  },

  price: {
    maxWidth: "100%",
    fontSize: "clamp(22px, 1.7vw, 28px)",
    fontWeight: "950",
    letterSpacing: "-0.06em",
    lineHeight: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  usd: {
    color: "#60a5fa",
    fontSize: "12px",
    fontWeight: "850",
    marginTop: "5px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  miniCardMiddle: {
    display: "grid",
    gridTemplateColumns: "minmax(82px, 0.8fr) minmax(110px, 1fr)",
    gap: "10px",
    alignItems: "center",
    marginTop: "10px",
  },

  miniChartBox: {
    height: "48px",
    minWidth: 0,
    borderRadius: "12px",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.2), rgba(15,23,42,0.72))",
    overflow: "hidden",
  },

  miniSparklineSvg: {
    width: "100%",
    height: "48px",
    display: "block",
  },

  miniPriceBox: {
    textAlign: "right",
    minWidth: 0,
  },

  cardDivider: {
    height: "1px",
    background: "rgba(148,163,184,0.12)",
    margin: "10px 0",
  },

  changeArea: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "6px 10px",
    alignItems: "center",
    marginBottom: "8px",
  },

  changeLabel: {
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "850",
  },

  percent: {
    fontSize: "18px",
    fontWeight: "950",
    letterSpacing: "-0.04em",
    whiteSpace: "nowrap",
  },

  diff: {
    fontSize: "14px",
    fontWeight: "950",
    whiteSpace: "nowrap",
  },

  noChangeText: {
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: "850",
    marginBottom: "10px",
  },

  miniMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginTop: "12px",
    paddingTop: "10px",
    borderTop: "1px solid rgba(148,163,184,0.11)",
    color: "#9fb0c8",
    fontSize: "12px",
    fontWeight: "850",
    minWidth: 0,
  },

  miniFooterRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginTop: "8px",
    color: "#7f93b0",
    fontSize: "11px",
    fontWeight: "750",
    minWidth: 0,
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

  hyperChartPanel: {
    height: "760px",
    overflow: "hidden",
    borderRadius: "14px",
    border: "1px solid rgba(20,184,166,0.28)",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(8,14,27,0.98))",
    padding: "14px",
  },

  hyperChartTitle: {
    color: "#f8fafc",
    fontSize: "18px",
    fontWeight: "950",
    marginBottom: "6px",
  },

  hyperChartSub: {
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: "750",
    lineHeight: 1.5,
    marginBottom: "12px",
  },

  hyperChartNotice: {
    height: "calc(100% - 72px)",
    borderRadius: "12px",
    background: "rgba(2,6,23,0.88)",
    border: "1px solid rgba(20,184,166,0.20)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "18px",
    color: "#dbeafe",
    textAlign: "left",
    padding: "24px",
  },

  hyperChartNoticeIcon: {
    width: "54px",
    height: "54px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #2563eb, #14b8a6)",
    color: "white",
    fontSize: "28px",
    fontWeight: "950",
  },

  hyperChartNoticeTitle: {
    fontSize: "20px",
    fontWeight: "950",
    marginBottom: "8px",
  },

  hyperChartNoticeText: {
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: "800",
    lineHeight: 1.55,
  },

  hyperChartFrame: {
    width: "100%",
    height: "calc(100% - 72px)",
    borderRadius: "12px",
    background: "#020617",
    border: "1px solid rgba(148,163,184,0.12)",
  },


  hyperIntervalRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
  },

  hyperIntervalButton: {
    minWidth: "54px",
    height: "32px",
    borderRadius: "9px",
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(15,23,42,0.9)",
    color: "#9fb0c8",
    fontWeight: "900",
    cursor: "pointer",
  },

  hyperIntervalButtonActive: {
    background: "linear-gradient(135deg, #0f766e, #0891b2)",
    color: "white",
    border: "1px solid rgba(94,234,212,0.38)",
  },

  hyperLiveChartBox: {
    height: "calc(100% - 98px)",
    minHeight: "610px",
    borderRadius: "12px",
    background: "rgba(2,6,23,0.88)",
    border: "1px solid rgba(20,184,166,0.20)",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  hyperLiveChartTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
  },

  hyperLiveChartName: {
    color: "#f8fafc",
    fontSize: "18px",
    fontWeight: "950",
  },

  hyperLiveChartMeta: {
    color: "#8ea2bd",
    fontSize: "12px",
    fontWeight: "800",
    marginTop: "4px",
  },

  hyperLiveChartPrice: {
    color: "#f8fafc",
    fontSize: "24px",
    fontWeight: "950",
    letterSpacing: "-0.04em",
  },

  hyperLiveChartPercent: {
    fontSize: "14px",
    fontWeight: "950",
    marginTop: "4px",
  },

  hyperSvgChart: {
    flex: 1,
    width: "100%",
    minHeight: "480px",
    borderRadius: "10px",
    overflow: "hidden",
  },

  hyperLiveChartBottom: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "850",
  },

  hyperChartStatus: {
    height: "calc(100% - 98px)",
    minHeight: "610px",
    borderRadius: "12px",
    background: "rgba(2,6,23,0.88)",
    border: "1px solid rgba(20,184,166,0.20)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: "#dbeafe",
    fontSize: "15px",
    fontWeight: "850",
    lineHeight: 1.7,
    padding: "24px",
  },

  chartInfo: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "14px",
    color: "#94a3b8",
    fontWeight: "800",
  },

  newsPage: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  newsHeroHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    padding: "4px 0 2px",
  },

  newsTitleArea: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  newsIconBox: {
    width: "42px",
    height: "42px",
    borderRadius: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, rgba(37,99,235,0.90), rgba(14,165,233,0.74))",
    border: "1px solid rgba(147,197,253,0.30)",
    color: "#dbeafe",
    fontSize: "22px",
    fontWeight: "950",
    boxShadow: "0 16px 40px rgba(37,99,235,0.22)",
  },

  newsPageTitle: {
    fontSize: "28px",
    fontWeight: "950",
    letterSpacing: "-0.6px",
    color: "#f8fafc",
  },

  newsPageSub: {
    marginTop: "4px",
    color: "#9fb5d1",
    fontSize: "13px",
    fontWeight: "750",
  },

  newsSearchBox: {
    width: "260px",
    height: "44px",
    position: "relative",
    flexShrink: 0,
  },

  newsSearchInput: {
    width: "100%",
    height: "100%",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(15,23,42,0.78)",
    color: "#f8fafc",
    padding: "0 42px 0 16px",
    fontSize: "14px",
    fontWeight: "750",
    outline: "none",
    boxSizing: "border-box",
  },

  newsSearchIcon: {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#93a4bd",
    fontSize: "20px",
    fontWeight: "900",
  },

  newsFilterRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  newsFilterButton: {
    height: "36px",
    padding: "0 18px",
    borderRadius: "11px",
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.76)",
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: "900",
    cursor: "pointer",
  },

  newsFilterButtonActive: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    border: "1px solid rgba(96,165,250,0.42)",
    boxShadow: "0 12px 32px rgba(37,99,235,0.28)",
  },

  newsMainPanel: {
    padding: "12px",
    borderRadius: "18px",
    background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(8,14,27,0.98))",
    border: "1px solid rgba(148,163,184,0.14)",
    boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
  },

  newsRow: {
    display: "grid",
    gridTemplateColumns: "136px minmax(0, 1fr) 78px",
    gap: "18px",
    alignItems: "center",
    padding: "14px 10px",
    borderRadius: "15px",
    borderBottom: "1px solid rgba(148,163,184,0.10)",
    cursor: "pointer",
    transition: "transform 0.15s ease, background 0.15s ease",
  },

  newsThumb: {
    height: "92px",
    borderRadius: "13px",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
  },

  newsThumbIcon: {
    position: "relative",
    zIndex: 2,
    fontSize: "38px",
    fontWeight: "950",
    color: "white",
    textShadow: "0 10px 24px rgba(0,0,0,0.35)",
  },

  newsThumbGlow: {
    position: "absolute",
    inset: "-40% -10%",
    background:
      "radial-gradient(circle at 70% 28%, rgba(255,255,255,0.32), transparent 28%), linear-gradient(135deg, transparent, rgba(2,6,23,0.36))",
  },

  newsContent: {
    minWidth: 0,
  },

  newsTitleLine: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#f8fafc",
    fontSize: "17px",
    fontWeight: "950",
    lineHeight: 1.35,
    letterSpacing: "-0.2px",
  },

  newsHotBadge: {
    minWidth: "18px",
    height: "18px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ef4444",
    color: "white",
    fontSize: "11px",
    fontWeight: "950",
    flexShrink: 0,
  },

  newsMetaLine: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    marginTop: "9px",
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: "750",
  },

  newsSummaryText: {
    marginTop: "9px",
    color: "#b6c5d8",
    fontSize: "14px",
    lineHeight: 1.48,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },

  newsRightArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "14px",
  },

  newsCategoryBadge: {
    height: "28px",
    padding: "0 12px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "950",
    whiteSpace: "nowrap",
  },

  newsOpenHint: {
    color: "#60a5fa",
    fontSize: "12px",
    fontWeight: "950",
  },

  newsEmptyBox: {
    minHeight: "180px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    fontSize: "15px",
    fontWeight: "800",
  },

  newsMoreButton: {
    width: "230px",
    height: "42px",
    display: "block",
    margin: "14px auto 2px",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.88)",
    color: "#e2e8f0",
    fontSize: "14px",
    fontWeight: "950",
    cursor: "pointer",
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

  legalFooter: {
    margin: "20px 28px 0",
    padding: "20px 22px",
    borderRadius: "22px",
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.96))",
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.26)",
    color: "#cbd5e1",
  },

  legalFooterTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },

  legalFooterTitle: {
    fontSize: "22px",
    fontWeight: "950",
    color: "#ffffff",
    marginBottom: "4px",
  },

  legalFooterSub: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "700",
  },

  legalContactBox: {
    minWidth: "280px",
    padding: "12px 14px",
    borderRadius: "16px",
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.14)",
  },

  legalContactTitle: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "900",
    marginBottom: "6px",
  },

  legalEmail: {
    display: "inline-block",
    color: "#60a5fa",
    fontSize: "15px",
    fontWeight: "950",
    textDecoration: "none",
    marginBottom: "6px",
  },

  legalContactTime: {
    fontSize: "12px",
    color: "#cbd5e1",
    lineHeight: 1.6,
    fontWeight: "700",
  },

  legalNoticeBox: {
    display: "grid",
    gridTemplateColumns: "130px minmax(0, 1fr)",
    gap: "14px",
    alignItems: "start",
    padding: "14px 16px",
    borderRadius: "16px",
    background: "rgba(251,191,36,0.08)",
    border: "1px solid rgba(251,191,36,0.18)",
    color: "#fde68a",
    fontSize: "13px",
    lineHeight: 1.7,
    marginBottom: "14px",
  },

  legalSourceRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },

  legalSourceLabel: {
    fontSize: "13px",
    color: "#e2e8f0",
    fontWeight: "900",
  },

  legalSourceList: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  legalSourcePill: {
    padding: "7px 10px",
    borderRadius: "999px",
    background: "rgba(37,99,235,0.14)",
    border: "1px solid rgba(96,165,250,0.18)",
    color: "#bfdbfe",
    fontSize: "12px",
    fontWeight: "900",
  },

  legalFooterBottom: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    paddingTop: "12px",
    borderTop: "1px solid rgba(148,163,184,0.12)",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
    lineHeight: 1.6,
  },

  sidebarFooterSmall: {
    marginTop: "5px",
    fontSize: "11px",
    color: "#64748b",
    lineHeight: 1.5,
  },

};

export default App;