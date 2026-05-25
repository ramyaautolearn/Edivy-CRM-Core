import React, { useState, useEffect } from 'react';
import {
  Activity, Users, Zap, TrendingUp, Clock, AlertTriangle, Target, GitMerge,
  CheckCircle, AlertCircle, BarChart3, MessageSquare, Filter, ArrowRight,
  MapPin, RefreshCw, Tag, ShieldAlert
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function ControlTower() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const appId = 'edivy-crm-vault';

  useEffect(() => {
    if (!db) return;

    // Fetch Global Users
    let usersMap = {};
    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      snap.docs.forEach(d => {
        const u = d.data();
        usersMap[d.id] = u.badge_id ? `[${u.badge_id}] ${u.name}` : u.name;
      });
    });

    // Fetch All Leads & Calculate Live Telemetry
    const unsubLeads = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), (snap) => {
      const leads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Core Trackers
      let e1Count = 0;
      let e2Count = 0;
      let newToday = 0;
      let newWeek = 0;
      let assignedCount = 0;
      let closedWonCount = 0;
      
      // Alerts
      let untouchedHighScores = 0;
      let hotLeads = 0;
      let demosBooked = 0;
      
      // Speed Tracking
      let totalDaysActive = 0;
      let leadsWithActivity = 0;

      // Grouping Objects
      const pipelineStages = {};
      const agentStats = {};
      const tierStats = {};

      leads.forEach(lead => {
        // 1. Time Flow & Speed
        let leadDateObj = new Date();
        if (lead.createdAt?.seconds) leadDateObj = new Date(lead.createdAt.seconds * 1000);
        else if (typeof lead.createdAt === 'string') leadDateObj = new Date(lead.createdAt);
        
        if (leadDateObj.toISOString().split('T')[0] === todayStr) newToday++;
        if (leadDateObj >= weekAgo) newWeek++;

        let lastActObj = leadDateObj;
        if (lead.last_activity_at?.seconds) lastActObj = new Date(lead.last_activity_at.seconds * 1000);
        else if (typeof lead.last_activity_at === 'string') lastActObj = new Date(lead.last_activity_at);

        if (lastActObj > leadDateObj) {
            const diffTime = Math.abs(lastActObj - leadDateObj);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalDaysActive += diffDays;
            leadsWithActivity++;
        }

        // 2. Engine Split & Status
        if (lead.engine === 1) e1Count++;
        if (lead.engine === 2) e2Count++;
        if (lead.assigned_to) assignedCount++;
        
        const stageLower = (lead.stage_name || '').toLowerCase();
        if (stageLower.includes('close') || stageLower.includes('won')) closedWonCount++;

        // 3. Alerts & Flags
        if (lead.temperature === 'Hot') hotLeads++;
        if (lead.is_demo_booked) demosBooked++;
        
        if (lead.score >= 70 && (!lead.assigned_to || lead.stage_name === 'New Lead' || !lead.stage_name)) {
          untouchedHighScores++;
        }

        // 4. Pipeline Flow (E1 Only)
        if (lead.engine === 1) {
          const stage = lead.stage_name || 'New Lead';
          pipelineStages[stage] = (pipelineStages[stage] || 0) + 1;
        }

        // 5. Agent Performance
        if (lead.assigned_to) {
          const aId = lead.assigned_to;
          if (!agentStats[aId]) agentStats[aId] = { handled: 0, hot: 0, demos: 0 };
          agentStats[aId].handled++;
          if (lead.temperature === 'Hot') agentStats[aId].hot++;
          if (lead.is_demo_booked) agentStats[aId].demos++;
        }

        // 6. Tier / Campaign Tracking (using pc1)
        const tier = lead.pc1 || 'Uncategorized';
        if (!tierStats[tier]) tierStats[tier] = { leads: 0, hot: 0 };
        tierStats[tier].leads++;
        if (lead.temperature === 'Hot' || lead.is_demo_booked) tierStats[tier].hot++;
      });

      // Format Agent Data for UI
      const formattedAgents = Object.entries(agentStats).map(([id, stats]) => ({
        name: usersMap[id] || id.substring(0, 8),
        handled: stats.handled,
        hot: stats.hot,
        demos: stats.demos,
        conv: stats.handled > 0 ? Math.round((stats.demos / stats.handled) * 100) + '%' : '0%'
      })).sort((a, b) => b.handled - a.handled);

      // Format Tier Data for UI
      const formattedTiers = Object.entries(tierStats).map(([tag, stats]) => ({
        tag,
        leads: stats.leads,
        conv: stats.leads > 0 ? Math.round((stats.hot / stats.leads) * 100) + '%' : '0%'
      })).sort((a, b) => b.leads - a.leads);

      const sortedPipeline = Object.entries(pipelineStages).sort((a, b) => b[1] - a[1]);
      const avgDealCycle = leadsWithActivity > 0 ? Math.round(totalDaysActive / leadsWithActivity) + ' Days' : 'Calculating...';

      setData({
        leads: { total: leads.length, e1: e1Count, e2: e2Count },
        alerts: { untouchedHighScores, hotLeads, demosBooked },
        pipeline: sortedPipeline,
        perf: {
          leadFlow: { today: newToday, week: newWeek, assigned: assignedCount, e1: e1Count, e2: e2Count },
          conversion: { 
             overall: leads.length > 0 ? Math.round((demosBooked / leads.length) * 100) + '%' : '0%',
             closedWon: leads.length > 0 ? Math.round((closedWonCount / leads.length) * 100) + '%' : '0%'
          },
          speed: {
             dealCycle: avgDealCycle
          },
          agents: formattedAgents,
          campaigns: formattedTiers
        }
      });
      setLoading(false);
    });

    return () => { unsubLeads(); unsubUsers(); };
  }, []);

  if (loading || !data) {
    return (
      <div className="p-20 flex flex-col items-center justify-center text-indigo-600 animate-in fade-in">
        <Activity className="w-10 h-10 animate-pulse mb-4" /> 
        <h2 className="text-xl font-black uppercase tracking-widest">Booting Command Telemetry...</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Syncing Live Database</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center tracking-tight uppercase">
            <BarChart3 className="w-7 h-7 mr-3 text-indigo-600" /> Command Dashboard
          </h2>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-1 font-bold">
            Live Operational Visibility & Bottleneck Detection
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-black flex items-center shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
          Telemetry Active
        </div>
      </div>

      {/* 🔥 A. IMMEDIATE ATTENTION PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start shadow-sm cursor-pointer hover:bg-red-100 transition-colors">
          <ShieldAlert className="w-8 h-8 text-red-600 mr-4 shrink-0" />
          <div>
            <h3 className="font-black text-red-900 text-sm uppercase tracking-wider">High-Value / Untouched</h3>
            <div className="flex items-end mt-1">
              <span className="text-3xl font-black text-red-700 leading-none">{data.alerts.untouchedHighScores}</span>
              <span className="text-[10px] text-red-600 font-black uppercase tracking-widest ml-2 mb-1">Require Action</span>
            </div>
            <p className="text-[10px] text-red-800 mt-2 font-bold leading-relaxed">
              Leads scoring &gt;70 sitting unassigned or stuck in Entry Stage.
            </p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start shadow-sm cursor-pointer hover:bg-orange-100 transition-colors">
          <Zap className="w-8 h-8 text-orange-600 mr-4 shrink-0" />
          <div>
            <h3 className="font-black text-orange-900 text-sm uppercase tracking-wider">Hot Intent Signals</h3>
            <div className="flex items-end mt-1">
              <span className="text-3xl font-black text-orange-700 leading-none">{data.alerts.hotLeads}</span>
              <span className="text-[10px] text-orange-600 font-black uppercase tracking-widest ml-2 mb-1">Ready to Close</span>
            </div>
            <p className="text-[10px] text-orange-800 mt-2 font-bold leading-relaxed">
              Active leads flagged manually by agents as high-probability.
            </p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start shadow-sm cursor-pointer hover:bg-emerald-100 transition-colors">
          <Calendar className="w-8 h-8 text-emerald-600 mr-4 shrink-0" />
          <div>
            <h3 className="font-black text-emerald-900 text-sm uppercase tracking-wider">Demos Booked</h3>
            <div className="flex items-end mt-1">
              <span className="text-3xl font-black text-emerald-700 leading-none">{data.alerts.demosBooked}</span>
              <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest ml-2 mb-1">Meetings Set</span>
            </div>
            <p className="text-[10px] text-emerald-800 mt-2 font-bold leading-relaxed">
              Total demos successfully booked and waiting for execution.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ⚡ ENGINE 1: LIVE PIPELINE BOTTLENECKS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center border-b border-slate-100 pb-3">
            <GitMerge className="w-5 h-5 mr-2 text-indigo-500" /> Live Pipeline Flow (Top Stages)
          </h3>

          <div className="space-y-5">
            {data.pipeline.length === 0 ? (
                <div className="text-center p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">No active leads in pipeline</div>
            ) : (
                data.pipeline.slice(0, 4).map(([stageName, count], index) => {
                  const maxCount = data.pipeline[0][1];
                  const widthPercent = Math.max((count / maxCount) * 100, 5) + '%';
                  return (
                    <div key={stageName} className="relative">
                      <div className="flex justify-between text-xs font-black uppercase tracking-wider mb-1.5">
                        <span className="text-slate-700">{stageName}</span>
                        <span className="text-indigo-600">{count} Leads</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className={`h-3 rounded-full ${index === 0 ? 'bg-indigo-300' : index === 1 ? 'bg-indigo-400' : index === 2 ? 'bg-indigo-500' : 'bg-indigo-600'}`} style={{ width: widthPercent }}></div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* 🧠 SMART INSIGHTS LAYER */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center border-b border-slate-100 pb-3">
            <MessageSquare className="w-5 h-5 mr-2 text-indigo-500" /> System Intelligence
          </h3>

          <div className="flex-1 space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <h4 className="font-black text-indigo-900 text-[10px] uppercase tracking-widest flex items-center">
                <Target className="w-4 h-4 mr-2" /> Top Heavy Funnel
              </h4>
              <p className="text-xs text-indigo-800 mt-2 font-bold leading-relaxed">
                {data.pipeline[0] ? `Your largest concentration of leads is sitting in "${data.pipeline[0][0]}". Ensure agents have clear scripts to push them to the next phase.` : 'Pipeline is currently empty.'}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <h4 className="font-black text-emerald-900 text-[10px] uppercase tracking-widest flex items-center">
                <MapPin className="w-4 h-4 mr-2" /> Tier Targeting Signal
              </h4>
              <p className="text-xs text-emerald-800 mt-2 font-bold leading-relaxed">
                {data.perf.campaigns[0] ? `The "${data.perf.campaigns[0].tag}" segment is currently your largest lead source. Focus marketing spend here.` : 'Waiting for demographic data.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🚀 CORE PERFORMANCE METRICS (THE DECISION MATRIX) */}
      {/* ========================================================= */}

      <div className="mt-10 mb-4 flex items-center">
        <Filter className="w-5 h-5 mr-2 text-indigo-600" />
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Operational Data Matrix</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
            Identify exact points of revenue leakage
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* A. Lead Flow Metrics */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
            A. Lead Flow (Top Funnel)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">Added (Today / Week)</span>
              <span className="font-black text-slate-900">{data.perf.leadFlow.today} / {data.perf.leadFlow.week}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">Leads Claimed/Assigned</span>
              <span className="font-black text-slate-900">{data.perf.leadFlow.assigned}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
              <span className="text-indigo-600 font-black text-xs uppercase tracking-wider">Engine 1 (Sales)</span>
              <span className="font-black text-indigo-600">{data.perf.leadFlow.e1}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-600 font-black text-xs uppercase tracking-wider">Engine 2 (Nurture)</span>
              <span className="font-black text-blue-600">{data.perf.leadFlow.e2}</span>
            </div>
          </div>
        </div>

        {/* B. Conversion Metrics (RESTORED) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
            B. Target Acquisition & Conversion
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">Demo / Meeting Rate</span>
              <span className="font-black text-indigo-600">{data.perf.conversion.overall}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">Hot Intent Ratio (E1)</span>
              <span className="font-black text-orange-600">{data.perf.conversion.hotRatio}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
              <span className="text-emerald-600 font-black text-xs uppercase tracking-wider">Closed Won (Total)</span>
              <span className="font-black text-emerald-600">{data.perf.conversion.closedWon}</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4 bg-slate-50 p-2 rounded border border-slate-100">
            Health Check: Ensure your meeting rate stays above 10% of total flow.
          </p>
        </div>

        {/* E. Execution Speed (RESTORED) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
            E. Execution Speed
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200">
              <span className="text-orange-600 font-black text-xs uppercase tracking-wider">Avg Deal Cycle Time</span>
              <span className="font-black text-orange-600">{data.perf.speed.dealCycle}</span>
            </div>
            <div className="flex justify-between items-center opacity-50">
              <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">Avg Time per Stage</span>
              <span className="font-black text-slate-900 text-[10px]">[Requires E1 Update]</span>
            </div>
            <div className="flex justify-between items-center opacity-50">
              <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">Time to 1st Contact</span>
              <span className="font-black text-slate-900 text-[10px]">[Requires E1 Update]</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4">
            Purpose: Are leads dying of old age in the pipeline?
          </p>
        </div>

        {/* D. Nurture Effectiveness (RESTORED) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
            D. Nurture Effectiveness (E2)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">Total in Nurture (E2)</span>
              <span className="font-black text-slate-900">{data.perf.leadFlow.e2}</span>
            </div>
            <div className="flex justify-between items-center opacity-50">
              <span className="text-slate-600 font-bold text-xs uppercase tracking-wider">Engagement Rate</span>
              <span className="font-black text-slate-900 text-[10px]">[Pending E2 Build]</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 opacity-50">
              <span className="text-indigo-600 font-black text-xs uppercase tracking-wider flex items-center">
                Reactivation <ArrowRight className="w-3 h-3 mx-1" /> E1
              </span>
              <span className="font-black text-indigo-600 text-[10px]">[Pending E2 Build]</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4 bg-slate-50 p-2 rounded border border-slate-100">
            Engine 2 webhooks required for deep open/click analytics.
          </p>
        </div>

        {/* C. Agent Effectiveness */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:row-span-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 flex items-center justify-between">
            C. Agent Leaderboard
            <Users className="w-4 h-4 text-slate-300" />
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {data.perf.agents.length === 0 ? (
                <div className="text-center p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">No assigned leads</div>
            ) : (
                data.perf.agents.map((agent, i) => (
                  <div key={i} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="font-black text-xs text-slate-800 mb-2 flex items-center uppercase tracking-wider">
                      <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center mr-2 text-[10px]">
                        {i + 1}
                      </div>
                      {agent.name}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-200">
                      <div>
                        <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Leads</span>
                        <strong className="text-sm font-black text-slate-700">{agent.handled}</strong>
                      </div>
                      <div>
                        <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Hot</span>
                        <strong className="text-sm font-black text-orange-500">{agent.hot}</strong>
                      </div>
                      <div>
                        <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Demos</span>
                        <strong className="text-sm font-black text-emerald-600">{agent.demos}</strong>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* F. Tier Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:col-span-2 lg:col-span-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
            F. Demographic Performance (Lead Tiers)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data.perf.campaigns.length === 0 ? (
               <div className="text-center p-4 text-xs font-bold text-slate-400 uppercase tracking-widest col-span-3">No demographic data captured</div>
            ) : (
                data.perf.campaigns.map((camp, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                      <div className="font-black text-[10px] uppercase tracking-widest text-slate-800 flex items-center mb-1">
                        <Tag className="w-3 h-3 mr-1.5 text-indigo-400" /> {camp.tag}
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        {camp.leads} Total Leads
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="font-black text-emerald-600 text-lg">{camp.conv}</div>
                       <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Hot/Demo Rate</div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}