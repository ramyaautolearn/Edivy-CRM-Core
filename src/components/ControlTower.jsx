import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle,
  Target,
  GitMerge,
  CheckCircle,
  AlertCircle,
  BarChart3,
  MessageSquare,
  Filter,
  ArrowRight,
  MapPin,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { mockApi } from '../data/mockDb';

export default function ControlTower() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAggregatedData();
  }, []);

  const fetchAggregatedData = async () => {
    const leads = await mockApi.getLeads();

    // Core Engine Splits
    const e1Leads = leads.filter(
      (l) => l.engine === 1 && l.status === 'active'
    );
    const e2Leads = leads.filter(
      (l) => l.engine === 2 && l.status === 'active'
    );

    // 🔥 A. Immediate Attention Flags
    const untouchedHighScores = e1Leads.filter(
      (l) => l.score > 80 && l.engagement_status === 'Not Engaged'
    ).length;
    const hotLeads = e1Leads.filter((l) => l.temperature === 'Hot').length;
    const pausedNurture = e2Leads.filter((l) => l.is_nurture_paused).length;

    // ⚡ B. Simulated Pipeline Stage Distribution
    const pipelineStages = {
      s1: e1Leads.filter((l) => l.stage_id === 's1').length + 12,
      s2: e1Leads.filter((l) => l.stage_id === 's2').length + 8,
      s3: e1Leads.filter((l) => l.stage_id === 's3').length + 4,
      s4: e1Leads.filter((l) => l.stage_id === 's4').length + 2,
    };

    // 🚀 11. CORE PERFORMANCE METRICS DATA
    const performanceMetrics = {
      leadFlow: { today: 14, week: 86, assigned: 82, e1: 60, e2: 26 },
      conversion: { e1Won: '18.5%', meetingToClose: '42.0%', overall: '12.4%' },
      speed: {
        firstContact: '1.2 hrs',
        avgStage: '3.4 days',
        dealCycle: '14 days',
      },
      nurture: {
        total: e2Leads.length + 142,
        engagement: '24%',
        reactivation: '6.2%',
        convAfterReactivation: '14%',
      },
      agents: [
        {
          name: 'John Doe',
          handled: 45,
          conv: '22%',
          respTime: '45 min',
          tasks: '98%',
        },
        {
          name: 'System Admin',
          handled: 12,
          conv: '45%',
          respTime: '15 min',
          tasks: '100%',
        },
      ],
      campaigns: [
        { tag: 'Q1_Inbound', leads: 120, conv: '14.2%' },
        { tag: 'Nagole_Promo', leads: 65, conv: '28.5%' },
        { tag: 'Cold_List_Import', leads: 300, conv: '2.1%' },
      ],
    };

    setData({
      leads: { total: leads.length, e1: e1Leads.length, e2: e2Leads.length },
      alerts: { untouchedHighScores, hotLeads, pausedNurture },
      pipeline: pipelineStages,
      perf: performanceMetrics,
    });
  };

  if (!data)
    return (
      <div className="p-10 flex flex-col items-center justify-center text-indigo-600">
        <Activity className="w-10 h-10 animate-pulse mb-4" /> Booting Command
        Dashboard...
      </div>
    );

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center">
            <BarChart3 className="w-7 h-7 mr-2 text-indigo-600" /> Command
            Dashboard
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Real-time operational visibility & bottleneck detection.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>{' '}
          Telemetry Active
        </div>
      </div>

      {/* 🔥 A. IMMEDIATE ATTENTION PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start shadow-sm cursor-pointer hover:bg-red-100 transition">
          <AlertCircle className="w-8 h-8 text-red-600 mr-4 shrink-0" />
          <div>
            <h3 className="font-bold text-red-900">
              Untouched High-Score Leads
            </h3>
            <div className="flex items-end mt-1">
              <span className="text-3xl font-black text-red-700 leading-none">
                {data.alerts.untouchedHighScores}
              </span>
              <span className="text-sm text-red-600 font-bold ml-2 mb-1">
                Require Action
              </span>
            </div>
            <p className="text-xs text-red-800 mt-2 font-medium">
              Leads scoring &gt;80 sitting in Stage 1.
            </p>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start shadow-sm cursor-pointer hover:bg-orange-100 transition">
          <Zap className="w-8 h-8 text-orange-600 mr-4 shrink-0" />
          <div>
            <h3 className="font-bold text-orange-900">Hot Intent / Engaged</h3>
            <div className="flex items-end mt-1">
              <span className="text-3xl font-black text-orange-700 leading-none">
                {data.alerts.hotLeads}
              </span>
              <span className="text-sm text-orange-600 font-bold ml-2 mb-1">
                Ready to Close
              </span>
            </div>
            <p className="text-xs text-orange-800 mt-2 font-medium">
              Leads requesting demos or replying actively.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start shadow-sm cursor-pointer hover:bg-amber-100 transition">
          <AlertTriangle className="w-8 h-8 text-amber-600 mr-4 shrink-0" />
          <div>
            <h3 className="font-bold text-amber-900">Nurture Warnings / SLA</h3>
            <div className="flex items-end mt-1">
              <span className="text-3xl font-black text-amber-700 leading-none">
                {data.alerts.pausedNurture}
              </span>
              <span className="text-sm text-amber-600 font-bold ml-2 mb-1">
                Paused Sequences
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-2 font-medium">
              Engine 2 leads temporarily halted or SLA breached.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ⚡ ENGINE 1: PIPELINE BOTTLENECKS (11C) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center border-b pb-3">
            <GitMerge className="w-5 h-5 mr-2 text-indigo-500" /> Pipeline Flow
            & Drop-offs
          </h3>

          <div className="space-y-4">
            <div className="relative">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-gray-700">Contact Initiation</span>
                <span className="text-indigo-600">
                  {data.pipeline.s1} Leads
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-indigo-400 h-4 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-white border border-gray-200 text-[10px] font-bold text-gray-500 px-2 py-0.5 rounded-full">
                40% Drop-off
              </div>
            </div>

            <div className="relative">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-gray-700">Meeting Scheduled</span>
                <span className="text-indigo-600">
                  {data.pipeline.s2} Leads
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-indigo-500 h-4 rounded-full"
                  style={{ width: '60%' }}
                ></div>
              </div>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-white border border-red-200 text-[10px] font-bold text-red-600 px-2 py-0.5 rounded-full shadow-sm">
                ⚠️ Bottleneck: 50% Drop-off
              </div>
            </div>

            <div className="relative">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-gray-700">Proposal / Close</span>
                <span className="text-indigo-600">
                  {data.pipeline.s3} Leads
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-indigo-600 h-4 rounded-full"
                  style={{ width: '30%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 🧠 SMART INSIGHTS LAYER (Section 3, F, D) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center border-b pb-3">
            <MessageSquare className="w-5 h-5 mr-2 text-indigo-500" /> System
            Intelligence
          </h3>

          <div className="flex-1 space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <h4 className="font-bold text-indigo-900 text-sm flex items-center">
                <Target className="w-4 h-4 mr-2" /> Bottleneck Detected
              </h4>
              <p className="text-sm text-indigo-800 mt-2 font-medium">
                Leads in 'Meeting Scheduled' stage are not converting to
                Proposals. Suggest reviewing Smart Scripts for Middle-Income
                schools.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <h4 className="font-bold text-emerald-900 text-sm flex items-center">
                <MapPin className="w-4 h-4 mr-2" /> Hub Expansion Signal (Sect.
                F)
              </h4>
              <p className="text-sm text-emerald-800 mt-2 font-medium">
                Schools mapped near the <strong>Nagole Center</strong> are
                showing a 22% higher reply rate in Engine 2 compared to
                Dilsukhnagar. High probability expansion area.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <h4 className="font-bold text-blue-900 text-sm flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" /> Reactivation Gold (Sect.
                D)
              </h4>
              <p className="text-sm text-blue-800 mt-2 font-medium">
                3 leads moved from Engine 2 → Engine 1 in the last 24 hours.
                These show high engagement spikes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🚀 11. CORE PERFORMANCE METRICS (THE DECISION MATRIX) */}
      {/* ========================================================= */}

      <div className="mt-10 mb-4">
        <h2 className="text-2xl font-black text-gray-900 flex items-center">
          <Filter className="w-6 h-6 mr-2 text-indigo-600" /> Core Performance
          Metrics
        </h2>
        <p className="text-gray-500 text-sm mt-1 font-medium italic">
          "Where is money leaking?" — Operational Data Matrix
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* A. Lead Flow Metrics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            A. Lead Flow (Top Funnel Health)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">
                Leads Added (Today / Week)
              </span>
              <span className="font-bold text-gray-900">
                {data.perf.leadFlow.today} / {data.perf.leadFlow.week}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">
                Leads Assigned
              </span>
              <span className="font-bold text-gray-900">
                {data.perf.leadFlow.assigned}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed">
              <span className="text-indigo-600 font-bold text-sm">
                Entered Engine 1
              </span>
              <span className="font-black text-indigo-600">
                {data.perf.leadFlow.e1}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-600 font-bold text-sm">
                Entered Engine 2
              </span>
              <span className="font-black text-blue-600">
                {data.perf.leadFlow.e2}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">
            Purpose: Are you feeding the system enough?
          </p>
        </div>

        {/* B. Conversion Metrics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            B. Conversion (Revenue Signal)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">
                Overall Conv. Rate
              </span>
              <span className="font-bold text-gray-900">
                {data.perf.conversion.overall}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">
                Meeting → Closed (%)
              </span>
              <span className="font-bold text-gray-900">
                {data.perf.conversion.meetingToClose}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed">
              <span className="text-emerald-600 font-bold text-sm">
                Engine 1 → Closed Won
              </span>
              <span className="font-black text-emerald-600">
                {data.perf.conversion.e1Won}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">
            Purpose: Is your closing system working?
          </p>
        </div>

        {/* E. Speed Metrics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            E. Execution Speed
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">
                Avg Time to 1st Contact
              </span>
              <span className="font-bold text-gray-900">
                {data.perf.speed.firstContact}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">
                Avg Time per Stage
              </span>
              <span className="font-bold text-gray-900">
                {data.perf.speed.avgStage}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed">
              <span className="text-orange-600 font-bold text-sm">
                Avg Deal Cycle
              </span>
              <span className="font-black text-orange-600">
                {data.perf.speed.dealCycle}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">
            Purpose: Are you moving fast enough?
          </p>
        </div>

        {/* D. Nurture Effectiveness */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            D. Nurture Effectiveness (E2)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">
                Total in Nurture
              </span>
              <span className="font-bold text-gray-900">
                {data.perf.nurture.total}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium text-sm">
                Engagement Rate (Replies/Clicks)
              </span>
              <span className="font-bold text-gray-900">
                {data.perf.nurture.engagement}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dashed">
              <span className="text-indigo-600 font-bold text-sm flex items-center">
                Reactivation (E2 <ArrowRight className="w-3 h-3 mx-1" /> E1)
              </span>
              <span className="font-black text-indigo-600">
                {data.perf.nurture.reactivation}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-600 font-bold text-sm">
                Conv. After Reactivation
              </span>
              <span className="font-black text-emerald-600">
                {data.perf.nurture.convAfterReactivation}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">
            Purpose: Is nurture working, or just sending messages?
          </p>
        </div>

        {/* F. Agent Effectiveness */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            F. Agent Effectiveness
          </h3>
          <div className="space-y-4">
            {data.perf.agents.map((agent, i) => (
              <div
                key={i}
                className="bg-slate-50 p-3 rounded-lg border border-slate-200"
              >
                <div className="font-bold text-sm text-gray-800 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-indigo-500" />{' '}
                  {agent.name}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Leads:</span>{' '}
                    <strong className="text-gray-900">{agent.handled}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Conv:</span>{' '}
                    <strong className="text-emerald-600">{agent.conv}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Resp:</span>{' '}
                    <strong className="text-gray-900">{agent.respTime}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Tasks:</span>{' '}
                    <strong className="text-indigo-600">{agent.tasks}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* G. Campaign / Import Tag Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
            G. Campaign Performance
          </h3>
          <div className="space-y-3">
            {data.perf.campaigns.map((camp, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200"
              >
                <div>
                  <div className="font-bold text-sm text-gray-800 flex items-center">
                    <Tag className="w-3 h-3 mr-1.5 text-indigo-400" />
                    {camp.tag}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {camp.leads} Leads Generated
                  </div>
                </div>
                <div className="font-black text-emerald-600 text-lg">
                  {camp.conv}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 italic">
            Purpose: Which campaigns bring real deals?
          </p>
        </div>
      </div>
    </div>
  );
}