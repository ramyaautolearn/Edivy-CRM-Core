import React, { useState, useEffect } from 'react';
import { 
  Activity, Users, Calendar, Filter, Clock, 
  MessageCircle, Phone, Video, FileText, Zap, Shield, RefreshCw, Download
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function AgentAnalytics() {
  const [leads, setLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date Filter State
  const [timeFilter, setTimeFilter] = useState('today');
  const [filterCustomDate, setFilterCustomDate] = useState('');

  const appId = 'edivy-crm-vault';

  useEffect(() => {
    if (!db) return;

    // 1. Fetch Agents for Badges
    const unsubAgents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Fetch Leads to harvest the logs
    const unsubLeads = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), (snap) => {
      setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubAgents(); unsubLeads(); };
  }, []);

  // ==========================================
  // BULLETPROOF DATE PARSER
  // ==========================================
  const getSafeDateObj = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'object' && dateVal.seconds) {
      return new Date(dateVal.seconds * 1000);
    }
    if (typeof dateVal === 'string') {
      return new Date(dateVal);
    }
    return null;
  };

  // --- REPORT GENERATION ENGINE ---
  const generateReport = () => {
    const report = {};
    const now = new Date();
    
    // Create safe comparison strings for today and yesterday
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    leads.forEach(lead => {
      if (!lead.logs || !Array.isArray(lead.logs)) return;

      lead.logs.forEach(log => {
        // Safely parse the log date
        const logDateObj = getSafeDateObj(log.date);
        if (!logDateObj || isNaN(logDateObj)) return; // Skip broken logs safely

        const logDateStr = logDateObj.toISOString().split('T')[0];
        
        // Apply Time Filters
        if (timeFilter === 'today' && logDateStr !== todayStr) return;
        if (timeFilter === 'yesterday' && logDateStr !== yesterdayStr) return;
        if (timeFilter === 'week') {
            const logTime = logDateObj.getTime();
            const weekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
            if (logTime < weekAgo) return;
        }
        if (timeFilter === 'custom' && (!filterCustomDate || logDateStr !== filterCustomDate)) return;

        const agentName = log.agent || 'Unknown Agent';

        // Initialize agent in report if not exists
        if (!report[agentName]) {
          report[agentName] = {
            name: agentName,
            whatsapp: 0,
            call: 0,
            meeting: 0,
            note: 0,
            system: 0,
            total: 0,
            lastActiveObj: logDateObj 
          };
        }

        // Tally Actions
        if (log.type === 'WhatsApp') report[agentName].whatsapp++;
        else if (log.type === 'Call') report[agentName].call++;
        else if (log.type === 'Meeting') report[agentName].meeting++;
        else if (log.type === 'System') report[agentName].system++;
        else report[agentName].note++; // Internal Notes

        report[agentName].total++;

        // Calculate Last Active Timestamp
        if (logDateObj > report[agentName].lastActiveObj) {
          report[agentName].lastActiveObj = logDateObj;
        }
      });
    });

    // Convert object to array and sort by most total actions
    return Object.values(report).sort((a, b) => b.total - a.total);
  };

  const activityData = generateReport();

  // Helper to attach Agent Badge ID
  const getBadgeForAgent = (agentName) => {
    const agentDoc = agents.find(a => a.name === agentName);
    return agentDoc?.badge_id ? `[${agentDoc.badge_id}]` : null;
  };

  // Grand Totals for Summary Cards
  const grandTotals = activityData.reduce((acc, curr) => ({
    whatsapp: acc.whatsapp + curr.whatsapp,
    call: acc.call + curr.call,
    meeting: acc.meeting + curr.meeting,
    system: acc.system + curr.system,
    note: acc.note + curr.note,
    total: acc.total + curr.total
  }), { whatsapp: 0, call: 0, meeting: 0, system: 0, note: 0, total: 0 });


  // --- CSV EXPORT LOGIC ---
  const handleDownloadCSV = () => {
    if (activityData.length === 0) {
      alert("No data to export for this timeframe.");
      return;
    }

    const headers = ['Agent Name', 'Total Actions', 'WhatsApp Messages', 'Phone Calls', 'Meetings', 'System Moves / Notes', 'Last Active Time'];
    
    const csvRows = activityData.map(agent => {
      const badge = getBadgeForAgent(agent.name);
      const displayName = badge ? `${badge} ${agent.name}` : agent.name;
      return [
        `"${displayName}"`,
        agent.total,
        agent.whatsapp,
        agent.call,
        agent.meeting,
        `"${agent.system} / ${agent.note}"`,
        `"${new Date(agent.lastActiveObj).toLocaleString()}"`
      ];
    });

    // Append a Grand Totals row to the bottom of the Excel file
    csvRows.push([
      '"GRAND TOTALS"',
      grandTotals.total,
      grandTotals.whatsapp,
      grandTotals.call,
      grandTotals.meeting,
      `"${grandTotals.system} / ${grandTotals.note}"`,
      '""'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Edivy_Timesheet_${timeFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };


  if (loading) {
    return <div className="p-20 flex flex-col items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-4" /><p className="text-sm font-bold text-slate-400">Loading Timesheets...</p></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase flex items-center">
            <Activity className="w-6 h-6 mr-3 text-indigo-600" /> Agent Timesheets & Activity
          </h2>
          <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mt-1">
            Real-time productivity and velocity tracking
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400 mr-2 ml-2" />
            <select 
              value={timeFilter} 
              onChange={(e) => {
                setTimeFilter(e.target.value);
                if (e.target.value !== 'custom') setFilterCustomDate('');
              }}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer pr-4"
            >
              <option value="today">Today's Activity</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Past 7 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Specific Date...</option>
            </select>
          </div>

          {timeFilter === 'custom' && (
            <input 
              type="date" 
              value={filterCustomDate} 
              onChange={(e) => setFilterCustomDate(e.target.value)} 
              className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-4 py-2 text-sm font-bold outline-none cursor-pointer shadow-sm animate-in fade-in"
            />
          )}

          <button 
            onClick={handleDownloadCSV} 
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl flex items-center shadow-sm text-xs uppercase tracking-widest transition-all"
          >
            <Download className="w-4 h-4 mr-2 text-slate-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* SUMMARY METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Actions</span>
          <span className="text-3xl font-black text-white">{grandTotals.total}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center"><MessageCircle className="w-3 h-3 mr-1"/> WhatsApps</span>
          <span className="text-3xl font-black text-emerald-700">{grandTotals.whatsapp}</span>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center"><Phone className="w-3 h-3 mr-1"/> Calls</span>
          <span className="text-3xl font-black text-blue-700">{grandTotals.call}</span>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 flex items-center"><Video className="w-3 h-3 mr-1"/> Meetings</span>
          <span className="text-3xl font-black text-purple-700">{grandTotals.meeting}</span>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center"><Zap className="w-3 h-3 mr-1"/> System Moves</span>
          <span className="text-3xl font-black text-amber-700">{grandTotals.system}</span>
        </div>
      </div>

      {/* ACTIVITY LEDGER TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent / Operator</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Velocity (Total)</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Messages</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Calls</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Meetings</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pipeline / Notes</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Last Action Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">
                    No activity recorded for this timeframe.
                  </td>
                </tr>
              ) : (
                activityData.map((agent) => {
                  const badge = getBadgeForAgent(agent.name);
                  
                  // Safe Date Math
                  const now = new Date();
                  const minsAgo = Math.floor((now - agent.lastActiveObj) / 60000);
                  let timeAgoStr = `${minsAgo}m ago`;
                  
                  if (minsAgo < 1) timeAgoStr = 'Just Now';
                  else if (minsAgo > 60 && minsAgo < 1440) timeAgoStr = `${Math.floor(minsAgo/60)}h ${minsAgo%60}m ago`;
                  else if (minsAgo >= 1440) timeAgoStr = agent.lastActiveObj.toLocaleDateString();

                  return (
                    <tr key={agent.name} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black mr-3 uppercase">
                            {agent.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 flex items-center">
                              {badge && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded mr-1.5">{badge}</span>}
                              {agent.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center bg-slate-900 text-white font-black text-sm px-3 py-1 rounded-lg shadow-sm">
                          {agent.total}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-emerald-600">{agent.whatsapp}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-blue-600">{agent.call}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-purple-600">{agent.meeting}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-amber-600">{agent.system} <span className="text-slate-300 mx-1">/</span> {agent.note}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <Clock className="w-3 h-3 mr-1.5" />
                          <span className={minsAgo < 15 ? 'text-emerald-500' : ''}>
                            {timeAgoStr}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}