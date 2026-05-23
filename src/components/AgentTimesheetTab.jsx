import React, { useState, useEffect } from 'react';
import { 
  Clock, Activity, Calendar, Phone, MessageSquare, Video, Zap, Target, FileText, ArrowRight, AlertCircle, BarChart3, TrendingUp
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function AgentTimesheetTab({ user, openDealRoom }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date & Scope State
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [kpiScope, setKpiScope] = useState('daily'); // 'daily', 'wtd', 'mtd'

  const appId = 'edivy-crm-vault';

  useEffect(() => {
    if (!db || !user?.name) return;

    const unsubLeads = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), (snap) => {
      const allFetchedLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeads(allFetchedLeads);
      setLoading(false);
    });

    return () => unsubLeads();
  }, [user]);

  // --- AUTOMATIC TIMESHEET HARVESTER ---
  let agentLogs = [];
  leads.forEach(lead => {
      if (lead.logs && Array.isArray(lead.logs)) {
          lead.logs.forEach(log => {
              if (log.agent === user?.name || log.agent === user?.id) {
                  agentLogs.push({
                      ...log,
                      lead_id: lead.id,
                      school_name: lead.school_name,
                      score: lead.score
                  });
              }
          });
      }
  });

  // --- DATE MATH FOR WTD & MTD ---
  const todayObj = new Date();
  
  // Calculate Monday of this week
  const day = todayObj.getDay();
  const diffToMonday = todayObj.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(todayObj.setDate(diffToMonday));
  startOfWeek.setHours(0, 0, 0, 0);

  // Calculate 1st of this month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Filter logs based on the selected scope
  const scopedLogs = agentLogs.filter(log => {
      if (!log.date) return false;
      const logDate = new Date(log.date);
      
      if (kpiScope === 'daily') {
          return logDate.toISOString().split('T')[0] === selectedDate;
      } else if (kpiScope === 'wtd') {
          return logDate >= startOfWeek;
      } else if (kpiScope === 'mtd') {
          return logDate >= startOfMonth;
      }
      return false;
  });

  // Chronological Ledger (Always maps to the selected Daily Date to prevent massive scrolling)
  const ledgerLogs = agentLogs.filter(log => log.date && new Date(log.date).toISOString().split('T')[0] === selectedDate)
                              .sort((a, b) => new Date(b.date) - new Date(a.date));

  // --- KPI CALCULATIONS ---
  const kpiData = {
      totalActions: scopedLogs.length,
      whatsapp: scopedLogs.filter(l => l.type === 'WhatsApp').length,
      calls: scopedLogs.filter(l => l.type === 'Call').length,
      meetings: scopedLogs.filter(l => l.type === 'Meeting' || l.text.includes('Meeting Booked') || l.text.includes('Demo Booked')).length,
      advancements: scopedLogs.filter(l => l.text.includes('Jumped to Pipeline Stage')).length, // NEW: Quality Tracking
  };

  // Dynamic Targets based on Scope
  const multiplier = kpiScope === 'daily' ? 1 : kpiScope === 'wtd' ? 5 : 20;
  const targets = { 
      calls: 30 * multiplier, 
      whatsapp: 50 * multiplier,
      advancements: 5 * multiplier
  };

  // Helper for Icons
  const getLogIcon = (type) => {
    if (type === 'WhatsApp') return <MessageSquare className="w-5 h-5 text-emerald-500" />;
    if (type === 'Call') return <Phone className="w-5 h-5 text-blue-500" />;
    if (type === 'Meeting') return <Video className="w-5 h-5 text-purple-500" />;
    if (type === 'System') return <Zap className="w-5 h-5 text-amber-500" />;
    return <FileText className="w-5 h-5 text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="animate-pulse flex items-center text-indigo-500 font-black tracking-widest uppercase text-sm">
          <Clock className="w-5 h-5 mr-2 animate-bounce" /> Compiling Timesheet...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header & View Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
              <Activity className="w-6 h-6 mr-3 text-indigo-600" /> Performance & Timesheet
            </h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
              Zero-Friction Activity Tracking
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* Scope Toggle (Daily, WTD, MTD) */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                <button onClick={() => setKpiScope('daily')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${kpiScope === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Daily</button>
                <button onClick={() => setKpiScope('wtd')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${kpiScope === 'wtd' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>WTD</button>
                <button onClick={() => setKpiScope('mtd')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${kpiScope === 'mtd' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>MTD</button>
            </div>
            
            {/* Daily Date Selector (Only relevant for Daily KPI and Ledger) */}
            <div className="flex flex-col justify-center">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => { setSelectedDate(e.target.value); setKpiScope('daily'); }} 
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 cursor-pointer shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* KPI Dashboard (Updates based on Scope) */}
        <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 ml-2 flex items-center">
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> 
                {kpiScope === 'daily' ? `Metrics for ${selectedDate}` : kpiScope === 'wtd' ? 'Week-to-Date Metrics' : 'Month-to-Date Metrics'}
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                <Activity className="w-6 h-6 text-slate-400 mb-2" />
                <div className="text-3xl font-black tabular-nums text-slate-800">{kpiData.totalActions}</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Actions</div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden group">
                {kpiData.whatsapp >= targets.whatsapp && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>}
                <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/20 transition-all" style={{ width: `${Math.min(100, (kpiData.whatsapp / targets.whatsapp) * 100)}%`}}></div>
                <MessageSquare className="w-6 h-6 text-emerald-500 mb-2 relative z-10" />
                <div className="text-3xl font-black tabular-nums text-slate-800 relative z-10">
                {kpiData.whatsapp} <span className="text-xs text-slate-400">/ {targets.whatsapp}</span>
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">WhatsApp Sent</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden group">
                {kpiData.calls >= targets.calls && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>}
                <div className="absolute bottom-0 left-0 h-1 bg-blue-500/20 transition-all" style={{ width: `${Math.min(100, (kpiData.calls / targets.calls) * 100)}%`}}></div>
                <Phone className="w-6 h-6 text-blue-500 mb-2 relative z-10" />
                <div className="text-3xl font-black tabular-nums text-slate-800 relative z-10">
                {kpiData.calls} <span className="text-xs text-slate-400">/ {targets.calls}</span>
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">Calls Logged</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                <Video className="w-6 h-6 text-purple-500 mb-2" />
                <div className="text-3xl font-black tabular-nums text-slate-800">{kpiData.meetings}</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Demos Booked</div>
            </div>

            {/* NEW: Pipeline Advancements (Quality Metric) */}
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col justify-center items-center text-center relative overflow-hidden text-white">
                {kpiData.advancements >= targets.advancements && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"></div>}
                <TrendingUp className="w-6 h-6 text-amber-400 mb-2 relative z-10" />
                <div className="text-3xl font-black tabular-nums relative z-10">
                   {kpiData.advancements} <span className="text-xs text-slate-400">/ {targets.advancements}</span>
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">Pipeline Moves</div>
            </div>

            </div>
        </div>

        {/* The Chronological Ledger (Always locked to the selected Daily Date to prevent a massive unreadable list) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-indigo-500" /> Daily Ledger ({selectedDate})
            </h3>
            {ledgerLogs.length > 0 && (
                <span className="text-[10px] font-bold text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                  {ledgerLogs.length} Records Found
                </span>
            )}
          </div>
          
          <div className="p-6">
            {ledgerLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-sm font-black uppercase tracking-widest">No Activity Logged</h3>
                <p className="text-xs font-medium mt-2">There are no records for {selectedDate}.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                {ledgerLogs.map((log, index) => {
                  const logTime = new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  // Highlight stage changes specifically
                  const isStageChange = log.text.includes('Jumped to Pipeline Stage');
                  
                  return (
                    <div key={log.id || index} className="relative pl-8">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[21px] top-1 bg-white border-4 ${isStageChange ? 'border-amber-100 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'border-slate-100 shadow-sm'} w-10 h-10 rounded-full flex items-center justify-center z-10`}>
                        {isStageChange ? <TrendingUp className="w-5 h-5 text-amber-500" /> : getLogIcon(log.type)}
                      </div>

                      {/* Log Content Card */}
                      <div className={`bg-white border ${isStageChange ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100 hover:border-indigo-100'} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-start justify-between gap-4`}>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{logTime}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-slate-100 text-slate-600">
                              {log.type}
                            </span>
                            {isStageChange && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-amber-100 text-amber-700 flex items-center">
                                  <Star className="w-3 h-3 mr-1 fill-current"/> Progression
                                </span>
                            )}
                          </div>
                          
                          <p className={`text-sm font-medium whitespace-pre-wrap leading-relaxed mt-2 ${isStageChange ? 'text-amber-900' : 'text-slate-700'}`}>
                            {log.text}
                          </p>
                        </div>

                        {/* Associated Lead Link */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 sm:w-[220px] shrink-0 text-left sm:text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target School</p>
                          <p className="text-xs font-bold text-slate-800 truncate mb-3" title={log.school_name}>{log.school_name}</p>
                          <button 
                            onClick={() => openDealRoom(log.lead_id)}
                            className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center sm:justify-end w-full transition-colors"
                          >
                            Jump to Target <ArrowRight className="w-3 h-3 ml-1" />
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}