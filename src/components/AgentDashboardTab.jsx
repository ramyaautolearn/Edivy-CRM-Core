import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Zap, Calendar, Target, Flame, Clock, ArrowRight, ShieldCheck, CheckCircle 
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function AgentDashboardTab({ user, openDealRoom }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const appId = 'edivy-crm-vault';
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!db || !user?.id) return;
    const unsub = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'leads'),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const myLeads = all.filter(l => l.assigned_to === user.id || (!l.assigned_to && user.role === 'admin'));
        setLeads(myLeads);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const activeE1Leads = leads.filter(l => l.engine === 1);
  const restingE2Leads = leads.filter(l => l.engine === 2);
  const hotLeads = leads.filter(l => l.temperature === 'Hot');
  const demosBooked = leads.filter(l => (l.stage_name || '').toLowerCase().includes('demo'));
  
  // 🔴 3. CRASH FIX: Made date checking mathematically bulletproof
  const urgentLeads = leads.filter(l => 
    l.temperature === 'Hot' || 
    (l.next_follow_up && l.next_follow_up.length >= 8 && l.next_follow_up <= today)
  ).sort((a, b) => {
    if (a.next_follow_up && a.next_follow_up < today) return -1;
    if (b.next_follow_up && b.next_follow_up < today) return 1;
    return (b.score || 0) - (a.score || 0);
  }).slice(0, 5); 

  if (loading) {
    return <div className="flex h-full items-center justify-center bg-slate-50"><div className="animate-pulse flex items-center text-indigo-500 font-black tracking-widest"><Zap className="w-5 h-5 mr-2 animate-bounce" /> Loading OS...</div></div>;
  }

  return (
    <div className="h-full overflow-y-auto p-8 bg-slate-50/50">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Active Pipeline (E1)" value={activeE1Leads.length} icon={<Zap className="w-5 h-5 text-indigo-500" />} bg="bg-indigo-50" border="border-indigo-100" />
          <MetricCard title="Nurture Bank (E2)" value={restingE2Leads.length} icon={<Users className="w-5 h-5 text-blue-500" />} bg="bg-blue-50" border="border-blue-100" />
          <MetricCard title="Hot Targets" value={hotLeads.length} icon={<Flame className="w-5 h-5 text-orange-500" />} bg="bg-orange-50" border="border-orange-100" />
          <MetricCard title="Demos Secured" value={demosBooked.length} icon={<Calendar className="w-5 h-5 text-emerald-500" />} bg="bg-emerald-50" border="border-emerald-100" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center">
                <Target className="w-4 h-4 mr-2 text-red-500" /> Priority Action Targets
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">Needs immediate execution</span>
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