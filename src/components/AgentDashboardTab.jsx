import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Zap, Calendar, Target, Flame, Clock, ArrowRight, ShieldCheck, CheckCircle, BarChart3, Activity, Timer
} from 'lucide-react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AgentDashboardTab({ user, openDealRoom }) {
  const [leads, setLeads] = useState([]);
  const [e1Pipeline, setE1Pipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const appId = 'edivy-crm-vault';
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!db || !user?.id) return;

    // Fetch Active E1 Pipeline (to map the funnel stages dynamically)
    const pipelineRef = doc(db, 'artifacts', appId, 'public', 'data', 'pipelines', 'active'); 
    const unsubPipelines = onSnapshot(pipelineRef, (docSnap) => {
        if (docSnap.exists()) {
            setE1Pipeline(docSnap.data());
        } else {
            const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'pipelines');
            onSnapshot(collectionRef, (snap) => {
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (docs.length > 0) setE1Pipeline(docs[0]); 
            });
        }
    });

    // Fetch Leads
    const unsubLeads = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'leads'),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const myLeads = all.filter(l => l.assigned_to === user.id || (!l.assigned_to && user.role === 'admin'));
        setLeads(myLeads);
        setLoading(false);
      }
    );
    
    return () => { unsubLeads(); unsubPipelines(); };
  }, [user]);

  // Base Filters
  const activeE1Leads = leads.filter(l => l.engine === 1);
  const restingE2Leads = leads.filter(l => l.engine === 2);
  const hotLeads = leads.filter(l => l.temperature === 'Hot');
  const demosBooked = leads.filter(l => l.is_demo_booked || (l.stage_name || '').toLowerCase().includes('demo'));
  
  // Urgent Queue Math
  const urgentLeads = leads.filter(l => 
    l.temperature === 'Hot' || 
    (l.next_follow_up && l.next_follow_up.length >= 8 && l.next_follow_up <= today)
  ).sort((a, b) => {
    if (a.next_follow_up && a.next_follow_up < today) return -1;
    if (b.next_follow_up && b.next_follow_up < today) return 1;
    return (b.score || 0) - (a.score || 0);
  }).slice(0, 5); 

  // --- NEW: STRATEGIC FUNNEL & CONVERSION MATH ---
  const pipelineStages = e1Pipeline?.stages ? e1Pipeline.stages.map(s => s.name) : [];
  
  // Stage Counts
  const funnelCounts = { 'New Lead': 0 };
  pipelineStages.forEach(s => funnelCounts[s] = 0);
  activeE1Leads.forEach(l => {
      const stage = l.stage_name || 'New Lead';
      if (funnelCounts[stage] !== undefined) funnelCounts[stage]++;
      else funnelCounts['New Lead']++; 
  });

  // Conversion Rates
  const totalE1 = activeE1Leads.length;
  const totalDemos = demosBooked.length;
  const closedLeads = leads.filter(l => (l.stage_name || '').toLowerCase().includes('clos') || (l.stage_name || '').toLowerCase().includes('won')).length;
  
  const leadToDemoRate = totalE1 > 0 ? Math.round((totalDemos / totalE1) * 100) : 0;
  const demoToCloseRate = totalDemos > 0 ? Math.round((closedLeads / totalDemos) * 100) : 0;

  // Velocity (Average Days to Demo)
  let totalDemoDays = 0;
  let demoCountWithTime = 0;
  leads.forEach(l => {
      if ((l.is_demo_booked || (l.stage_name || '').toLowerCase().includes('demo')) && l.logs && l.logs.length > 0) {
          const sortedLogs = [...l.logs].sort((a,b) => new Date(a.date) - new Date(b.date));
          const firstLog = new Date(sortedLogs[0].date);
          const demoLog = sortedLogs.find(log => log.text.includes('Demo Booked') || log.text.includes('Meeting Booked') || log.text.includes('Jumped to Pipeline Stage: Demo'));
          if (demoLog) {
              const diffTime = Math.abs(new Date(demoLog.date) - firstLog);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              totalDemoDays += diffDays;
              demoCountWithTime++;
          }
      }
  });
  const avgVelocity = demoCountWithTime > 0 ? Math.round(totalDemoDays / demoCountWithTime) : 0;


  if (loading) {
    return <div className="flex h-full items-center justify-center bg-slate-50"><div className="animate-pulse flex items-center text-indigo-500 font-black tracking-widest"><Zap className="w-5 h-5 mr-2 animate-bounce" /> Loading OS...</div></div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back, {user?.name || 'Agent'}.</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1 text-emerald-500" /> System Active & Monitoring Pipeline
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-3xl font-black text-indigo-600 tabular-nums">{leads.length}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Managed Targets</div>
          </div>
        </div>

        {/* Core Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Active Pipeline (E1)" value={activeE1Leads.length} icon={<Zap className="w-5 h-5 text-indigo-500" />} bg="bg-indigo-50" border="border-indigo-100" />
          <MetricCard title="Nurture Bank (E2)" value={restingE2Leads.length} icon={<Users className="w-5 h-5 text-blue-500" />} bg="bg-blue-50" border="border-blue-100" />
          <MetricCard title="Hot Targets" value={hotLeads.length} icon={<Flame className="w-5 h-5 text-orange-500" />} bg="bg-orange-50" border="border-orange-100" />
          <MetricCard title="Demos Secured" value={demosBooked.length} icon={<Calendar className="w-5 h-5 text-emerald-500" />} bg="bg-emerald-50" border="border-emerald-100" />
        </div>

        {/* NEW: STRATEGIC ROADMAP & CONVERSION FUNNEL */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-800 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-indigo-500" /> Conversion Roadmap (E1 Funnel)
              </h3>
              
              {/* Ratio Pills */}
              <div className="flex gap-3 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm whitespace-nowrap">
                      <Activity className="w-3.5 h-3.5 text-blue-500 mr-2" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-2">Lead to Demo:</span>
                      <span className="text-xs font-black text-slate-800">{leadToDemoRate}%</span>
                  </div>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm whitespace-nowrap">
                      <Target className="w-3.5 h-3.5 text-emerald-500 mr-2" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-2">Demo to Close:</span>
                      <span className="text-xs font-black text-slate-800">{demoToCloseRate}%</span>
                  </div>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm whitespace-nowrap">
                      <Timer className="w-3.5 h-3.5 text-amber-500 mr-2" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-2">Velocity:</span>
                      <span className="text-xs font-black text-slate-800">{avgVelocity} <span className="text-[8px]">Days</span></span>
                  </div>
              </div>
            </div>
            
            {/* Visual Funnel Map */}
            <div className="p-6 w-full overflow-x-auto hide-scrollbar bg-slate-900">
                <div className="flex items-stretch min-w-max gap-1">
                    {/* Unmapped / New Leads */}
                    <FunnelChevron stage="New Lead" count={funnelCounts['New Lead']} isFirst />
                    
                    {/* Dynamic Pipeline Stages */}
                    {pipelineStages.map((stageName, idx) => (
                        <FunnelChevron 
                            key={stageName} 
                            stage={stageName} 
                            count={funnelCounts[stageName] || 0} 
                            isDemo={stageName.toLowerCase().includes('demo')}
                            isClose={stageName.toLowerCase().includes('clos') || stageName.toLowerCase().includes('won')}
                        />
                    ))}
                </div>
            </div>
        </div>

        {/* Priority Targets & Health Monitor Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Action Queue */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center">
                <Target className="w-4 h-4 mr-2 text-red-500" /> Priority Action Targets
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">Needs immediate execution</span>
            </div>
            
            <div className="p-4 flex-1">
              {urgentLeads.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                  <CheckCircle className="w-12 h-12 mb-3 text-emerald-400 opacity-50" />
                  <p className="text-[10px] uppercase font-black tracking-widest">Queue is clear. Great job.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {urgentLeads.map(lead => (
                    <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all group">
                      <div className="mb-3 sm:mb-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-sm text-slate-900">{lead.school_name}</h4>
                          {lead.next_follow_up && lead.next_follow_up < today && <span className="bg-red-100 text-red-600 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">Overdue</span>}
                          {lead.next_follow_up === today && <span className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">Due Today</span>}
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <span>{lead.contact_name}</span> &bull; <span>Score: {lead.score}</span>
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => openDealRoom(lead.id)}
                        className="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-100 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center shadow-sm w-full sm:w-auto"
                      >
                        Execute Protocol <ArrowRight className="w-3 h-3 ml-2" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Overall Health Monitor */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden text-white flex flex-col relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-indigo-400" /> Pipeline Health
              </h3>
            </div>
            
            <div className="p-6 space-y-6 relative z-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Average Edivy Score</p>
                <div className="text-3xl font-black tabular-nums">
                  {leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / leads.length) : 0} <span className="text-sm text-slate-600">/ 100</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-800">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Engine Distribution</p>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center text-xs font-bold">
                     <span className="text-slate-300">Engine 1 (Active)</span>
                     <span className="text-white bg-indigo-500/20 px-2 py-0.5 rounded">{activeE1Leads.length}</span>
                   </div>
                   <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${leads.length ? (activeE1Leads.length / leads.length) * 100 : 0}%`}}></div></div>
                   
                   <div className="flex justify-between items-center text-xs font-bold mt-4">
                     <span className="text-slate-300">Engine 2 (Nurture)</span>
                     <span className="text-white bg-blue-500/20 px-2 py-0.5 rounded">{restingE2Leads.length}</span>
                   </div>
                   <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${leads.length ? (restingE2Leads.length / leads.length) * 100 : 0}%`}}></div></div>
                 </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function MetricCard({ title, value, icon, bg, border }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</h4>
        <div className="text-3xl font-black text-slate-900 tabular-nums">{value}</div>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${bg} ${border}`}>
        {icon}
      </div>
    </div>
  );
}

function FunnelChevron({ stage, count, isFirst, isDemo, isClose }) {
    // Dynamic styling based on stage type to draw the eye
    let colorClass = "bg-slate-800 border-slate-700 text-slate-300";
    let accentLine = "bg-slate-700";
    let icon = null;
    
    if (isFirst) {
        colorClass = "bg-slate-800 border-slate-700 text-slate-300";
        accentLine = "bg-slate-600";
    } else if (isClose) {
        colorClass = "bg-emerald-900/50 border-emerald-800 text-emerald-400";
        accentLine = "bg-emerald-500";
        icon = <CheckCircle className="w-3 h-3 ml-1.5 opacity-70" />;
    } else if (isDemo) {
        colorClass = "bg-indigo-900/50 border-indigo-800 text-indigo-400";
        accentLine = "bg-indigo-500";
        icon = <Calendar className="w-3 h-3 ml-1.5 opacity-70" />;
    }

    return (
        <div className={`relative px-6 py-4 flex flex-col justify-center border-y border-r first:border-l first:rounded-l-2xl last:rounded-r-2xl min-w-[140px] flex-1 ${colorClass}`}>
            <div className={`absolute top-0 left-0 w-full h-0.5 ${accentLine}`}></div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest truncate max-w-[100px] leading-tight" title={stage}>{stage}</span>
                {icon}
            </div>
            <div className="text-2xl font-black tabular-nums">{count}</div>
        </div>
    );
}