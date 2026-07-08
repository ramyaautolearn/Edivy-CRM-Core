import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  Zap,
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
  RefreshCw,
  Tag,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  CardHeader,
  Badge,
  MetricCard,
  ProgressBar,
  SectionHeader,
  AlertCard,
  LoadingState,
} from '../design-system';

export default function ControlTower() {
  const [data, setData] = useState(null);
  const [rawLeads, setRawLeads] = useState(null);
  const [crmUsers, setCrmUsers] = useState({});

  const appId = 'edivy-crm-vault';

  // 1. ISOLATED DATABASE FETCHING (UNCHANGED)
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      const usersMap = {};
      if (!snap.empty) {
        snap.docs.forEach(d => {
          usersMap[d.id] = d.data().name || d.data().full_name || d.data().email?.split('@')[0] || 'Unknown Agent';
        });
        setCrmUsers(usersMap);
      } else {
        onSnapshot(collection(db, 'users'), (rootSnap) => {
          rootSnap.docs.forEach(d => {
            usersMap[d.id] = d.data().name || d.data().full_name || d.data().email?.split('@')[0] || 'Unknown Agent';
          });
          setCrmUsers(usersMap);
        });
      }
    });

    const unsubLeads = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), (snap) => {
      const fetchedLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRawLeads(fetchedLeads);
    });

    return () => { unsubUsers(); unsubLeads(); };
  }, []);

  // 2. ISOLATED TELEMETRY CALCULATION (UNCHANGED)
  useEffect(() => {
    if (rawLeads !== null) {
      calculateTelemetry(rawLeads, crmUsers);
    }
  }, [rawLeads, crmUsers]);

  const calculateTelemetry = (leads, usersMap) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const e1Leads = leads.filter(l => l.engine === 1);
    const e2Leads = leads.filter(l => l.engine === 2);
    const e3Leads = leads.filter(l => l.engine === 3);

    const untouchedHighScores = e1Leads.filter(l => l.score >= 80 && (!l.stage_name || l.stage_name === 'New Lead')).length;
    const hotLeads = e1Leads.filter(l => l.temperature === 'Hot').length;
    const pausedNurture = e2Leads.filter(l => l.next_follow_up && l.next_follow_up < todayStr).length;

    const totalPipeline = e1Leads.length + e3Leads.length;
    const meetingScheduledCount = e1Leads.filter(l => l.is_demo_booked).length + e3Leads.length;
    const closedWonCount = e3Leads.length;

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

  // LOADING STATE
  if (!data) {
    return (
      <PageLayout>
        <LoadingState message="Loading telemetry data..." />
      </PageLayout>
    );
  }

  // Pipeline calculations (UNCHANGED)
  const pS2Width = data.pipeline.s1 > 0 ? `${(data.pipeline.s2 / data.pipeline.s1) * 100}%` : '0%';
  const pS3Width = data.pipeline.s1 > 0 ? `${(data.pipeline.s3 / data.pipeline.s1) * 100}%` : '0%';
  const dropOffS1toS2 = data.pipeline.s1 > 0 ? Math.round(((data.pipeline.s1 - data.pipeline.s2) / data.pipeline.s1) * 100) : 0;

  return (
    <PageLayout>
      {/* HEADER */}
      <PageHeader
        title="Command Dashboard"
        subtitle="Real-time operational visibility and bottleneck detection"
        badge={
          <Badge variant="success">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] mr-1.5 animate-pulse" />
            Telemetry Active
          </Badge>
        }
      />

      <PageContent>
        {/* IMMEDIATE ATTENTION - Action Required Panel */}
        <SectionHeader
          title="Immediate Attention"
          subtitle="Priority items requiring your action now"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <AlertCard
            variant="error"
            icon={<AlertCircle className="w-5 h-5" />}
            title="Untouched High-Score Leads"
            description={`${data.alerts.untouchedHighScores} leads scoring 80+ are stuck in 'New Lead' status. Assign and initiate contact immediately.`}
            action={
              <div className="flex items-baseline gap-2 mt-2 pt-3 border-t border-[#fecaca]">
                <span className="text-3xl font-semibold text-[#b91c1c] tracking-tight">{data.alerts.untouchedHighScores}</span>
                <span className="text-sm text-[#dc2626]">require action</span>
              </div>
            }
          />

          <AlertCard
            variant="warning"
            icon={<Zap className="w-5 h-5" />}
            title="Hot Intent / Engaged"
            description="Leads manually flagged as Hot in Engine 1. Ready for immediate advancement."
            action={
              <div className="flex items-baseline gap-2 mt-2 pt-3 border-t border-[#fde68a]">
                <span className="text-3xl font-semibold text-[#b45309] tracking-tight">{data.alerts.hotLeads}</span>
                <span className="text-sm text-[#d97706]">ready to advance</span>
              </div>
            }
          />

          <AlertCard
            variant="warning"
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Nurture Warnings / SLA"
            description="Engine 2 leads with overdue manual tasks requiring attention."
            action={
              <div className="flex items-baseline gap-2 mt-2 pt-3 border-t border-[#fde68a]">
                <span className="text-3xl font-semibold text-[#b45309] tracking-tight">{data.alerts.pausedNurture}</span>
                <span className="text-sm text-[#d97706]">overdue actions</span>
              </div>
            }
          />
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pipeline Flow */}
          <Card padding="lg">
            <CardHeader
              title="Pipeline Flow"
              subtitle="Lead progression through sales stages"
              icon={<GitMerge className="w-4 h-4" />}
            />

            <div className="space-y-5">
              {/* Stage 1 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#475569]">Total Contacted (E1 + E3)</span>
                  <span className="text-sm font-medium text-[#3b82f6]">{data.pipeline.s1} leads</span>
                </div>
                <ProgressBar value={100} color="blue" size="sm" />
              </div>

              {/* Drop-off indicator */}
              <div className="flex justify-center -my-1">
                <Badge variant="neutral" size="sm">
                  {dropOffS1toS2}% drop-off
                </Badge>
              </div>

              {/* Stage 2 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#475569]">Demos / Meetings Scheduled</span>
                  <span className="text-sm font-medium text-[#3b82f6]">{data.pipeline.s2} leads</span>
                </div>
                <ProgressBar value={data.pipeline.s1 > 0 ? (data.pipeline.s2 / data.pipeline.s1) * 100 : 0} color="blue" size="sm" />
              </div>

              {/* Bottleneck warning */}
              {data.pipeline.s2 > 0 && (data.pipeline.s3 / data.pipeline.s2) < 0.3 && (
                <div className="flex justify-center -my-1">
                  <Badge variant="error" size="sm">
                    Bottleneck detected
                  </Badge>
                </div>
              )}

              {/* Stage 3 */}
              <div className="pt-4 border-t border-[#f1f5f9]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#475569] flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#22c55e]" />
                    Closed Won (E3 Onboarding)
                  </span>
                  <span className="text-sm font-medium text-[#22c55e]">{data.pipeline.s3} clients</span>
                </div>
                <ProgressBar value={data.pipeline.s1 > 0 ? (data.pipeline.s3 / data.pipeline.s1) * 100 : 0} color="green" size="sm" />
              </div>
            </div>
          </Card>

          {/* System Intelligence */}
          <Card padding="lg">
            <CardHeader
              title="System Intelligence"
              subtitle="Automated insights and recommendations"
              icon={<MessageSquare className="w-4 h-4" />}
            />

            <div className="space-y-3">
              {data.alerts.untouchedHighScores > 0 && (
                <AlertCard
                  variant="error"
                  icon={<Target className="w-4 h-4" />}
                  title="Leakage Warning"
                  description={`You have ${data.alerts.untouchedHighScores} high-value leads sitting unworked. Agents need to claim and initiate contact immediately.`}
                />
              )}

              {data.perf.nurture.reactivation > 0 && (
                <AlertCard
                  variant="info"
                  icon={<RefreshCw className="w-4 h-4" />}
                  title="Nurture System Success"
                  description={`Engine 2 has successfully reactivated ${data.perf.nurture.reactivation} leads. The automated sequences are generating active pipeline volume.`}
                />
              )}

              {data.pipeline.s2 > 0 && (data.pipeline.s3 / data.pipeline.s2) < 0.2 ? (
                <AlertCard
                  variant="info"
                  icon={<AlertCircle className="w-4 h-4" />}
                  title="Conversion Bottleneck"
                  description="High volume of Demos happening, but low transition to E3 Onboarding. Review your presentation scripts and closing offers."
                />
              ) : (
                <AlertCard
                  variant="success"
                  icon={<CheckCircle className="w-4 h-4" />}
                  title="Pipeline Healthy"
                  description="Lead progression from Demo to E3 Onboarding is operating within normal margins. Keep pushing volume."
                />
              )}
            </div>
          </Card>
        </div>

        {/* PERFORMANCE METRICS */}
        <div className="mb-4">
          <SectionHeader
            title="Core Performance Metrics"
            subtitle="Where is money leaking? — Operational Data Matrix"
          />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Leads"
            value={data.perf.leadFlow.total}
            subtitle={`${data.perf.leadFlow.assigned} assigned`}
            accentColor="blue"
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Active Sales (E1)"
            value={data.perf.leadFlow.e1}
            subtitle="In pipeline"
            accentColor="blue"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            title="Nurture Bank (E2)"
            value={data.perf.leadFlow.e2}
            subtitle="Long-term prospects"
            accentColor="cyan"
            icon={<Clock className="w-5 h-5" />}
          />
          <MetricCard
            title="Won (E3)"
            value={data.perf.leadFlow.e3}
            subtitle="Active onboarding"
            accentColor="green"
            icon={<Briefcase className="w-5 h-5" />}
          />
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Lead Flow */}
          <Card>
            <div className="mb-4">
              <Badge variant="neutral" size="sm">Lead Flow</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#64748b]">Total in Database</span>
                <span className="text-sm font-medium text-[#0f172a]">{data.perf.leadFlow.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#64748b]">Assigned to Agents</span>
                <span className="text-sm font-medium text-[#0f172a]">{data.perf.leadFlow.assigned}</span>
              </div>
              <div className="h-px bg-[#f1f5f9] my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#3b82f6]">Engine 1 (Sales)</span>
                <span className="text-sm font-semibold text-[#3b82f6]">{data.perf.leadFlow.e1}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#06b6d4]">Engine 2 (Nurture)</span>
                <span className="text-sm font-semibold text-[#06b6d4]">{data.perf.leadFlow.e2}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#22c55e] flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  Engine 3 (Won)
                </span>
                <span className="text-sm font-semibold text-[#22c55e]">{data.perf.leadFlow.e3}</span>
              </div>
            </div>
            <p className="text-xs text-[#94a3b8] mt-4 pt-3 border-t border-[#f1f5f9]">
              System health: Are you feeding the pipeline enough?
            </p>
          </Card>

          {/* Conversion */}
          <Card>
            <div className="mb-4">
              <Badge variant="neutral" size="sm">Conversion</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#64748b]">Overall Conversion</span>
                <span className="text-sm font-medium text-[#0f172a]">{data.perf.conversion.overall}</span>
              </div>
              <div className="h-px bg-[#f1f5f9] my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#22c55e]">E1 → Closed Won</span>
                <span className="text-lg font-semibold text-[#22c55e]">{data.perf.conversion.e1Won}</span>
              </div>
            </div>
            <p className="text-xs text-[#94a3b8] mt-4 pt-3 border-t border-[#f1f5f9]">
              Revenue signal: Is your closing system working?
            </p>
          </Card>

          {/* Execution Speed */}
          <Card>
            <div className="mb-4">
              <Badge variant="neutral" size="sm">Execution Speed</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#64748b]">Avg Time to 1st Contact</span>
                <span className="text-sm font-medium text-[#0f172a]">&lt; 2 hrs <span className="text-[#94a3b8] font-normal">(target)</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#64748b]">Avg Time per Stage</span>
                <span className="text-sm font-medium text-[#0f172a]">3.4 days</span>
              </div>
              <div className="h-px bg-[#f1f5f9] my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#f59e0b]">Avg Deal Cycle</span>
                <span className="text-sm font-semibold text-[#f59e0b]">14 days</span>
              </div>
            </div>
            <p className="text-xs text-[#94a3b8] mt-4 pt-3 border-t border-[#f1f5f9]">
              Velocity: Are you moving fast enough?
            </p>
          </Card>

          {/* Nurture Effectiveness */}
          <Card>
            <div className="mb-4">
              <Badge variant="neutral" size="sm">Nurture Effectiveness</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#64748b]">Total in Nurture Bank</span>
                <span className="text-sm font-medium text-[#0f172a]">{data.perf.nurture.total}</span>
              </div>
              <div className="h-px bg-[#f1f5f9] my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#3b82f6] flex items-center">
                  Reactivations <ArrowRight className="w-3 h-3 mx-1" /> E1
                </span>
                <span className="text-lg font-semibold text-[#3b82f6]">{data.perf.nurture.reactivation}</span>
              </div>
            </div>
            <p className="text-xs text-[#94a3b8] mt-4 pt-3 border-t border-[#f1f5f9]">
              Quality: Is nurture generating pipeline or just sending messages?
            </p>
          </Card>

          {/* Agent Effectiveness */}
          <Card>
            <div className="mb-4">
              <Badge variant="neutral" size="sm">Top Closers</Badge>
            </div>
            <div className="space-y-3">
              {data.perf.agents.map((agent, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#f8fafc] border border-[#f1f5f9]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#eff6ff] flex items-center justify-center">
                      <Users className="w-4 h-4 text-[#3b82f6]" />
                    </div>
                    <span className="text-sm font-medium text-[#0f172a]">{agent.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-[#94a3b8]">Handled</p>
                      <p className="text-sm font-medium text-[#0f172a]">{agent.handled}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#94a3b8]">Win Rate</p>
                      <p className="text-sm font-medium text-[#22c55e]">{agent.conv}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Lead Sources */}
          <Card>
            <div className="mb-4">
              <Badge variant="neutral" size="sm">Lead Sources</Badge>
            </div>
            <div className="space-y-2">
              {data.perf.campaigns.map((camp, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#f8fafc] border border-[#f1f5f9]">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-[#94a3b8]" />
                    <div>
                      <p className="text-sm font-medium text-[#0f172a]">{camp.tag}</p>
                      <p className="text-xs text-[#94a3b8]">{camp.leads} leads</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[#22c55e]">{camp.conv}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#94a3b8] mt-4 pt-3 border-t border-[#f1f5f9]">
              Attribution: Which sources bring real deals?
            </p>
          </Card>
        </div>
      </PageContent>
    </PageLayout>
  );
}
