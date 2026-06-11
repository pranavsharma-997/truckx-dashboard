"use client";


import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";


const PAGE_SIZE = 1000;
const TIME_ZONE = "America/Los_Angeles";


function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}


function getToday() {
  return toDateInput(new Date());
}


function getLast7Start() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return toDateInput(d);
}


function getItemDate(item) {
  return item.login_datetime || item.created_at || item.created || item.date || "";
}


function parsePSTDate(value) {
  if (!value) return null;


  const text = String(value).trim();
  const normalized = text.includes("T") ? text : text.replace(" ", "T");


  if (/(Z$|[+-]\d{2}:?\d{2}$)/.test(normalized)) {
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }


  const [datePart, timePart = "00:00:00"] = normalized.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);


  if ([year, month, day, hour, minute, second].some((n) => Number.isNaN(n))) return null;


  const utc = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(utc);
}


function formatDateTimePST(value) {
  const d = parsePSTDate(value);
  if (!d) return "-";
  return d.toLocaleString("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}


function formatTimeOnlyPST(value) {
  const d = parsePSTDate(value);
  if (!d) return "-";
  return d.toLocaleTimeString("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}


function getDateOnly(value) {
  const d = parsePSTDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}


function getDayName(date) {
  return date.toLocaleDateString("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  });
}


function statusBadge(status) {
  if (status === "RESOLVED") return "bg-emerald-100 text-emerald-700";
  if (status === "PENDING") return "bg-orange-100 text-orange-700";
  return "bg-slate-100 text-slate-700";
}


export default function Dashboard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedPages, setLoadedPages] = useState(0);
  const [activePage, setActivePage] = useState("overview");
  const [clock, setClock] = useState(null);


  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");


  const [startDate, setStartDate] = useState(getLast7Start());
  const [endDate, setEndDate] = useState(getToday());


  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;


  useEffect(() => {
  fetchDashboardData();
}, []);


useEffect(() => {
  setClock(new Date());
  const timer = setInterval(() => setClock(new Date()), 1000);
  return () => clearInterval(timer);
}, []);


useEffect(() => {
  const timer = setTimeout(() => {
    setSearch(searchInput);
  }, 300);


  return () => clearTimeout(timer);
}, [searchInput]);


  async function loadRangeData(fromDate, toDate, query = "", updateProgress = false) {
    let allLogs = [];
    let totalLoadedPages = 0;


    const start = new Date(fromDate);
    const end = new Date(toDate);


    const dayList = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dayList.push(toDateInput(new Date(d)));
    }


    for (const day of dayList) {
      const dayStart = `${day}T00:00:00`;
      const dayEnd = `${day}T23:59:59`;


      let page = 1;
const MAX_PAGES_PER_DAY = 20;


while (page <= MAX_PAGES_PER_DAY) {
        const url =
          `https://support.truckx.com/api/client-service/support/site-search/` +
          `?page=${page}&page_size=${PAGE_SIZE}&query=${encodeURIComponent(query)}` +
          `&start_date=${dayStart}&end_date=${dayEnd}`;


        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });


        if (!res.ok) break;


        const data = await res.json();
        const logs = data.logs || [];


        if (!logs.length) break;


        allLogs.push(...logs);
        totalLoadedPages++;


       if (updateProgress && totalLoadedPages % 5 === 0) {
  setLoadedPages(totalLoadedPages);
}


        if (logs.length < PAGE_SIZE) break;
        page++;
      }
    }


    return { logs: allLogs, pages: totalLoadedPages };
  }


  async function fetchDashboardData() {
    try {
      setLoading(true);
      setIssues([]);
      setLoadedPages(0);
      setCurrentPage(1);


      const result = await loadRangeData(startDate, endDate, "", true);
      setIssues(result.logs);
      setLoadedPages(result.pages);
    } catch (error) {
      console.error("Dashboard API Error:", error);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }


  function formatTime(timeZone) {
    if (!clock) return "--:--:--";
    return clock.toLocaleTimeString("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }


  function formatDate(timeZone) {
    if (!clock) return "--";
    return clock.toLocaleDateString("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }


  const filteredIssues = useMemo(() => {
    const text = search.toLowerCase();


    return issues.filter((item) => {
      return (
        (!search ||
          item.dot?.toString().toLowerCase().includes(text) ||
          item.caller_name?.toLowerCase().includes(text) ||
          item.phone_number?.toString().toLowerCase().includes(text) ||
          item.product?.toLowerCase().includes(text) ||
          item.support_person?.toLowerCase().includes(text) ||
          item.issue_type?.toLowerCase().includes(text) ||
          item.problem?.toLowerCase().includes(text) ||
          item.company_name?.toLowerCase().includes(text)) &&
        (!statusFilter || item.status === statusFilter) &&
        (!productFilter || item.product === productFilter) &&
        (!agentFilter || item.support_person === agentFilter)
      );
    });
  }, [issues, search, statusFilter, productFilter, agentFilter]);


  const { pendingCount, resolvedCount } = useMemo(() => {
  let pending = 0;
  let resolved = 0;


  for (const item of filteredIssues) {
    if (item.status === "PENDING") pending++;
    if (item.status === "RESOLVED") resolved++;
  }


  return {
    pendingCount: pending,
    resolvedCount: resolved,
  };
}, [filteredIssues]);


  const { uniqueProducts, uniqueAgents } = useMemo(() => {
  return {
    uniqueProducts: [
      ...new Set(
        issues
          .map((i) => i.product)
          .filter(Boolean)
      ),
    ],
    uniqueAgents: [
      ...new Set(
        issues
          .map((i) => i.support_person)
          .filter(Boolean)
      ),
    ],
  };
}, [issues]);


  const productData = uniqueProducts
    .map((product) => ({
      name: product,
      count: filteredIssues.filter((i) => i.product === product).length,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);


  const agentData = uniqueAgents
    .map((agent) => ({
      name: agent,
      count: filteredIssues.filter((i) => i.support_person === agent).length,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);


  const today = getToday();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toDateInput(yesterdayDate);


  const todayCount = filteredIssues.filter((i) => getDateOnly(getItemDate(i)) === today).length;
  const yesterdayCount = filteredIssues.filter((i) => getDateOnly(getItemDate(i)) === yesterday).length;


  const dayMap = {};
  filteredIssues.forEach((item) => {
    const d = getDateOnly(getItemDate(item));
    if (d) dayMap[d] = (dayMap[d] || 0) + 1;
  });


  const dailyTrend = Object.keys(dayMap)
    .sort()
    .map((date) => ({ date, count: dayMap[date] }));


  const topProduct = productData[0]?.name || "-";
  const topAgent = agentData[0]?.name || "-";
  const avgPerDay = dailyTrend.length ? Math.round(filteredIssues.length / dailyTrend.length) : 0;


  const resolutionRate = filteredIssues.length ? Math.round((resolvedCount / filteredIssues.length) * 100) : 0;
  const pendingRate = filteredIssues.length ? Math.round((pendingCount / filteredIssues.length) * 100) : 0;


  const pieData = [
    { name: "PENDING", value: pendingCount },
    { name: "RESOLVED", value: resolvedCount },
  ];


  const dotMap = {};
  const phoneMap = {};
  filteredIssues.forEach((item) => {
    if (item.dot) dotMap[item.dot] = (dotMap[item.dot] || 0) + 1;
    if (item.phone_number) phoneMap[item.phone_number] = (phoneMap[item.phone_number] || 0) + 1;
  });


  const repeatDotData = Object.keys(dotMap)
    .map((key) => ({ name: key, count: dotMap[key] }))
    .filter((x) => x.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);


  const repeatPhoneData = Object.keys(phoneMap)
    .map((key) => ({ name: key, count: phoneMap[key] }))
    .filter((x) => x.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);


  const latestOpenIssues = [...filteredIssues]
    .filter((i) => i.status === "PENDING")
    .sort((a, b) => {
      const da = parsePSTDate(getItemDate(a))?.getTime() || 0;
      const db = parsePSTDate(getItemDate(b))?.getTime() || 0;
      return db - da;
    })
    .slice(0, 8);


  const totalPages = Math.ceil(filteredIssues.length / rowsPerPage) || 1;
  const paginatedIssues = filteredIssues.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);


  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setProductFilter("");
    setAgentFilter("");
    setCurrentPage(1);
  }


  function exportCSV() {
    const headers = [
      "DOT",
      "Status",
      "Caller",
      "Phone",
      "Product",
      "Issue Type",
      "Agent",
      "Company",
      "Problem",
      "Login Time (PST)",
    ];


    const rows = filteredIssues.map((item) => [
      item.dot || "",
      item.status || "",
      item.caller_name || "",
      item.phone_number || "",
      item.product || "",
      item.issue_type || item.problem || "",
      item.support_person || "",
      item.company_name || "",
      item.problem || "",
      formatDateTimePST(getItemDate(item)),
    ]);


    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
    ].join("\n");


    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "truckx-support-dashboard.csv";
    link.click();
    URL.revokeObjectURL(url);
  }


  const menuItems = [
    ["overview", "Executive Overview"],
    ["products", "Product Insights"],
    ["agents", "Agent Performance"],
    ["repeat", "Repeat Accounts"],
    ["tickets", "All Records"],
  ];


  return (
    <main className="flex min-h-screen bg-[#eef3f9] text-slate-900">
      <aside className="fixed left-0 top-0 h-screen w-72 bg-gradient-to-b from-[#06101f] via-[#0b1d3a] to-[#102e65] p-5 text-white shadow-2xl">
        <h1 className="text-2xl font-black">TruckX</h1>
        <p className="mb-8 mt-1 text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
          Support Command Center
        </p>


        <nav className="space-y-2">
          {menuItems.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className={`w-full rounded-2xl px-4 py-3 text-left font-bold transition ${
                activePage === id
                  ? "bg-white text-blue-900 shadow-xl"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>


        <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-white/10 p-4">
          <p className="text-xs font-bold text-blue-200">Default View</p>
          <p className="mt-1 text-sm font-black">Last 7 Days</p>
          <p className="mt-2 text-xs text-slate-300">Dashboard loads account activity only.</p>
        </div>
      </aside>


      <section className="ml-72 flex-1 p-6">
        <div className="mb-6 rounded-[32px] bg-gradient-to-r from-[#06101f] via-[#12306a] to-[#06101f] p-7 text-white shadow-xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-300">
                Executive Support Analytics
              </p>
              <h2 className="mt-2 text-4xl font-black">Account Activity Dashboard</h2>
              <p className="mt-2 text-sm text-slate-300">
                Dashboard range: {startDate} to {endDate} | Loaded pages: {loadedPages} | Account opens: {issues.length}
              </p>
            </div>


            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-200">Pacific Time</p>
                <p className="mt-1 font-mono text-3xl font-black">{formatTime("America/Los_Angeles")}</p>
                <p className="text-xs text-slate-300">{formatDate("America/Los_Angeles")}</p>
              </div>


              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-200">IST Time</p>
                <p className="mt-1 font-mono text-3xl font-black">{formatTime("Asia/Kolkata")}</p>
                <p className="text-xs text-slate-300">{formatDate("Asia/Kolkata")}</p>
              </div>
            </div>
          </div>


          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={exportCSV} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950 shadow">
              Export CSV
            </button>


            <button onClick={fetchDashboardData} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow">
              Refresh Dashboard
            </button>
          </div>
        </div>


        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-6">
          <input
  value={searchInput}
  onChange={(e) => {
    setSearchInput(e.target.value);
    setCurrentPage(1);
  }}
  placeholder="Search DOT / Caller / Phone"
  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm outline-none focus:border-blue-500"
/>


          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
          </select>


          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <option value="">All Products</option>
            {uniqueProducts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>


          <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <option value="">All Agents</option>
            {uniqueAgents.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>


          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          />
        </div>


        <div className="mb-6 flex gap-3">
          <button onClick={fetchDashboardData} className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white shadow">
            Apply Date Range
          </button>


          <button onClick={clearFilters} className="rounded-xl bg-red-100 px-5 py-3 font-bold text-red-700 shadow">
            Clear Filters
          </button>
        </div>


        {loading ? (
          <div className="rounded-3xl bg-white p-10 text-center text-xl font-black shadow">
            Loading last 7 days account activity... Pages: {loadedPages} | Records: {issues.length}
          </div>
        ) : (
          <>
            {activePage === "overview" && (
              <>
                <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">
                        TruckX Support Analytics
                      </p>
                      <h2 className="mt-2 text-3xl font-black text-slate-900">Executive Support Snapshot</h2>


                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {[
                          `${filteredIssues.length} account opens in selected range`,
                          `${resolutionRate}% resolved and ${pendingRate}% pending`,
                          `${topProduct} is the highest activity product`,
                          `${topAgent} is the top active agent`,
                        ].map((item, index) => (
                          <div
                            key={index}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-700"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>


                    <div className="min-w-[260px] rounded-3xl bg-gradient-to-br from-blue-700 to-slate-950 p-6 text-white shadow-xl">
                      <p className="text-sm font-bold text-blue-200">Resolution Rate</p>
                      <p className="mt-2 text-5xl font-black">{resolutionRate}%</p>
                      <p className="mt-2 text-sm text-slate-300">Based on selected dashboard range</p>
                    </div>
                  </div>
                </div>


                <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-4">
                  {[
                    ["Total Account Opens", filteredIssues.length, "text-blue-700"],
                    ["Pending Issues", pendingCount, "text-orange-500"],
                    ["Resolved Issues", resolvedCount, "text-emerald-600"],
                    ["Today's Opens", todayCount, "text-purple-600"],
                    ["Yesterday Opens", yesterdayCount, "text-slate-700"],
                    ["Avg Opens / Day", avgPerDay, "text-cyan-600"],
                    ["Top Product", topProduct, "text-indigo-600"],
                    ["Top Agent", topAgent, "text-rose-600"],
                  ].map(([title, value, color]) => (
                    <div key={title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-500">{title}</h3>
                      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>


                <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-xl font-black">Daily Account Open Trend</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={dailyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" hide />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>


                  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-xl font-black">Issue Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" outerRadius={110} label>
                          <Cell fill="#f97316" />
                          <Cell fill="#22c55e" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>


                <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-xl font-black">Agent Leaderboard</h3>


                    <div className="space-y-3">
                      {agentData.slice(0, 5).map((agent, index) => (
                        <div key={agent.name} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                          <div>
                            <p className="font-black text-slate-900">
                              {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}{" "}
                              {agent.name}
                            </p>
                            <p className="text-xs font-bold text-slate-500">Account opens handled</p>
                          </div>


                          <p className="text-2xl font-black text-blue-700">{agent.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>


                  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-xl font-black">Latest Pending Accounts</h3>
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      {latestOpenIssues.length === 0 ? (
                        <p className="text-sm text-gray-500">No pending accounts found.</p>
                      ) : (
                        latestOpenIssues.map((item, index) => (
                          <div key={index} className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                            <div className="flex justify-between gap-3">
                              <p className="font-black text-orange-800">DOT: {item.dot || "-"}</p>
                              <p className="text-sm font-bold text-orange-700">{item.support_person || "-"}</p>
                            </div>
                            <p className="mt-1 text-sm text-slate-700">
                              {item.caller_name || "-"} | {item.phone_number || "-"} | {item.product || "-"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTimePST(getItemDate(item))}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}


            {activePage === "products" && (
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xl font-black">Product-wise Account Opens</h3>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={productData.slice(0, 25)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}


            {activePage === "agents" && (
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xl font-black">Agent-wise Account Opens</h3>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={agentData.slice(0, 30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}


            {activePage === "repeat" && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-xl font-black">Repeat DOT Analysis</h3>
                  {repeatDotData.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        setSearch(item.name);
                        setActivePage("tickets");
                      }}
                      className="mb-3 flex w-full justify-between rounded-2xl bg-blue-50 p-4 text-left hover:bg-blue-100"
                    >
                      <span className="font-bold">DOT: {item.name}</span>
                      <span className="font-black text-blue-700">{item.count} opens</span>
                    </button>
                  ))}
                </div>


                <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-xl font-black">Repeat Phone Analysis</h3>
                  {repeatPhoneData.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        setSearch(item.name);
                        setActivePage("tickets");
                      }}
                      className="mb-3 flex w-full justify-between rounded-2xl bg-purple-50 p-4 text-left hover:bg-purple-100"
                    >
                      <span className="font-bold">Phone: {item.name}</span>
                      <span className="font-black text-purple-700">{item.count} opens</span>
                    </button>
                  ))}
                </div>
              </div>
            )}


            {activePage === "tickets" && (
              <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b p-5">
                  <div>
                    <h3 className="text-2xl font-black">All Account Open Records</h3>
                    <p className="text-sm text-gray-500">
                      Showing {paginatedIssues.length} of {filteredIssues.length}
                    </p>
                  </div>


                  <div className="font-bold">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>


                <table className="w-full text-sm">
                  <thead className="bg-slate-200 text-left">
                    <tr>
                      <th className="p-4">DOT</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Caller</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Product</th>
                      <th className="p-4">Issue</th>
                      <th className="p-4">Agent</th>
                      <th className="p-4">Login Time (PST)</th>
                    </tr>
                  </thead>


                  <tbody>
                    {paginatedIssues.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-blue-50">
                        <td className="p-4 font-bold text-blue-700">{item.dot || "-"}</td>
                        <td className="p-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadge(item.status)}`}>
                            {item.status || "-"}
                          </span>
                        </td>
                        <td className="p-4">{item.caller_name || "-"}</td>
                        <td className="p-4">{item.phone_number || "-"}</td>
                        <td className="p-4">{item.product || "-"}</td>
                        <td className="p-4">{item.issue_type || item.problem || "-"}</td>
                        <td className="p-4">{item.support_person || "-"}</td>
                        <td className="p-4">{formatDateTimePST(getItemDate(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>


                <div className="flex items-center justify-between p-5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="rounded-xl border px-5 py-2 font-bold disabled:opacity-40"
                  >
                    Previous
                  </button>


                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="rounded-xl border px-5 py-2 font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}