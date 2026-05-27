import React, { useState, useEffect } from 'react';
import {
  Shield, RefreshCw, MapPin, Star, Flame, Zap, User, Phone, Send, Inbox, Calendar,
  FileText, CheckCircle, BookOpen, AlertCircle, PlayCircle, Trash2, Video,
  MessageCircle, Clock, Circle, ChevronDown, ChevronUp, Snowflake, Lock, Unlock,
  Link as LinkIcon, X, Droplets, Search, Filter, FilterX, ArrowRight
} from 'lucide-react';
import {
  collection, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

export default function E2CommandCenter({ user }) {
  // Core State
  const [e2Pipeline, setE2Pipeline] = useState(null);
  const [allLeads, setAllLeads] = useState([]);
  const [crmUsers, setCrmUsers] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('action_queue'); 
  
  // Accordion Sidebar State
  const [expandedStageId, setExpandedStageId] = useState(null);

  // Note State
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('Internal Note');

  // Filter State (For Bank)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterStage, setFilterStage] = useState('all');

  const appId = 'edivy-crm-vault';
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!db) return;

    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
        if (!snap.empty) setCrmUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const e2DocRef = doc(db, 'artifacts', appId, 'public', 'data', 'pipelines', 'e2_active');
    const unsubPipeline = onSnapshot(e2DocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const activeVersion = data.versions?.find(v => v.status === 'active') || null;
        if (activeVersion) {
          const activeStages = (data.stages || []).filter(s => s.version_id === activeVersion.id).sort((a,b) => a.order - b.order);
          const activeActions = data.actions || [];
          setE2Pipeline({ version: activeVersion, stages: activeStages, actions: activeActions });
          if (activeStages.length > 0) setExpandedStageId(activeStages[0].id);
        }
      }
    });

    const unsubLeads = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), (snap) => {
      const fetchedLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
      setAllLeads(fetchedLeads);
      setLoading(false);
    });

    return () => { unsubUsers(); unsubPipeline(); unsubLeads(); };
  }, []);

  const safeDateStr = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'object' && dateVal.seconds) return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
    if (typeof dateVal === 'string') return dateVal.split('T')[0];
    return '';
  };

  const getNextActionForLead = (lead, stage) => {
    if (!e2Pipeline || !stage) return null;
    const stageActions = e2Pipeline.actions.filter(a => a.stage_id === stage.id).sort((a,b) => a.order - b.order);
    const completed = lead.completed_e2_actions || [];
    return stageActions.find(a => !completed.includes(a.id)) || null;
  };

  const getLastCompletedAction = (lead, stage) => {
    if (!e2Pipeline || !stage) return null;
    const stageActions = e2Pipeline.actions.filter(a => a.stage_id === stage.id).sort((a,b) => a.order - b.order);
    const completed = lead.completed_e2_actions || [];
    const completedInStage = stageActions.filter(a => completed.includes(a.id));
    return completedInStage.length > 0 ? completedInStage[completedInStage.length - 1] : null;
  };

  const handleMarkComplete = async (lead, currentAction, nextAction) => {
    let newDueDate = null;
    
    if (nextAction) {
      const delayVal = nextAction.delay_value || 0;
      const delayUnit = nextAction.delay_unit || 'days';
      let delayMs = 0;
      if (delayUnit === 'minutes') delayMs = delayVal * 60000;
      if (delayUnit === 'hours') delayMs = delayVal * 3600000;
      if (delayUnit === 'days') delayMs = delayVal * 86400000;
      newDueDate = new Date(Date.now() + delayMs).toISOString().split('T')[0];
    } else {
      newDueDate = today;
    }

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', lead.id), {
      completed_e2_actions: arrayUnion(currentAction.id),
      next_e2_due_date: newDueDate,
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({
         id: Date.now().toString(),
         date: new Date().toISOString(),
         type: 'System',
         text: `✅ E2 Action Completed: [${currentAction.title}]`,
         agent: user?.name || 'Agent'
      })
    });
  };

  const handleUndoAction = async (lead, actionToUndo) => {
    if (!window.confirm(`Undo completion of "${actionToUndo.title}"? This will return it to your Action Queue.`)) return;
    const newCompleted = (lead.completed_e2_actions || []).filter(id => id !== actionToUndo.id);
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', lead.id), {
      completed_e2_actions: newCompleted,
      next_e2_due_date: today,
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({
         id: Date.now().toString(),
         date: new Date().toISOString(),
         type: 'System',
         text: `↩️ Action Reversed: [${actionToUndo.title}] was marked uncompleted.`,
         agent: user?.name || 'Agent'
      })
    });
  };

  const handleStageChange = async (leadId, newStageName) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), {
      stage_name: newStageName,
      next_e2_due_date: today,
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ 
        id: Date.now().toString(), 
        date: new Date().toISOString(), 
        type: 'System', 
        text: `Moved to E2 Nurture Stage: ${newStageName}`, 
        agent: user?.name || 'Agent' 
      })
    });
  };

  const handleHandRaise = async (lead) => {
    if (!window.confirm(`Resurrect ${lead.school_name}? This will beam them back to Engine 1 (Active Sales).`)) return;
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', lead.id), {
      engine: 1,
      temperature: 'Hot',
      stage_name: 'New Lead', 
      next_follow_up: today,
      resurrected_from_e2: true,
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ 
        id: Date.now().toString(), 
        date: new Date().toISOString(), 
        type: 'System', 
        text: '🔥 HAND-RAISE: Prospect resurrected from Engine 2 and pushed to E1 Active Sales.', 
        agent: user?.name || 'Agent' 
      })
    });
    setSelectedLeadId(null);
  };

  const handleOpenWhatsApp = async (lead, script) => {
    let textToCopy = (script || '').replace(/{contact_name}/g, lead.contact_name || 'there');
    const cleanPhone = (lead.phone || '').replace(/\D/g, ''); 
    try { await navigator.clipboard.writeText(textToCopy); } catch (err) { }
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedLeadId) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLeadId), {
        logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: noteType, text: noteText, agent: user?.name || 'Agent' }),
        last_activity_at: serverTimestamp()
      });
      setNoteText(''); setNoteType('Internal Note');
    } catch (err) {}
  };

  const handleDeleteLog = async (logIdToRemove) => {
    if (!window.confirm("Delete this log?")) return;
    try {
      const leadRef = doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLeadId);
      const docSnap = await getDoc(leadRef);
      if (docSnap.exists()) {
        const updatedLogs = (docSnap.data().logs || []).filter(log => log.id !== logIdToRemove);
        await updateDoc(leadRef, { logs: updatedLogs });
      }
    } catch (err) {}
  };

  const e2Leads = allLeads.filter(l => l.engine === 2);
  const resurrectedLeads = allLeads.filter(l => l.resurrected_from_e2 === true);

  const actionableLeads = e2Leads.filter(l => {
    const dueStr = safeDateStr(l.next_e2_due_date) || today;
    return dueStr === today;
  });

  const overdueLeads = e2Leads.filter(l => {
    const dueStr = safeDateStr(l.next_e2_due_date);
    return dueStr && dueStr < today;
  });

  let displayedBankLeads = e2Leads.filter(l => {
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(l.school_name || '').toLowerCase().includes(q) && !(l.contact_name || '').toLowerCase().includes(q)) return false;
    }
    if (filterOwner === 'me') {
        const myId = String(user?.id || '').toLowerCase();
        const aTo = String(l.assigned_to || '').toLowerCase();
        if (aTo !== myId && aTo !== String(user?.email || '').toLowerCase()) return false;
    } else if (filterOwner !== 'all') {
        if (l.assigned_to !== filterOwner) return false;
    }
    if (filterStage !== 'all' && l.stage_name !== filterStage) return false;
    return true;
  });

  const activeAssignedIds = [...new Set(e2Leads.map(l => l.assigned_to).filter(Boolean))];
  const dropdownUsers = activeAssignedIds.map(id => {
      const crmU = crmUsers.find(u => String(u.id) === String(id) || String(u.email) === String(id));
      let displayName = `Agent: ${String(id).substring(0, 6)}...`;
      if (crmU) displayName = crmU.badge_id ? `[${crmU.badge_id}] ${crmU.name || crmU.email}` : (crmU.name || crmU.email);
      return { id, display: displayName };
  });

  const getLogIcon = (type) => {
    if (type === 'WhatsApp') return <MessageCircle className="w-3 h-3 text-emerald-500" />;
    if (type === 'Call') return <Phone className="w-3 h-3 text-blue-500" />;
    if (type === 'Meeting') return <Video className="w-3 h-3 text-purple-500" />;
    if (type === 'System') return <Zap className="w-3 h-3 text-amber-500" />;
    return <FileText className="w-3 h-3 text-slate-400" />;
  };

  const selectedLead = allLeads.find((l) => l.id === selectedLeadId);
  const currentStage = selectedLead ? (e2Pipeline?.stages || []).find(s => s.name === selectedLead.stage_name) : null;
  const activeTask = selectedLead ? getNextActionForLead(selectedLead, currentStage) : null;
  const lastCompletedTask = selectedLead ? getLastCompletedAction(selectedLead, currentStage) : null;

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden font-sans text-slate-800 relative w-full border border-slate-200 rounded-2xl shadow-xl">
      
      <aside className="w-[340px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 h-full">
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-col gap-1.5 shrink-0">
          <button onClick={() => { setActiveTab('action_queue'); setSelectedLeadId(null); }} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'action_queue' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' }`}><span className="flex items-center"><Zap className="w-3.5 h-3.5 mr-2"/> Actionable Today</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='action_queue'?'bg-white/20':'bg-slate-800'}`}>{actionableLeads.length}</span></button>
          <button onClick={() => { setActiveTab('overdue'); setSelectedLeadId(null); }} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'overdue' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' }`}><span className="flex items-center"><AlertCircle className="w-3.5 h-3.5 mr-2"/> Overdue Drops</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='overdue'?'bg-white/20':'bg-slate-800'}`}>{overdueLeads.length}</span></button>
          <button onClick={() => { setActiveTab('bank'); setSelectedLeadId(null); }} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'bank' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' }`}><span className="flex items-center"><Inbox className="w-3.5 h-3.5 mr-2"/> The E2 Bank</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='bank'?'bg-white/20':'bg-slate-800'}`}>{e2Leads.length}</span></button>
          <button onClick={() => { setActiveTab('resurrected'); setSelectedLeadId(null); }} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'resurrected' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' }`}><span className="flex items-center"><Flame className="w-3.5 h-3.5 mr-2"/> Hand-Raisers</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='resurrected'?'bg-white/20':'bg-slate-800'}`}>{resurrectedLeads.length}</span></button>
        </div>

        {activeTab === 'bank' && (
            <div className="p-3 bg-white border-b border-slate-200 shrink-0 shadow-sm flex flex-col gap-2">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input type="text" placeholder="Search cold leads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-400" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold text-slate-600 outline-none uppercase tracking-wider cursor-pointer truncate">
                        <option value="all">All Agents</option>
                        {user?.id && <option value="me">My Leads</option>}
                        {dropdownUsers.map(u => <option key={u.id} value={u.id}>{u.display}</option>)}
                    </select>
                    <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold text-slate-600 outline-none uppercase tracking-wider cursor-pointer">
                        <option value="all">All Stages</option>
                        {e2Pipeline?.stages?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {loading || !e2Pipeline ? <div className="p-12 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div> : 
          
          (activeTab === 'action_queue' || activeTab === 'overdue') ? (
            <div className="p-2 space-y-2">
              {e2Pipeline.stages.map((stage, idx) => {
                const targetLeads = activeTab === 'action_queue' ? actionableLeads : overdueLeads;
                const leadsInStage = targetLeads.filter(l => l.stage_name === stage.name);
                if (leadsInStage.length === 0) return null;
                return (
                  <div key={stage.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <button onClick={() => setExpandedStageId(expandedStageId === stage.id ? null : stage.id)} className="w-full p-3 bg-slate-100/50 hover:bg-slate-100 flex justify-between items-center text-left">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-900 truncate">S{idx+1}: {stage.name}</span>
                      <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded ml-2">{leadsInStage.length}</span>
                    </button>
                    {expandedStageId === stage.id && (
                      <div className="p-2 bg-slate-50/50 border-t border-slate-100 space-y-2">
                        {leadsInStage.map(l => (
                          <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${ selectedLeadId === l.id ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-slate-100 hover:border-blue-200' }`}>
                            <h4 className="font-black text-xs tracking-tight text-slate-900 truncate">{l.school_name}</h4>
                            <div className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest flex items-center">
                                <Clock className={`w-3 h-3 mr-1 ${activeTab === 'overdue' ? 'text-red-500' : 'text-blue-500'}`} /> 
                                {activeTab === 'overdue' ? `Overdue (${safeDateStr(l.next_e2_due_date)})` : 'Due Today'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {((activeTab === 'action_queue' ? actionableLeads : overdueLeads).length === 0) && <div className="p-10 text-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Queue is Empty</div>}
            </div>
          ) : 
          (
            <div className="p-3 space-y-3">
              {(activeTab === 'bank' ? displayedBankLeads : resurrectedLeads).map((l) => (
                <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${ selectedLeadId === l.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-100 hover:border-blue-200' }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm tracking-tight text-slate-900 truncate pr-2">{l.school_name}</h4>
                    {activeTab === 'resurrected' && <Flame className="w-4 h-4 text-orange-500 fill-current shrink-0" />}
                  </div>
                  {activeTab === 'bank' && safeDateStr(l.next_e2_due_date) > today && (
                    <div className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center w-max px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                      <Clock className="w-3 h-3 mr-1" /> Wakes up: {safeDateStr(l.next_e2_due_date)}
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-slate-100 text-slate-600 truncate max-w-[150px]">
                      {l.stage_name || 'E2 Entry'}
                    </span>
                  </div>
                </div>
              ))}
              {(activeTab === 'bank' ? displayedBankLeads : resurrectedLeads).length === 0 && <div className="p-10 text-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">No Leads Found</div>}
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative overflow-hidden min-w-0 bg-white h-full">
        {!selectedLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50"><Droplets className="w-20 h-20 mb-6 opacity-20" /><h2 className="text-xl font-black uppercase tracking-widest text-slate-300">Select E2 Target</h2></div>
        ) : (
          <div className="flex flex-col h-full w-full animate-in fade-in duration-300">
            
            <header className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-start bg-white z-10 shadow-sm gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedLead.school_name}</h2>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${selectedLead.engine === 1 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                    {selectedLead.engine === 1 ? '🔥 E1 Active' : '❄️ E2 Nurture'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center mt-2 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <p className="flex items-center"><User className="w-4 h-4 mr-1 text-blue-500" /> {selectedLead.contact_name}</p>
                  <p className="flex items-center"><Phone className="w-4 h-4 mr-1 text-blue-500" /> {selectedLead.phone}</p>
                </div>
              </div>
              
              <div className="text-right flex gap-3">
                {selectedLead.engine === 2 && (
                  <button onClick={() => handleHandRaise(selectedLead)} className="px-6 py-3 bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-600 border border-orange-200 text-[10px] font-black rounded-xl uppercase tracking-widest shadow-sm transition-all flex items-center group">
                    <Flame className="w-4 h-4 mr-2 group-hover:fill-current" /> Hand Raise (Push to E1)
                  </button>
                )}
              </div>
            </header>

            <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">

                {selectedLead.engine === 2 && (
                  <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-widest flex items-center">
                        <PlayCircle className="w-4 h-4 mr-2 text-blue-500" /> Drop Execution Protocol
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Current Stage:</span>
                        <select 
                          value={selectedLead.stage_name || ''} 
                          onChange={(e) => handleStageChange(selectedLead.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-blue-400 transition-colors"
                        >
                          <option value="" disabled>Select Stage...</option>
                          {e2Pipeline?.stages?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {!currentStage ? (
                       <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center">
                         <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                         <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest">Lead is Unmapped</h4>
                         <p className="text-xs font-medium text-amber-600 mt-2">Select a stage from the dropdown above to initialize the nurture sequence.</p>
                       </div>
                    ) : activeTask ? (
                      <div className="space-y-6">
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-4">
                          <div className="bg-white border border-slate-200 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm text-blue-600 font-black">
                            {e2Pipeline.actions.filter(a => a.stage_id === currentStage.id).findIndex(a => a.id === activeTask.id) + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black text-slate-800 tracking-tight">{activeTask.title}</h4>
                            <p className="text-xs font-medium text-slate-500 mt-1">{activeTask.description}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/30 p-5 rounded-2xl border border-blue-100">
                          <div>
                             <label className="block text-[9px] font-black uppercase tracking-widest text-purple-500 mb-2">AI Guidance / Strategy</label>
                             <div className="bg-purple-50/50 p-4 rounded-xl text-sm font-medium text-purple-900 border border-purple-100 shadow-inner min-h-[120px]">
                               {activeTask.ai_guidance || 'No guidance provided.'}
                             </div>
                          </div>
                          <div>
                             <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Approved WhatsApp Script</label>
                             <div className="bg-white p-4 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 shadow-inner min-h-[120px] whitespace-pre-wrap">
                               {(activeTask.resource_text || '').replace(/{contact_name}/g, selectedLead.contact_name || '')}
                             </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center pt-4">
                          <button onClick={() => handleOpenWhatsApp(selectedLead, activeTask.resource_text)} className="bg-emerald-500 text-white font-black py-3 px-6 rounded-xl shadow-md hover:bg-emerald-600 transition-all uppercase text-[10px] tracking-widest flex items-center">
                            <Send className="w-4 h-4 mr-2" /> Send via WhatsApp
                          </button>
                          
                          {activeTask.media_url && (
                              <button onClick={() => window.open(activeTask.media_url, '_blank')} className="bg-white border border-slate-300 text-slate-600 font-black py-3 px-5 rounded-xl shadow-sm hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest flex items-center">
                                  <LinkIcon className="w-4 h-4 mr-2" /> View Media Attachment
                              </button>
                          )}
                          
                          <div className="flex-1 flex justify-end gap-3">
                            {lastCompletedTask && (
                              <button 
                                onClick={() => handleUndoAction(selectedLead, lastCompletedTask)}
                                className="bg-white border border-red-200 text-red-500 hover:bg-red-50 font-black py-3 px-4 rounded-xl shadow-sm transition-all uppercase text-[10px] tracking-widest flex items-center"
                              >
                                <RefreshCw className="w-4 h-4 mr-1.5" /> Undo Last
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                const stageActions = e2Pipeline.actions.filter(a => a.stage_id === currentStage.id).sort((a,b) => a.order - b.order);
                                const currentIdx = stageActions.findIndex(a => a.id === activeTask.id);
                                const nextTask = currentIdx < stageActions.length - 1 ? stageActions[currentIdx + 1] : null;
                                handleMarkComplete(selectedLead, activeTask, nextTask);
                              }}
                              className="bg-blue-600 text-white font-black py-3 px-6 rounded-xl shadow-md hover:bg-blue-700 transition-all uppercase text-[10px] tracking-widest flex items-center"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center">
                         <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                         <h4 className="text-sm font-black text-emerald-800 uppercase tracking-widest">All Drops Complete</h4>
                         <p className="text-xs font-medium text-emerald-600 mt-2 mb-6">This lead has finished the "{currentStage.name}" sequence.</p>
                         
                         <div className="flex justify-center gap-4">
                           {lastCompletedTask && (
                              <button onClick={() => handleUndoAction(selectedLead, lastCompletedTask)} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-black py-2.5 px-5 rounded-xl shadow-sm transition-all uppercase text-[10px] tracking-widest flex items-center">
                                <RefreshCw className="w-4 h-4 mr-2" /> Undo Final Action
                              </button>
                           )}
                           <button 
                             onClick={() => {
                               const currentIdx = e2Pipeline.stages.findIndex(s => s.id === currentStage.id);
                               if (currentIdx > -1 && currentIdx < e2Pipeline.stages.length - 1) {
                                 handleStageChange(selectedLead.id, e2Pipeline.stages[currentIdx + 1].name);
                               } else {
                                 alert("They have completed the final E2 stage!");
                               }
                             }}
                             className="bg-emerald-600 text-white font-black py-2.5 px-6 rounded-xl shadow-md hover:bg-emerald-700 transition-all uppercase text-[10px] tracking-widest flex items-center"
                           >
                             Advance to Next Stage <ArrowRight className="w-4 h-4 ml-2" />
                           </button>
                         </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-6 pb-10">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><FileText className="w-3 h-3 mr-1" /> Log Activity / Internal Notes</h4>
                    <form onSubmit={handleAddNote} className="flex flex-col sm:flex-row gap-4 flex-1">
                      <div className="w-full sm:w-1/3">
                        <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-600 outline-none focus:border-blue-400">
                          <option value="Internal Note">Internal Note</option>
                          <option value="WhatsApp">WhatsApp Message Sent</option>
                          <option value="Call">Phone Call</option>
                          <option value="Meeting">Meeting Completed</option>
                        </select>
                      </div>
                      <div className="w-full sm:w-2/3 flex flex-col gap-3">
                        <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Type E2 observation notes here..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-blue-400 min-h-[60px]"></textarea>
                        <button type="submit" disabled={!noteText.trim()} className="self-end bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-xl disabled:opacity-50 hover:bg-slate-700 transition-colors shadow-md">Save Log</button>
                      </div>
                    </form>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><FileText className="w-3 h-3 mr-1" /> The Lead Journey (E1 + E2 Audit Trail)</h4>
                    <div className="bg-white rounded-2xl p-5 max-h-[400px] overflow-y-auto border border-slate-200 shadow-sm">
                      {(!Array.isArray(selectedLead.logs) || selectedLead.logs.length === 0) ? <div className="py-12 text-center"><Inbox className="w-8 h-8 text-slate-200 mx-auto mb-3" /><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No activity logged yet.</p></div> : (
                        <div className="space-y-4">
                          {[...selectedLead.logs].reverse().map((log, i) => (
                            <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-4 group hover:border-blue-100 transition-colors">
                              <div className="mt-1 bg-white shadow-sm border border-slate-200 p-2 rounded-xl shrink-0">{getLogIcon(log.type)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1.5">
                                  <span className="font-black text-slate-800 text-xs truncate">{log.agent} <span className="text-slate-400 font-bold ml-1">({log.type})</span></span>
                                  <button type="button" onClick={() => handleDeleteLog(log.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 bg-white p-1.5 rounded-md border border-slate-200 shadow-sm"><Trash2 className="w-3 h-3" /></button>
                                </div>
                                <span className="text-slate-700 block mb-2 text-sm font-medium whitespace-pre-wrap break-words leading-relaxed">{log.text}</span>
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(log.date).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}