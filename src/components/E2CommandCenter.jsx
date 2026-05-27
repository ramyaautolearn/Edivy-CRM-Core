import React, { useState, useEffect } from 'react';
import { 
  Droplets, Flame, Send, User, Phone, CheckCircle, Clock, 
  ArrowRight, Snowflake, AlertCircle, RefreshCw, Star, PlayCircle,
  Search, Filter, FilterX, Inbox, Calendar, FileText, ChevronDown, ChevronUp, Trash2, Zap, PauseCircle
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function E2CommandCenter({ user }) {
  const [e2Pipeline, setE2Pipeline] = useState(null);
  const [allLeads, setAllLeads] = useState([]);
  const [crmUsers, setCrmUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState('action_queue'); // 'action_queue', 'bank', 'resurrected'
  const [expandedLeadId, setExpandedLeadId] = useState(null);

  // Bank Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterStage, setFilterStage] = useState('all');

  const appId = 'edivy-crm-vault';
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // 1. Fetch Users
    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
        if (!snap.empty) setCrmUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        else onSnapshot(collection(db, 'users'), (rootSnap) => {
            if (!rootSnap.empty) setCrmUsers(rootSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    });

    // 2. Fetch Pipeline
    const e2DocRef = doc(db, 'artifacts', appId, 'public', 'data', 'pipelines', 'e2_active');
    const unsubPipeline = onSnapshot(e2DocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const activeVersion = data.versions?.find(v => v.status === 'active') || null;
        if (activeVersion) {
          const activeStages = (data.stages || []).filter(s => s.version_id === activeVersion.id).sort((a,b) => a.order - b.order);
          const activeActions = data.actions || [];
          setE2Pipeline({ version: activeVersion, stages: activeStages, actions: activeActions });
        }
      }
    });

    // 3. Fetch ALL Leads (to catch E2 leads AND resurrected E1 leads)
    const unsubLeads = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), (snap) => {
      const fetchedLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
      setAllLeads(fetchedLeads);
      setLoading(false);
    });

    return () => { unsubPipeline(); unsubLeads(); unsubUsers(); };
  }, []);

  const safeDateStr = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'object' && dateVal.seconds) return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
    if (typeof dateVal === 'string') return dateVal.split('T')[0];
    return '';
  };

  // --- ACTIONS ---
  const handleHandRaise = async (lead) => {
    if (!window.confirm(`🔥 Resurrect ${lead.school_name}? This will move them back to Engine 1 (Active Sales).`)) return;
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', lead.id), {
      engine: 1,
      resurrected_from_e2: true, // Flags them for the Trophy Case tab!
      temperature: 'Hot',
      stage_name: 'New Lead', 
      next_follow_up: todayStr, 
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ 
        id: Date.now().toString(), 
        date: new Date().toISOString(), 
        type: 'System', 
        text: '🔥 HAND-RAISE: Prospect resurrected from Engine 2 and pushed to E1 Active Sales.', 
        agent: user?.name || 'Agent' 
      })
    });
  };

  const handleExecuteDrop = async (lead, action) => {
    let script = (action.resource_text || '').replace(/{contact_name}/g, lead.contact_name || 'there');
    const cleanPhone = (lead.phone || '').replace(/\D/g, '');

    if (!script) {
        alert("This action has no script attached!");
        return;
    }

    try { await navigator.clipboard.writeText(script); } catch (err) {}
    window.open(`https://wa.me/${cleanPhone}`, '_blank');

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', lead.id), {
      completed_e2_actions: arrayUnion(action.id),
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ 
        id: Date.now().toString(), 
        date: new Date().toISOString(), 
        type: 'WhatsApp', 
        text: `E2 Drop Executed: [${action.title}]`, 
        agent: user?.name || 'Agent' 
      })
    });
  };

  const handleStageChange = async (leadId, newStageName) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), {
      stage_name: newStageName,
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ 
        id: Date.now().toString(), 
        date: new Date().toISOString(), 
        type: 'System', 
        text: `Moved to E2 Stage: ${newStageName}`, 
        agent: user?.name || 'Agent' 
      })
    });
  };

  const handleAdvanceStage = async (lead) => {
    const stages = e2Pipeline?.stages || [];
    if (stages.length === 0) return;
    
    let currentIdx = stages.findIndex(s => s.name === lead.stage_name);
    if (currentIdx === -1) {
        // Fix: If unmapped, advance to Stage 1!
        handleStageChange(lead.id, stages[0].name);
    } else if (currentIdx < stages.length - 1) {
        handleStageChange(lead.id, stages[currentIdx + 1].name);
    } else {
        alert("This lead has completed the final Engine 2 stage!");
    }
  };

  const handleSetFollowUp = async (leadId, dateStr) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), { 
      next_follow_up: dateStr || null, 
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ 
        id: Date.now().toString(), 
        date: new Date().toISOString(), 
        type: 'System', 
        text: dateStr ? `Tactical Pause Applied: System will wait until ${dateStr}` : `Tactical Pause Removed.`, 
        agent: user?.name || 'Agent' 
      })
    });
  };

  const handleDeleteLog = async (leadId, logIdToRemove) => {
    if (!window.confirm("Delete this log?")) return;
    try {
      const leadRef = doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId);
      const docSnap = await getDoc(leadRef);
      if (docSnap.exists()) {
        const updatedLogs = (docSnap.data().logs || []).filter(log => log.id !== logIdToRemove);
        await updateDoc(leadRef, { logs: updatedLogs });
      }
    } catch (err) {}
  };

  // --- ENGINE 2 DYNAMIC QUEUE MATH ---
  const getActionDetails = (lead) => {
    if (!e2Pipeline || !e2Pipeline.stages) return { action: null, isUnmapped: true };
    const stage = e2Pipeline.stages.find(s => s.name === lead.stage_name);
    if (!stage) return { action: null, isUnmapped: true };

    const stageActions = (e2Pipeline.actions || []).filter(a => a.stage_id === stage.id).sort((a,b) => a.order - b.order);
    const completed = lead.completed_e2_actions || [];
    
    let nextIdx = stageActions.findIndex(a => !completed.includes(a.id));
    if (nextIdx === -1) return { action: null, isComplete: true };

    const nextAction = stageActions[nextIdx];
    let baseDate = new Date();

    // Find when the timer started
    if (nextIdx === 0) {
        const log = [...(lead.logs || [])].reverse().find(l => l.text.includes(`Moved to E2 Stage: ${stage.name}`) || l.text.includes('Ejected Lead to Engine 2'));
        if (log) baseDate = new Date(log.date);
    } else {
        const prevAction = stageActions[nextIdx - 1];
        const log = [...(lead.logs || [])].reverse().find(l => l.text.includes(`[${prevAction.title}]`));
        if (log) baseDate = new Date(log.date);
    }

    let delayMs = 0;
    if (nextAction.delay_value) {
        if (nextAction.delay_unit === 'minutes') delayMs = nextAction.delay_value * 60000;
        else if (nextAction.delay_unit === 'hours') delayMs = nextAction.delay_value * 3600000;
        else if (nextAction.delay_unit === 'days') delayMs = nextAction.delay_value * 86400000;
    }

    const exactDueDate = new Date(baseDate.getTime() + delayMs);
    const now = new Date();
    const isTimerExpired = exactDueDate <= now;
    
    let timeString = '';
    if (isTimerExpired) {
        timeString = 'Due Now';
    } else {
        const diffDays = Math.ceil((exactDueDate - now) / 86400000);
        timeString = diffDays > 1 ? `Waiting: ${diffDays} days` : `Waiting: < 24h`;
    }

    return { action: nextAction, exactDueDate, isTimerExpired, timeString };
  };

  const isLeadActionable = (lead, details) => {
    const manualDate = safeDateStr(lead.next_follow_up);
    
    // 1. Summer Break (Hard Pause) Check
    if (manualDate && manualDate > todayStr) return false; 
    
    // 2. Pause Expired Check
    if (manualDate && manualDate <= todayStr) return true; 

    // 3. Unmapped leads always need attention
    if (details.isUnmapped) return true;

    // 4. No more actions? Not actionable.
    if (!details.action) return false;

    // 5. Timer expired? Actionable!
    return details.isTimerExpired;
  };


  if (loading) return <div className="flex h-full items-center justify-center bg-slate-50"><RefreshCw className="w-8 h-8 animate-spin text-blue-300" /></div>;
  if (!e2Pipeline) return <div className="p-10 text-center text-slate-500 font-bold bg-slate-50 min-h-screen">No Active E2 Pipeline Found. Please publish a version in the Nurture Builder!</div>;

  // --- DATA PARSING ---
  const e2Leads = allLeads.filter(l => l.engine === 2);
  const resurrectedLeads = allLeads.filter(l => l.engine === 1 && l.resurrected_from_e2);

  // My Leads Check
  const myE2Leads = e2Leads.filter(l => {
      const aTo = String(l.assigned_to || '').toLowerCase();
      return aTo === String(user?.id || '').toLowerCase() || aTo === String(user?.email || '').toLowerCase();
  });

  // Action Queue Tab
  const actionableLeads = (user?.role === 'admin' ? e2Leads : myE2Leads).filter(l => isLeadActionable(l, getActionDetails(l)));

  // E2 Bank Tab (Applying Filters)
  const bankLeads = e2Leads.filter(l => {
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(l.school_name || '').toLowerCase().includes(q) && !(l.contact_name || '').toLowerCase().includes(q)) return false;
    }
    if (filterOwner === 'unassigned') { if (l.assigned_to) return false; }
    else if (filterOwner === 'me') { 
        const aTo = String(l.assigned_to || '').toLowerCase();
        if (aTo !== String(user?.id || '').toLowerCase() && aTo !== String(user?.email || '').toLowerCase()) return false; 
    }
    else if (filterOwner !== 'all') { if (l.assigned_to !== filterOwner) return false; }
    
    if (filterStage !== 'all') {
        const lStage = l.stage_name || 'Unmapped';
        if (lStage !== filterStage) return false;
    }
    return true;
  });

  // Group Bank Leads by Stage
  const groupedBankLeads = {};
  e2Pipeline.stages.forEach(s => groupedBankLeads[s.name] = []);
  const unmappedBankLeads = [];
  bankLeads.forEach(l => {
    if (groupedBankLeads[l.stage_name]) groupedBankLeads[l.stage_name].push(l);
    else unmappedBankLeads.push(l);
  });

  // Helpers for UI
  const getLogIcon = (type) => {
    if (type === 'WhatsApp') return <MessageCircle className="w-3 h-3 text-emerald-500" />;
    if (type === 'System') return <Zap className="w-3 h-3 text-amber-500" />;
    return <FileText className="w-3 h-3 text-slate-400" />;
  };

  const activeAssignedIds = [...new Set(e2Leads.map(l => l.assigned_to).filter(Boolean))];
  const crmUserIds = crmUsers.map(u => u.id);
  const colleagueIds = [...new Set([...activeAssignedIds, ...crmUserIds])].filter(id => id !== user?.id && id !== user?.email && id !== user?.name);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50">
      
      {/* HEADER & TABS */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
            <Droplets className="w-8 h-8 mr-3 text-blue-500" /> E2 Command Center
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest flex items-center">
            <Snowflake className="w-4 h-4 mr-1 text-blue-300" /> Waking up cold leads automatically
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-xl self-start md:self-auto overflow-x-auto">
          <button onClick={() => setActiveTab('action_queue')} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center whitespace-nowrap ${activeTab === 'action_queue' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            ⚡ Actionable Today ({actionableLeads.length})
          </button>
          <button onClick={() => setActiveTab('bank')} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center whitespace-nowrap ${activeTab === 'bank' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            🧊 The E2 Bank ({e2Leads.length})
          </button>
          <button onClick={() => setActiveTab('resurrected')} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center whitespace-nowrap ${activeTab === 'resurrected' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            🔥 Hand-Raisers ({resurrectedLeads.length})
          </button>
        </div>
      </div>

      {/* --- TAB 1: ACTION QUEUE --- */}
      {activeTab === 'action_queue' && (
        <div className="space-y-4">
          <div className="mb-6 border-l-4 border-blue-500 pl-4">
            <h2 className="text-lg font-black text-slate-800">Your Action Queue</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Leads whose timers have expired. Clear the list and go home.</p>
          </div>
          
          {actionableLeads.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center shadow-sm">
              <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
              <h3 className="text-lg font-black text-emerald-600 uppercase tracking-widest">Inbox Zero</h3>
              <p className="text-sm font-medium text-slate-500 mt-2">All timers are running. No E2 actions required today.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {actionableLeads.map((lead, i) => (
                <ExpandableLeadRow 
                  key={lead.id} 
                  lead={lead} 
                  stages={e2Pipeline.stages}
                  details={getActionDetails(lead)}
                  onHandRaise={handleHandRaise}
                  onExecuteDrop={handleExecuteDrop}
                  onStageChange={handleStageChange}
                  onAdvanceStage={handleAdvanceStage}
                  onSetFollowUp={handleSetFollowUp}
                  onDeleteLog={handleDeleteLog}
                  isLast={i === actionableLeads.length - 1}
                  todayStr={todayStr}
                  safeDateStr={safeDateStr}
                  getLogIcon={getLogIcon}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: THE E2 BANK --- */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input type="text" placeholder="Search school, contact..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 transition-colors" />
              </div>
              <div className="flex gap-4">
                  <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[10px] font-black text-slate-600 outline-none uppercase tracking-wider cursor-pointer">
                      <option value="all">Any Owner</option>
                      <option value="unassigned">Unassigned (Shark Tank)</option>
                      {user?.id && <option value="me">My Cold Leads</option>}
                      {colleagueIds.map(id => <option key={id} value={id}>Agent: {id.substring(0, 6)}...</option>)}
                  </select>
                  <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[10px] font-black text-slate-600 outline-none uppercase tracking-wider cursor-pointer">
                      <option value="all">Any Stage</option>
                      <option value="Unmapped">Unmapped</option>
                      {e2Pipeline.stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  {(searchQuery || filterOwner !== 'all' || filterStage !== 'all') && (
                      <button onClick={() => { setSearchQuery(''); setFilterOwner('all'); setFilterStage('all'); }} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 rounded-lg flex items-center justify-center transition-colors shadow-sm" title="Clear Filters">
                          <FilterX className="w-4 h-4" />
                      </button>
                  )}
              </div>
          </div>

          {/* Grouped by Stage */}
          {unmappedBankLeads.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center ml-2 bg-amber-100 w-max px-3 py-1.5 rounded-lg border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Stage: Unmapped <span className="ml-2 bg-white px-2 py-0.5 rounded text-amber-600 shadow-sm">{unmappedBankLeads.length}</span>
              </h3>
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                {unmappedBankLeads.map((lead, i) => (
                  <ExpandableLeadRow 
                    key={lead.id} lead={lead} stages={e2Pipeline.stages} details={getActionDetails(lead)} onHandRaise={handleHandRaise} onExecuteDrop={handleExecuteDrop} onStageChange={handleStageChange} onAdvanceStage={handleAdvanceStage} onSetFollowUp={handleSetFollowUp} onDeleteLog={handleDeleteLog} isLast={i === unmappedBankLeads.length - 1} todayStr={todayStr} safeDateStr={safeDateStr} getLogIcon={getLogIcon}
                  />
                ))}
              </div>
            </div>
          )}

          {e2Pipeline.stages.map((stage, idx) => {
            const leadsInStage = groupedBankLeads[stage.name];
            if (leadsInStage.length === 0) return null;
            return (
              <div key={stage.id} className="relative">
                <h3 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-3 flex items-center ml-2 bg-blue-100/50 w-max px-3 py-1.5 rounded-lg border border-blue-200">
                  Stage {idx + 1}: {stage.name} <span className="ml-2 bg-white px-2 py-0.5 rounded text-blue-600 shadow-sm">{leadsInStage.length}</span>
                </h3>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {leadsInStage.map((lead, i) => (
                    <ExpandableLeadRow 
                      key={lead.id} lead={lead} stages={e2Pipeline.stages} details={getActionDetails(lead)} onHandRaise={handleHandRaise} onExecuteDrop={handleExecuteDrop} onStageChange={handleStageChange} onAdvanceStage={handleAdvanceStage} onSetFollowUp={handleSetFollowUp} onDeleteLog={handleDeleteLog} isLast={i === leadsInStage.length - 1} todayStr={todayStr} safeDateStr={safeDateStr} getLogIcon={getLogIcon}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {bankLeads.length === 0 && <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">No leads match these filters.</div>}
        </div>
      )}

      {/* --- TAB 3: RESURRECTED (TROPHY CASE) --- */}
      {activeTab === 'resurrected' && (
        <div className="space-y-4">
          <div className="mb-6 border-l-4 border-orange-500 pl-4">
            <h2 className="text-lg font-black text-slate-800">The Trophy Case</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Leads that E2 successfully revived and pushed back to E1.</p>
          </div>
          
          {resurrectedLeads.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center shadow-sm">
              <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No Resurrections Yet</h3>
              <p className="text-sm font-medium text-slate-500 mt-2">Let the Nurture sequence run. The hand-raisers will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resurrectedLeads.map(lead => (
                <div key={lead.id} className="bg-white border-2 border-orange-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500"></div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-slate-900">{lead.school_name}</h4>
                    <Flame className="w-5 h-5 text-orange-500 fill-current" />
                  </div>
                  <div className="text-xs font-bold text-slate-500 mb-4">{lead.contact_name}</div>
                  <div className="bg-orange-50 text-orange-800 text-[10px] font-black uppercase tracking-widest p-2 rounded-lg border border-orange-100 flex items-center justify-center">
                    Currently in E1 • {lead.stage_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}


// --- EXPANDABLE ROW COMPONENT ---
function ExpandableLeadRow({ 
  lead, stages, details, 
  onHandRaise, onExecuteDrop, onStageChange, onAdvanceStage, onSetFollowUp, onDeleteLog,
  isLast, todayStr, safeDateStr, getLogIcon
}) {
  const [expanded, setExpanded] = useState(false);
  const manualPauseDate = safeDateStr(lead.next_follow_up);
  const isHardPaused = manualPauseDate && manualPauseDate > todayStr;
  const isPauseExpired = manualPauseDate && manualPauseDate <= todayStr;

  return (
    <div className={`flex flex-col transition-colors ${!isLast ? 'border-b border-slate-100' : ''} ${expanded ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
      
      {/* ROW HEADER (Always Visible) */}
      <div className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        
        {/* 1. Lead Info */}
        <div className="xl:w-1/4 flex items-center">
          <button className="mr-3 text-slate-400 hover:text-blue-600 transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
                <h4 className="font-black text-slate-900 text-base tracking-tight truncate">{lead.school_name}</h4>
                {isPauseExpired && <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border border-red-200">Pause Expired</span>}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center"><User className="w-3 h-3 mr-1 text-slate-400" /> {lead.contact_name || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* 2. Pipeline Stage Control */}
        <div className="xl:w-1/5" onClick={e => e.stopPropagation()}>
          <select 
            value={lead.stage_name || ''} 
            onChange={(e) => onStageChange(lead.id, e.target.value)}
            className={`w-full text-[10px] font-black uppercase tracking-widest rounded-lg px-3 py-2 outline-none cursor-pointer transition-colors border ${details.isUnmapped ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-400'}`}
          >
            <option value="" disabled>AWAITING STAGE MAPPING</option>
            {stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>

        {/* 3. Action Block */}
        <div className="xl:w-1/3 bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm flex justify-between items-center" onClick={e => e.stopPropagation()}>
          {isHardPaused ? (
            <div className="flex-1 mr-4 text-purple-600 flex items-center text-[10px] font-black uppercase tracking-widest">
              <PauseCircle className="w-4 h-4 mr-2" /> Summer Break (Paused to {manualPauseDate})
            </div>
          ) : details.isUnmapped ? (
            <div className="flex-1 mr-4 text-amber-600 flex items-center text-[10px] font-black uppercase tracking-widest">
              <AlertCircle className="w-4 h-4 mr-2" /> Needs Stage Assignment
            </div>
          ) : details.action ? (
            <div className="flex-1 mr-4 overflow-hidden">
              <div className={`text-[9px] font-black uppercase tracking-widest mb-1 flex items-center ${details.isTimerExpired ? 'text-red-600' : 'text-blue-500'}`}>
                <Clock className="w-3 h-3 mr-1" /> {details.timeString}
              </div>
              <div className="text-[11px] font-bold text-slate-700 truncate">{details.action.title}</div>
            </div>
          ) : (
            <div className="flex-1 mr-4 text-emerald-600 flex items-center text-[10px] font-black uppercase tracking-widest">
              <CheckCircle className="w-4 h-4 mr-2" /> Stage Complete
            </div>
          )}

          {!isHardPaused && (
             details.isUnmapped || (!details.action && !details.isUnmapped) ? (
              <button onClick={() => onAdvanceStage(lead)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors flex items-center shrink-0">
                Advance <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            ) : details.action ? (
              <button onClick={() => onExecuteDrop(lead, details.action)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm flex items-center shrink-0">
                <Send className="w-3.5 h-3.5 mr-1.5" /> Execute
              </button>
            ) : null
          )}
        </div>

        {/* 4. Resurrection (Hand Raise) */}
        <div className="xl:w-[12%] flex justify-end" onClick={e => e.stopPropagation()}>
          <button onClick={() => onHandRaise(lead)} className="w-full bg-orange-50 hover:bg-orange-500 hover:text-white border border-orange-200 text-orange-600 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center group" title="Resurrect to E1">
            <Flame className="w-4 h-4 mr-1.5 group-hover:fill-current" /> Revive
          </button>
        </div>
      </div>

      {/* EXPANDED CONTENT AREA */}
      {expanded && (
        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-6 animate-in slide-in-from-top-2 duration-200">
          
          {/* Audit Trail */}
          <div className="flex-1 mt-4">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><FileText className="w-3 h-3 mr-1" /> Quick Audit Trail</h4>
             <div className="bg-white rounded-xl p-4 max-h-[250px] overflow-y-auto border border-slate-200 shadow-inner">
               {(!lead.logs || lead.logs.length === 0) ? (
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center py-6">No activity logged.</p>
               ) : (
                 <div className="space-y-3">
                   {[...lead.logs].reverse().map((log, i) => (
                     <div key={i} className="flex items-start gap-3 group">
                       <div className="mt-0.5 bg-slate-50 border border-slate-200 p-1.5 rounded-lg shrink-0">{getLogIcon(log.type)}</div>
                       <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start mb-0.5">
                           <span className="font-black text-slate-800 text-[11px] truncate">{log.agent} <span className="text-slate-400">({log.type})</span></span>
                           <button type="button" onClick={() => onDeleteLog(lead.id, log.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                         </div>
                         <span className="text-slate-600 block text-xs font-medium whitespace-pre-wrap">{log.text}</span>
                         <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(log.date).toLocaleString()}</div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </div>

          {/* Summer Break (Manual Pause) */}
          <div className="md:w-1/3 mt-4">
             <div className="bg-purple-50 p-5 rounded-xl border border-purple-200 shadow-sm h-full">
               <h4 className="text-[10px] font-black text-purple-800 uppercase tracking-widest mb-2 flex items-center"><PauseCircle className="w-4 h-4 mr-1.5" /> Summer Break (Hard Pause)</h4>
               <p className="text-[10px] font-medium text-purple-600 mb-4 leading-relaxed">Need to pause this nurture sequence until September? Pick a date below. They will be frozen and hidden until then.</p>
               
               <input 
                 type="date" 
                 value={manualPauseDate} 
                 onChange={(e) => onSetFollowUp(lead.id, e.target.value)} 
                 className="w-full bg-white border border-purple-200 rounded-lg p-3 text-sm font-bold text-slate-700 outline-none focus:border-purple-400 cursor-pointer shadow-sm mb-3" 
               />
               
               {manualPauseDate && (
                 <button onClick={() => onSetFollowUp(lead.id, null)} className="w-full py-2 text-[10px] font-black text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg uppercase tracking-widest transition-colors">
                   Remove Pause
                 </button>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}