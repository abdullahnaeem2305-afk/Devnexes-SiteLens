"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Clock, 
  HardDrive, 
  Network, 
  Info,
  ChevronRight,
  TrendingUp,
  Award
} from "lucide-react";

export default function HomePage() {
  const [targetUrl, setTargetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [activeTab, setActiveTab] = useState<"failed" | "passed">("failed");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (autoSelectId?: number) => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
        if (data.history.length > 0) {
          if (autoSelectId) {
            const match = data.history.find((item: any) => item.id === autoSelectId);
            if (match) {
              setSelectedAudit(match);
              return;
            }
          }
          // Default to first if nothing is selected or if previous was deleted
          setSelectedAudit((prev: any) => {
            if (prev && data.history.some((h: any) => h.id === prev.id)) {
              return data.history.find((h: any) => h.id === prev.id);
            }
            return data.history[0];
          });
        } else {
          setSelectedAudit(null);
        }
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to scan website.");
      }

      setTargetUrl("");
      await fetchHistory(data.audit.id);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this scan from history?")) return;

    try {
      const res = await fetch(`/api/delete?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        if (selectedAudit && selectedAudit.id === id) {
          setSelectedAudit(null);
        }
        await fetchHistory();
      } else {
        alert("Delete failed: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const cleanUrl = (urlStr: string) => {
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
    } catch {
      return urlStr;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500 stroke-emerald-500 border-emerald-200 bg-emerald-50";
    if (score >= 50) return "text-amber-500 stroke-amber-500 border-amber-200 bg-amber-50";
    return "text-rose-500 stroke-rose-500 border-red-200 bg-red-50";
  };

  const getScoreHex = (score: number) => {
    if (score >= 90) return "#10b981";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "medium":
      case "warning":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "low":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  // Filter lists
  const currentList = selectedAudit 
    ? (activeTab === "failed" ? selectedAudit.issues : selectedAudit.passedChecks)
    : [];

  const filteredList = currentList.filter((item: any) => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSeverity = severityFilter === "all" || item.severity === severityFilter;
    return matchesCategory && matchesSeverity;
  });

  // SVG Trend Line rendering logic
  const drawTrendChart = () => {
    if (history.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center h-32 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center p-4">
          <p className="text-xs font-semibold text-slate-400">Trend requires at least 2 logs</p>
          <span className="text-[10px] text-slate-400">Scanned history will plot average score curves</span>
        </div>
      );
    }

    const data = [...history].slice(0, 8).reverse();
    const width = 320;
    const height = 100;
    const padding = 15;
    const maxVal = 100;

    const points = data.map((item, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - (item.averageScore / maxVal) * (height - padding * 2);
      return { x, y, score: item.averageScore };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
            </linearGradient>
          </defs>
          {/* Horizontal Grid */}
          <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="#f1f5f9" strokeWidth="1" />
          
          {/* Fill Area */}
          <path d={areaD} fill="url(#lineGrad)" />
          
          {/* Score line */}
          <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
          
          {/* Points */}
          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={pt.x} cy={pt.y} r="3.5" fill={getScoreHex(pt.score)} stroke="#ffffff" strokeWidth="1.5" />
              <text x={pt.x} y={pt.y - 8} fontSize="8" fontWeight="bold" fill="#334155" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity">
                {pt.score}
              </text>
            </g>
          ))}
        </svg>
        <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1 px-1">
          <span>{new Date(data[0].auditedAt).toLocaleDateString()}</span>
          <span>Score Progression Trend</span>
          <span>{new Date(data[data.length - 1].auditedAt).toLocaleDateString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col font-sans">
      
      {/* Header bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-200">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                Devnexes <span className="text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg text-sm font-bold border border-blue-100">SiteLens</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Multi-Engine Core Web Auditor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            PostgreSQL Drizzle Connected
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Scanner card */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="max-w-3xl mx-auto text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">Scan, Discover, and Refine Your Website</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
              Evaluate SEO signals, pinpoint axe-core accessibility compliance errors, analyze security response headers, and generate instant optimization reports.
            </p>
          </div>

          <form onSubmit={handleScan} className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 text-sm font-bold">
                  https://
                </div>
                <input 
                  type="text" 
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="example.com/blog-post" 
                  required
                  className="w-full pl-16 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm font-semibold transition-all shadow-inner"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2.5 flex-shrink-0 text-sm disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Auditing webpage...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Launch SiteLens Audit</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              🛡️ Includes DNS loopback resolution checks to guarantee full SSRF protection.
            </p>
          </form>
        </section>

        {/* Error alert */}
        {error && (
          <div className="bg-rose-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start max-w-3xl mx-auto w-full">
            <AlertTriangle className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900 text-sm">Audit Scan Blocked or Interrupted</h4>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* Core Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* History Sidebar */}
          <section className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="font-black text-slate-900 text-lg">Audit History</h3>
              <p className="text-xs text-slate-400">Scans stored on PostgreSQL via Drizzle</p>
            </div>

            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-xs font-semibold">No previous scans found</p>
                  <span className="text-[10px] opacity-75">Your completed audits will record here.</span>
                </div>
              ) : (
                history.map((item) => {
                  const isSelected = selectedAudit && selectedAudit.id === item.id;
                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedAudit(item)}
                      className={`border rounded-xl p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 relative group ${
                        isSelected 
                          ? "bg-blue-50 border-blue-400 text-blue-950 shadow-sm" 
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${getScoreColor(item.averageScore)}`}>
                            {item.averageScore}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(item.auditedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs font-bold truncate pr-6" title={item.url}>
                          {cleanUrl(item.url)}
                        </div>
                      </div>

                      <button 
                        onClick={(e) => handleDelete(e, item.id)}
                        className="absolute right-2 top-2.5 text-slate-400 hover:text-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete audit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Overall Score Trend</h4>
              {drawTrendChart()}
            </div>
          </section>

          {/* Active Statistics Dashboard */}
          <section className="lg:col-span-8">
            
            {!selectedAudit ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm h-full flex flex-col items-center justify-center min-h-[500px]">
                <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-4">
                  <Award className="w-10 h-10" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-xl">No Website Audited</h3>
                <p className="text-slate-500 text-sm max-w-sm mt-1.5 mx-auto">
                  Provide a public absolute URL in the scanner above to trigger a full real-time audit scan.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                
                {/* Header Information */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                        Scanned Site
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(selectedAudit.auditedAt).toLocaleString()}
                      </span>
                    </div>
                    <a 
                      href={selectedAudit.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-lg md:text-xl font-black text-slate-950 hover:text-blue-600 hover:underline break-all block leading-tight flex items-center gap-1.5"
                    >
                      {selectedAudit.url}
                      <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </a>
                  </div>
                  
                  <a 
                    href={`/api/report?id=${selectedAudit.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3.5 rounded-2xl flex items-center gap-2 transition-all self-stretch md:self-auto justify-center"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Export HTML Report</span>
                  </a>
                </div>

                {/* Metadata Pills */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latency (TTFB)</span>
                    <div className="flex justify-center mt-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                        selectedAudit.metadata.responseTimeMs > 1000 
                          ? "bg-red-50 text-red-700 border-red-100" 
                          : selectedAudit.metadata.responseTimeMs > 400 
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                      }`}>
                        {selectedAudit.metadata.responseTimeMs} ms
                      </span>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HTML Payload</span>
                    <span className="text-sm font-extrabold text-slate-800 block mt-1 flex items-center justify-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      {selectedAudit.metadata.pageSizeKB} KB
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resolved IP</span>
                    <span className="text-sm font-extrabold text-slate-800 block mt-1 truncate flex items-center justify-center gap-1">
                      <Network className="w-3.5 h-3.5 text-slate-400" />
                      {selectedAudit.metadata.resolvedIp || "N/A"}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Protocol</span>
                    <span className="text-sm font-extrabold text-blue-600 block mt-1 uppercase">
                      {selectedAudit.metadata.protocol}
                    </span>
                  </div>
                </div>

                {/* Score Dial Circles */}
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { key: "performance", label: "Performance" },
                    { key: "accessibility", label: "Accessibility" },
                    { key: "bestPractices", label: "Best Practices" },
                    { key: "seo", label: "SEO" },
                    { key: "security", label: "Security" }
                  ].map((metric) => {
                    const score = selectedAudit.scores[metric.key];
                    const circumference = 2 * Math.PI * 30;
                    const strokeDashoffset = circumference - (score / 100) * circumference;

                    return (
                      <div key={metric.key} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col items-center hover-card-trigger">
                        <div className="relative w-16 h-16">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="#f1f5f9" strokeWidth="5" fill="transparent" />
                            <circle 
                              cx="32" 
                              cy="32" 
                              r="28" 
                              stroke={getScoreHex(score)} 
                              strokeWidth="5" 
                              fill="transparent" 
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center font-black text-slate-800 text-sm">
                            {score}
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-2 tracking-wider text-center line-clamp-1">
                          {metric.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Stats indicators */}
                <div className="bg-slate-950 text-white rounded-3xl p-5 flex flex-wrap justify-between items-center gap-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 p-2.5 rounded-xl">
                      <AlertTriangle className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical Failures</div>
                      <div className="text-xl font-black text-white">{selectedAudit.counts.critical}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-2.5 rounded-xl">
                      <Info className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Warnings & Lows</div>
                      <div className="text-xl font-black text-white">{selectedAudit.counts.warning}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2.5 rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Passed Checks</div>
                      <div className="text-xl font-black text-white">{selectedAudit.counts.passed}</div>
                    </div>
                  </div>
                </div>

                {/* Active Findings list block */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                  
                  {/* Category select filters */}
                  <div className="mb-5">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Filter by Category</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "all", label: "All Categories" },
                        { id: "Security", label: "Security" },
                        { id: "SEO", label: "SEO / Cheerio" },
                        { id: "Accessibility", label: "Accessibility / Axe" },
                        { id: "Best Practices", label: "Best Practices" },
                        { id: "Performance", label: "Performance" }
                      ].map(cat => (
                        <button 
                          key={cat.id}
                          onClick={() => setCategoryFilter(cat.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                            categoryFilter === cat.id 
                              ? "bg-blue-600 text-white border-blue-600" 
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Severity select filters */}
                  <div className="mb-6">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Filter by Severity</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "all", label: "All Severities" },
                        { id: "critical", label: "Critical / High" },
                        { id: "warning", label: "Warning / Medium" },
                        { id: "low", label: "Low" }
                      ].map(sev => (
                        <button 
                          key={sev.id}
                          onClick={() => setSeverityFilter(sev.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                            severityFilter === sev.id 
                              ? "bg-blue-600 text-white border-blue-600" 
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {sev.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Failed vs Passed tabs */}
                  <div className="flex border-b border-slate-100 mb-6">
                    <button 
                      onClick={() => { setActiveTab("failed"); setSeverityFilter("all"); }}
                      className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === "failed" 
                          ? "border-blue-600 text-blue-600" 
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Failed Audits / Issues ({selectedAudit.issues.length})
                    </button>
                    <button 
                      onClick={() => { setActiveTab("passed"); setSeverityFilter("all"); }}
                      className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
                        activeTab === "passed" 
                          ? "border-emerald-600 text-emerald-600" 
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Passed Checks ({selectedAudit.passedChecks.length})
                    </button>
                  </div>

                  {/* Filtered list rendering */}
                  <div className="space-y-4">
                    {filteredList.length === 0 ? (
                      <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <CheckCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-500">No audits match your selected filter criteria.</p>
                        <button 
                          onClick={() => { setCategoryFilter("all"); setSeverityFilter("all"); }}
                          className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                        >
                          Reset Filters
                        </button>
                      </div>
                    ) : (
                      filteredList.map((item: any, idx: number) => {
                        if (activeTab === "failed") {
                          const isCritical = item.severity === "critical" || item.severity === "high";
                          return (
                            <div 
                              key={idx}
                              className={`bg-white rounded-xl border border-slate-200 border-l-4 p-5 hover-card-trigger shadow-sm ${
                                isCritical ? "border-l-red-500" : "border-l-amber-500"
                              }`}
                            >
                              <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                                <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.title}</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-150">
                                    {item.category}
                                  </span>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${getSeverityBadge(item.severity)}`}>
                                    {item.severity}
                                  </span>
                                </div>
                              </div>

                              <div className="mb-3">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Evidence / Payload
                                </span>
                                <pre className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[11px] font-mono text-slate-700 overflow-x-auto max-h-24 whitespace-pre-wrap break-all">
                                  {item.evidence}
                                </pre>
                              </div>

                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Actionable Recommendation
                                </span>
                                <p className="text-slate-700 text-xs leading-relaxed font-medium">
                                  {item.recommendation}
                                </p>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div 
                              key={idx}
                              className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 p-4 hover-card-trigger shadow-sm flex items-center justify-between gap-4 flex-wrap"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4" />
                                </span>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-xs">{item.title}</h4>
                                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{item.evidence}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded border border-slate-100">
                                {item.category}
                              </span>
                            </div>
                          );
                        }
                      })
                    )}
                  </div>

                </div>

              </div>
            )}

          </section>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-slate-400 font-medium">
            © 2026 Devnexes SiteLens. Workspace preview. Powered by Next.js, PostgreSQL and Drizzle ORM.
          </p>
        </div>
      </footer>

    </div>
  );
}
