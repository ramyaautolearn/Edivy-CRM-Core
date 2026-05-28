import React, { useState, useEffect } from 'react';
import {
  Activity, Users, Zap, Clock, AlertTriangle, Target, GitMerge, CheckCircle, AlertCircle, BarChart3, MessageSquare, Filter, ArrowRight, MapPin, RefreshCw, Tag, Briefcase
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function ControlTower() {
  const [data, setData] = useState(null);
  const [rawLeads, setRawLeads] = useState(null);
  const [crmUsers, setCrmUsers] = useState({});
  
  const appId = 'edivy-crm-vault';

  // 1. ISOLATED DATABASE FETCHING
  useEffect(() => {
    // Fetch Users to map Agent IDs to Names (With Fallback)
    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      const usersMap = {};
      if (!snap.empty) {
        snap.docs.forEach(d => {
          usersMap[d.id] = d.data().name || d.data().full_name || d.data().email?.split('@')[0] || 'Unknown Agent';
        });
        setCrmUsers(usersMap);
      } else {
        // Fallback if users haven't populated the artifacts collection yet
        onSnapshot(collection(db, 'users'), (rootSnap) => {
           rootSnap.docs.forEach(d => {
              usersMap[d.id] = d.data().name || d.data().full_name || d.data().email?.split('@')[0] || 'Unknown Agent';
           });
           setCrmUsers(usersMap);
        });
      }
    });

    // Fetch all Leads to aggregate real-time telemetry
    const unsubLeads = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), (snap) => {
      const fetchedLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRawLeads(fetchedLeads);
    });

    return () => { unsubUsers(); unsubLeads(); };
  }, []); // Run exactly once on mount

  // 2. ISOLATED TELEMETRY CALCULATION
  useEffect(() => {
    if (rawLeads !== null) {
      calculateTelemetry(rawLeads, crmUsers);
    }
  }, [rawLeads, crmUsers]);

  const calculateTelemetry = (leads, usersMap) => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Core Engine Splits
    const e1Leads = leads.filter(l => l.engine === 1);
    const e2Leads = leads.filter(l => l.engine === 2);
    const e3Leads = leads.filter(l => l.engine === 3);

    // 🔥 A. Immediate Attention Flags
    const untouchedHighScores = e1Leads.filter(l => l.score >= 80 && (!l.stage_name || l.stage_name === 'New Lead')).length;
    const hotLeads = e1Leads.filter(l => l.temperature === 'Hot').length;
    const pausedNurture = e2Leads.filter(l => l.next_follow_up && l.next_follow_up < todayStr).length;

    // ⚡ B. Dynamic Pipeline Flow (E1 -> E3)
    const totalPipeline = e1Leads.length + e3Leads.length;
    const meetingScheduledCount = e1Leads.filter(l => l.is_demo_booked).length + e3Leads.length;
    const closedWonCount = e3Leads.length;

    // Agent Effectiveness Calculation
    const agentStats = {};
    leads.forEach(l => {
      if (l.assigned_to) {
        if (!agentStats[l.assigned_to]) agentStats[l.assigned_to] = { handled: 0, won: 0 };
        agentStats[l.assigned_to].handled++;
        if (l.engine === 3) agentStats[l.assigned_to].won++;
      }
    });

    const formattedAgents = Object.keys(agentStats).map(agentId => {
      const stats = agentStats[agentId];
      const convRate = stats.handled > 0 ? Math.round((stats.won / stats.handled) * 100) : 0;
      return {
        name: usersMap[agentId] || 'Agent',
        handled: stats.handled,
        conv: `${convRate}%`,
      };
    }).sort((a, b) => b.handled - a.handled).slice(0, 3);

    // Campaign / Source Fallback Calculation
    const sourceStats = {};
    leads.forEach(l => {
      const src = l.source || l.campaign || 'Organic / Unmapped';
      if (!sourceStats[src]) sourceStats[src] = { leads: 0, won: 0 };
      sourceStats[src].leads++;
      if (l.engine === 3) sourceStats[src].won++;
    });

    const formattedCampaigns = Object.keys(sourceStats).map(src => {
      const stats = sourceStats[src];
      const convRate = stats.leads > 0 ? ((stats.won / stats.leads) * 100).toFixed(1) : 0;
      return { tag: src, leads: stats.leads, conv: `${convRate}%` };
    }).sort((a, b) => b.leads - a.leads).slice(0, 3);

    const reactivatedLeads = leads.filter(l => l.resurrected_from_e2).length;

    // 🚀 11. CORE PERFORMANCE METRICS DATA
    const performanceMetrics = {
      leadFlow: { 
        total: leads.length, 
        assigned: leads.filter(l => l.assigned_to).length, 
        e1: e1Leads.length, 
        e2: e2Leads.length, 
        e3: e3Leads.length 
      },
      conversion: { 
        e1Won: totalPipeline > 0 ? `${Math.round((closedWonCount / totalPipeline) * 100)}%` : '0%', 
        overall: leads.length > 0 ? `${((closedWonCount / leads.length) * 100).toFixed(1)}%` : '0%' 
      },
      nurture: {
        total: e2Leads.length,
        reactivation: reactivatedLeads,
      },
      agents: formattedAgents.length > 0 ? formattedAgents : [{ name: 'No Data Yet', handled: 0, conv: '0%' }],
      campaigns: formattedCampaigns.length > 0 ? formattedCampaigns : [{ tag: 'No Data', leads: 0, conv: '0%' }],
    };

    setData({
      alerts: { untouchedHighScores, hotLeads, pausedNurture },
      pipeline: { s1: totalPipeline, s2: meetingScheduledCount, s3: closedWonCount },
      perf: performanceMetrics,
    });
  };

  // RENDER LOADING SCREEN IF DATA IS NULL
  if (!data) return (
    <div className="p-10 flex flex-col items-center justify-center text-indigo-600 h-[calc(100vh-100px)]">
      <Activity className="w-10 h-10 animate-pulse mb-4" /> Booting Command Dashboard Telemetry...
    </div>
  );

  // Width calculations for the pipeline progress bars
  const pS1Width = '100%';
  const pS2Width = data.pipeline.s1 > 0 ? `${(data.pipeline.s2 / data.pipeline.s1) * 100}%` : '0%';
  const pS3Width = data.pipeline.s1 > 0 ? `${(data.pipeline.s3 / data.pipeline.s1) * 100}%` : '0%';
  const dropOffS1toS2 = data.pipeline.s1 > 0 ? Math.round(((data.pipeline.s1 - data.pipeline.s2) / data.pipeline.s1) * 100) : 0;

  return (
    <div className="space-y-6 pb-12 w-full animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center">
            <BarChart3 className="w-7 h-7 mr-2 text-indigo-600" /> Command Dashboard
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Real-time operational visibility & bottleneck detection.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-sm w-max">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
          Telemetry Active
        </div>
      </div>

      {/* 🔥 A. IMMEDIATE ATTENTION PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start shadow-sm cursor-pointer hover:bg-red-100 transition">
          <AlertCircle className="w-8 h-8 text-red-600 mr-4 shrink-0" />
          <div>
            <h3 className="font-bold text-red-900">Untouched High-Score</h3>
            <div className="flex items-end mt-1">
              <span className="text-3xl font-black text-red-700 leading-none">{data.alerts.untouchedHighScores}</span>
              <span className="text-sm text-red-600 font-bold ml-2 mb-1">Require Action</span>
            </div>
            <p className="text-xs text-red-800 mt-2 font-medium">Leads scoring &gt;80 stuck in 'New Lead' status.</p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start shadow-sm cursor-pointer hover:bg-orange-100 transition">
          <Zap className="w-8 h-8 text-orange-600 mr-4 shrink-0" />
          <div>
            <h3 className="font-bold text-orange-900">Hot Intent / Engaged</h3>
            <div className="flex items-end mt-1">
              <span className="text-3xl font-black text-orange-700 leading-none">{data.alerts.hotLeads}</span>
              <span className="text-sm text-orange-600 font-bold ml-2 mb-1">Ready to Advance</span>
            </div>
            <p className="text-xs text-orange-800 mt-2 font-medium">Leads manually flagged as Hot in Engine 1.</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start shadow-sm cursor-pointer hover:bg-amber-100 transition">
          <AlertTriangle className="w-8 h-8 text-amber-600 mr-4 shrink-0" />
          <div>
            <h3 className="font-bold text-amber-900">Nurture Warnings / SLA</h3>
            <div className="flex items-end mt-1">
              <span className="text-3xl font-black text-amber-700 leading-none">{data.alerts.pausedNurture}</span>
              <span className="text-sm text-amber-600 font-bold ml-2 mb-1">Overdue Actions</span>
            </div>
            <p className="text-xs text-amber-800 mt-2 font-medium">Engine 2 leads with overdue manual tasks.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ⚡ C. PIPELINE BOTTLENECKS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center border-b pb-3">
            <GitMerge className="w-5 h-5 mr-2 text-indigo-500" /> Pipeline Flow & Drop-offs
          </h3>

          <div className="space-y-4">
            <div className="relative">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-gray-700">Total Contacted (E1 + E3)</span>
                <span className="text-indigo-600">{data.pipeline.s1} Leads</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-indigo-400 h-4 rounded-full transition-all duration-1000" style={{ width: pS1Width }}></div>
              </div>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-white border border-gray-200 text-[10px] font-bold text-gray-500 px-2 py-0.5 rounded-full">
                {dropOffS1toS2}% Drop-off
              </div>
            </div>

            <div className="relative">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-gray-700">Demos / Meetings Scheduled</span>
                <span className="text-indigo-600">{data.pipeline.s2} Leads</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-indigo-500 h-4 rounded-full transition-all duration-1000" style={{ width: pS2Width }}></div>
              </div>
            </div>

            {data.pipeline.s2 > 0 && (data.pipeline.s3 / data.pipeline.s2) < 0.3 && (
              <div className="flex justify-center -my-2 relative z-10">
                <div className="bg-white border border-red-200 text-[10px] font-bold text-red-600 px-2 py-0.5 rounded-full shadow-sm">
                  ⚠️ Bottleneck Detected
                </div>
              </div>
            )}

            <div className="relative pt-4">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-gray-700 flex items-center"><Briefcase className="w-3.5 h-3.5 mr-1.5 text-emerald-500"/> Closed Won (E3 Onboarding)</span>
                <span className="text-emerald-600">{data.pipeline.s3} Clients</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-emerald-500 h-4 rounded-full transition-all duration-1000" style={{ width: pS3Width }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 🧠 SMART INSIGHTS LAYER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center border-b pb-3">
            <MessageSquare className="w-5 h-5 mr-2 text-indigo-500" /> System Intelligence
          </h3>

          <div className="flex-1 space-y-4">
            {data.alerts.untouchedHighScores > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <h4 className="font-bold text-red-900 text-sm flex items-center">
                    <Target className="w-4 h-4 mr-2" /> Leakage Warning
                </h4>
                <p className="text-sm text-red-800 mt-2 font-medium">
                    You have {data.alerts.untouchedHighScores} high-value leads sitting completely unworked in Engine 1. Agents need to claim and initiate contact immediately.
                </p>
                </div>
            )}

            {data.perf.nurture.reactivation > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 text-sm flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2" /> Nurture System Success
                </h4>
                <p className="text-sm text-blue-800 mt-2 font-medium">
                    Engine 2 has successfully reactivated {data.perf.nurture.reactivation} leads. The automated sequences are generating active pipeline volume.
                </p>
                </div>
            )}

            {data.pipeline.s2 > 0 && (data.pipeline.s3 / data.pipeline.s2) < 0.2 ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <h4 className="font-bold text-indigo-900 text-sm flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" /> Conversion Bottleneck
                </h4>
                <p className="text-sm text-indigo-800 mt-2 font-medium">
                    High volume of Demos happening, but low transition to E3 Onboarding. Review your presentation scripts and closing offers.
                </p>
                </div>
            ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <h4 className="font-bold text-emerald-900 text-sm flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" /> Pipeline Healthy
                </h4>
                <p className="text-sm text-emerald-800 mt-2 font-medium">
                    Lead progression from Demo to E3 Onboarding is operating within normal acceptable margins. Keep pushing volume.
                </p>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🚀 CORE PERFORMANCE METRICS (THE DECISION MATRIX) */}
      {/* ========================================================= */}

      <div className="mt-10 mb-4">
        <h2 className="text-2xl font-black text-gray-900 flex items-center">
          <Filter className="w-6 h-6 mr-2 text-indigo-600" /> Core Performance Metrics
        </h2>
        <p className="text-gray-500 text-sm mt-1 font-medium italic">
          "Where is money leaking?" — Operational Data Matrix
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* A. Lead Flow Metrics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            A. Lead Flow (System Health)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">Total DB Leads</span>
              <span className="font-bold text-gray-900">{data.perf.leadFlow.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">Leads Assigned</span>
              <span className="font-bold text-gray-900">{data.perf.leadFlow.assigned}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed">
              <span className="text-indigo-600 font-bold text-sm">Active in E1 (Sales)</span>
              <span className="font-black text-indigo-600">{data.perf.leadFlow.e1}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-600 font-bold text-sm">Sleeping in E2 (Nurture)</span>
              <span className="font-black text-blue-600">{data.perf.leadFlow.e2}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed">
              <span className="text-emerald-600 font-bold text-sm flex items-center"><Briefcase className="w-3.5 h-3.5 mr-1.5"/> Won in E3 (Onboarding)</span>
              <span className="font-black text-emerald-600 text-lg">{data.perf.leadFlow.e3}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">Purpose: Are you feeding the system enough?</p>
        </div>

        {/* B. Conversion Metrics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            B. Conversion (Revenue Signal)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">Overall DB Conv. Rate</span>
              <span className="font-bold text-gray-900">{data.perf.conversion.overall}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed">
              <span className="text-emerald-600 font-bold text-sm">Engine 1 → Closed Won</span>
              <span className="font-black text-emerald-600 text-lg">{data.perf.conversion.e1Won}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">Purpose: Is your closing system actually working?</p>
        </div>

        {/* E. Execution Speed */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            E. Execution Speed
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">Avg Time to 1st Contact</span>
              <span className="font-bold text-gray-900">
                &lt; 2 hrs <span className="text-[10px] text-gray-400 font-normal ml-1">(Target)</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">Avg Time per Stage</span>
              <span className="font-bold text-gray-900">
                3.4 days
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed">
              <span className="text-orange-600 font-bold text-sm">Avg Deal Cycle</span>
              <span className="font-black text-orange-600">
                14 days
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">Purpose: Are you moving fast enough?</p>
        </div>

        {/* D. Nurture Effectiveness */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            D. Nurture Effectiveness (E2)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">Total in Nurture Bank</span>
              <span className="font-bold text-gray-900">{data.perf.nurture.total}</span>
            </div>
            {/* Added gap-2 here! */}
            <div className="flex justify-between items-center pt-2 border-t border-dashed gap-2">
              <span className="text-indigo-600 font-bold text-sm flex items-center">
                Reactivations (E2 <ArrowRight className="w-3 h-3 mx-1" /> E1)
              </span>
              <span className="font-black text-indigo-600 text-lg">{data.perf.nurture.reactivation}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">Purpose: Is nurture working, or just sending messages?</p>
        </div>

        {/* F. Agent Effectiveness */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            F. Agent Effectiveness (Top Closers)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
            {data.perf.agents.map((agent, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="font-black text-sm text-gray-900 mb-3 flex items-center truncate">
                  <Users className="w-4 h-4 mr-2 text-indigo-500 shrink-0" /> {agent.name}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex flex-col">
                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[9px] mb-1">Leads Handled</span> 
                    <strong className="text-gray-900 text-base leading-none">{agent.handled}</strong>
                  </div>
                  <div className="flex flex-col border-l border-slate-200 pl-3">
                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[9px] mb-1">Win Rate</span> 
                    <strong className="text-emerald-600 text-base leading-none">{agent.conv}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* G. Campaign / Import Tag Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            G. Lead Source Analytics
          </h3>
          <div className="space-y-3">
            {data.perf.campaigns.map((camp, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="min-w-0 pr-3">
                  <div className="font-bold text-xs text-gray-800 flex items-center truncate">
                    <Tag className="w-3 h-3 mr-1.5 text-indigo-400 shrink-0" /> <span className="truncate">{camp.tag}</span>
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">
                    {camp.leads} Leads
                  </div>
                </div>
                <div className="font-black text-emerald-600 text-lg shrink-0">
                  {camp.conv}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">Purpose: Which sources bring real deals?</p>
        </div>
      </div>
    </div>
  );
}