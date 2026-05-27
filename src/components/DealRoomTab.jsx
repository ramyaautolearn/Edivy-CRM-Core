import React, { useState, useEffect } from 'react';
import {
  Shield, RefreshCw, MapPin, Star, Flame, Zap, User, Phone, Send, Inbox, Calendar, FileText, CheckCircle, BookOpen, AlertCircle, PlayCircle, Trash2, Video, MessageCircle, Clock, Circle, ChevronDown, ChevronUp, Snowflake, Lock, Unlock, Link as LinkIcon, X, Search, Filter, FilterX
} from 'lucide-react';
import {
  collection, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

export default function DealRoomTab({ user, initialLeadId }) {
  const [leads, setLeads] = useState([]);
  const [crmUsers, setCrmUsers] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeadId || null);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('action_queue'); 
  
  // Note & Pipeline State
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('Internal Note'); 
  const [e1Pipeline, setE1Pipeline] = useState(null);
  const [vaultScripts, setVaultScripts] = useState([]);
  const [showVault, setShowVault] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(0); 
  const [unlockedTasks, setUnlockedTasks] = useState([]); 

  // Calendly State
  const [showCalendlyConfirm, setShowCalendlyConfirm] = useState(false);
  const [demoDateTime, setDemoDateTime] = useState(''); 

  // Bank Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterDateType, setFilterDateType] = useState('all');
  const [filterCustomDate, setFilterCustomDate] = useState('');
  const [filterSource, setFilterSource] = useState('all'); // NEW: For Resurrected

  const appId = 'edivy-crm-vault';
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!db || !user?.id) return;

    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
        if (!snap.empty) {
            setCrmUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
             onSnapshot(collection(db, 'users'), (rootSnap) => {
                 if (!rootSnap.empty) setCrmUsers(rootSnap.docs.map(d => ({ id: d.id, ...d.data() })));
             });
        }
    });

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

    const unsubScripts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'scripts'), (snap) => setVaultScripts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubLeads = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), (snap) => {
        const allFetchedLeads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        allFetchedLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
        setLeads(allFetchedLeads);
        setLoading(false);
    });

    return () => { unsubPipelines(); unsubScripts(); unsubLeads(); unsubUsers(); };
  }, [user]);

  useEffect(() => { setExpandedTaskId(0); setUnlockedTasks([]); setShowVault(false); setShowCalendlyConfirm(false); setDemoDateTime(''); }, [selectedLeadId]);

  const safeDateStr = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'object' && dateVal.seconds) return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
    if (typeof dateVal === 'string') return dateVal.split('T')[0];
    return '';
  };

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  // MAGIC FLAG CLEARER (For Disappearing Badges)
  const clearRecentMoveFlag = async () => {
    if (selectedLead?.recent_move) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), { recent_move: null });
    }
  };

  // --- LEAD OWNERSHIP ACTIONS ---
  const handleClaimLead = async (leadId) => {
    if (!window.confirm("Claim this lead for your Action Queue?")) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), {
      assigned_to: user?.id,
      logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Agent ${user?.name || 'Unknown'} claimed this unassigned lead.`, agent: user?.name || 'Agent' })
    });
    setActiveTab('action_queue');
  };

  const handleRequestTransfer = async (leadId, currentOwner) => {
    const reason = window.prompt(`Request transfer from current owner? Please provide a reason:`);
    if (!reason) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), {
      transfer_requested_by: user?.id,
      transfer_reason: reason,
      logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Transfer Requested by ${user?.name || 'Agent'}. Reason: ${reason}`, agent: user?.name || 'Agent' })
    });
    alert("Transfer request logged for Admin review!");
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedLeadId) return;
    await clearRecentMoveFlag();

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

  const handleSetFollowUp = async (dateStr) => {
    if (!selectedLeadId) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLeadId), { next_follow_up: dateStr || null, last_activity_at: serverTimestamp() });
  };

  const handleStageChange = async (newStageName) => {
    if (!selectedLeadId) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLeadId), {
      stage_name: newStageName,
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Jumped to Pipeline Stage: ${newStageName}`, agent: user?.name || 'Agent' })
    });
    setExpandedTaskId(0); setUnlockedTasks([]);
  };

  const toggleTaskCompletion = async (stageName, taskName) => {
    if (!selectedLead) return;
    await clearRecentMoveFlag();

    const taskKey = `${stageName}::${taskName}`;
    let currentCompleted = selectedLead.completed_tasks || [];
    const isCompleted = currentCompleted.includes(taskKey);
    let newCompleted = isCompleted ? currentCompleted.filter(k => k !== taskKey) : [...currentCompleted, taskKey];

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), {
      completed_tasks: newCompleted,
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: isCompleted ? `Unchecked Task: ${taskName}` : `Completed Task: ${taskName}`, agent: user?.name || 'Agent' })
    });
  };

  const handleForceUnlock = async (taskKey, taskName) => {
    if (!selectedLead || !window.confirm("Bypass pipeline sequence and unlock this task early?")) return;
    setUnlockedTasks(prev => [...prev, taskKey]);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), {
      logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Tactical Bypass: Force Unlocked Task "${taskName}" out of sequence.`, agent: user?.name || 'Agent' })
    });
    setExpandedTaskId(currentStageData?.tasks?.findIndex(t => `${currentStageData.name}::${t.name}` === taskKey));
  };

  const handleReLock = (taskKey) => { setUnlockedTasks(prev => prev.filter(k => k !== taskKey)); };

  const handleOpenCalendly = () => {
    const width = 1000; const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    window.open("https://calendly.com/ramya-autolearn/30min", "CalendlyBooking", `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);
    setShowCalendlyConfirm(true);
  };

  const handleConfirmCalendlyBooking = async () => {
    if (!selectedLead || !demoDateTime) return;
    await clearRecentMoveFlag();

    let updates = { 
      is_demo_booked: true, demo_date: demoDateTime, temperature: 'Hot', next_follow_up: today, 
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Action Completed: Meeting Booked for ${new Date(demoDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`, agent: user?.name || 'Agent' })
    };
    
    const demoStage = e1Pipeline?.stages?.find(s => s.name.toLowerCase().includes('demo') || s.name.toLowerCase().includes('meeting'))?.name;
    if (demoStage) updates.stage_name = demoStage;
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), updates);
    setShowCalendlyConfirm(false); setDemoDateTime(''); setExpandedTaskId(0); setUnlockedTasks([]); setActiveTab('demos');
  };

  const toggleDemoBooked = async () => {
    if (!selectedLead) return;
    await clearRecentMoveFlag();

    const isCurrentlyBooked = selectedLead.is_demo_booked;
    let updates = { 
      is_demo_booked: !isCurrentlyBooked, demo_date: !isCurrentlyBooked ? (selectedLead.demo_date || null) : null,
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: isCurrentlyBooked ? 'Action Reversed: Removed Demo Booked Status' : 'Action Completed: Manual Demo Booked', agent: user?.name || 'Agent' })
    };
    
    if (!isCurrentlyBooked) {
      updates.temperature = 'Hot'; updates.next_follow_up = today; 
      const demoStage = e1Pipeline?.stages?.find(s => s.name.toLowerCase().includes('demo') || s.name.toLowerCase().includes('meeting'))?.name;
      if (demoStage) updates.stage_name = demoStage;
    }
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), updates);
    if (!isCurrentlyBooked) setActiveTab('demos'); 
  };

  const ejectToE2 = async () => {
    if (!selectedLead || !window.confirm("Eject this lead from Active Sales to Engine 2 (Nurture)?")) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), {
      engine: 2, stage_name: 'Awakening (Entry)', temperature: 'Cold', next_follow_up: null, 
      recent_move: 'E1 to E2', // SET FLAG FOR BADGE
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Ejected Lead to Engine 2 (Nurture)`, agent: user?.name || 'Agent' })
    });
  };

  const toggleHotStatus = async () => {
    if (!selectedLead) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), { temperature: selectedLead.temperature === 'Hot' ? 'Warm' : 'Hot', last_activity_at: serverTimestamp() });
  };


  // ==========================================
  // DYNAMIC ACTION QUEUE CALCULATION
  // ==========================================
  const isLeadActionableToday = (lead) => {
      const manualDate = safeDateStr(lead.next_follow_up);
      if (manualDate && manualDate <= today) return true;

      if (lead.engine === 1 && lead.stage_name === 'New Lead') return true;
      if (lead.temperature === 'Hot') return true;

      if (!e1Pipeline || !e1Pipeline.stages) return false;
      const stage = e1Pipeline.stages.find(s => s.name === lead.stage_name);
      if (!stage) return false;

      const stageTasks = (e1Pipeline.tasks || []).filter(t => t.stage_id === stage.id).sort((a,b) => a.order - b.order);
      if (stageTasks.length === 0) return false;

      const completed = lead.completed_tasks || [];
      let firstUncompletedIdx = -1;
      
      for (let i = 0; i < stageTasks.length; i++) {
          if (!completed.includes(`${stage.name}::${stageTasks[i].name}`)) {
              firstUncompletedIdx = i;
              break;
          }
      }

      if (firstUncompletedIdx === -1) return false; 

      const activeTask = stageTasks[firstUncompletedIdx];
      let baseDate = null;

      if (firstUncompletedIdx === 0) {
          const stageLog = [...(lead.logs || [])].reverse().find(l => l.text.includes(`Jumped to Pipeline Stage`));
          baseDate = stageLog ? new Date(stageLog.date) : new Date();
      } else {
          const prevTaskName = stageTasks[firstUncompletedIdx - 1].name;
          const prevLog = [...(lead.logs || [])].reverse().find(l => l.text.includes(`Completed Task: ${prevTaskName}`));
          baseDate = prevLog ? new Date(prevLog.date) : new Date();
      }

      let delayMs = 0;
      if (activeTask.delay_value) {
          if (activeTask.delay_unit === 'minutes') delayMs = activeTask.delay_value * 60000;
          if (activeTask.delay_unit === 'hours') delayMs = activeTask.delay_value * 3600000;
          if (activeTask.delay_unit === 'days') delayMs = activeTask.delay_value * 86400000;
      }

      const exactDueDate = new Date(baseDate.getTime() + delayMs);
      const dueStr = exactDueDate.toISOString().split('T')[0];

      return dueStr <= today;
  };

  const myLeads = leads.filter(l => {
      if (l.engine === 2) return false; // Hide E2 leads from E1 Deal Room completely!
      if (!l.assigned_to || !user) return false;
      const assignedLower = String(l.assigned_to).toLowerCase();
      const userIdLower = String(user.id || '').toLowerCase();
      const userEmailLower = String(user.email || '').toLowerCase();
      return assignedLower === userIdLower || assignedLower === userEmailLower;
  });

  const actionQueueLeads = myLeads.filter(l => isLeadActionableToday(l) && !l.is_demo_booked); 
  const demoLeads = myLeads.filter(l => l.is_demo_booked);
  const resurrectedLeads = myLeads.filter(l => l.resurrected_from_e2 === true); // NEW: Resurrected
  
  let displayedLeads = [];
  if (activeTab === 'action_queue') displayedLeads = actionQueueLeads;
  else if (activeTab === 'demos') displayedLeads = demoLeads;
  else if (activeTab === 'resurrected') displayedLeads = resurrectedLeads;
  else if (activeTab === 'all') {
      displayedLeads = leads.filter(l => {
          if (l.engine === 2) return false; // Ensure E2 leads are hidden from Bank
          
          if (searchQuery) {
              const q = searchQuery.toLowerCase();
              const matchName = (l.school_name || '').toLowerCase().includes(q);
              const matchContact = (l.contact_name || '').toLowerCase().includes(q);
              const matchPhone = (l.phone || '').includes(q);
              if (!matchName && !matchContact && !matchPhone) return false;
          }
          if (filterOwner === 'unassigned') { if (l.assigned_to) return false; }
          else if (filterOwner === 'me') { 
              const aTo = String(l.assigned_to || '').toLowerCase();
              if (aTo !== String(user?.id || '').toLowerCase() && aTo !== String(user?.email || '').toLowerCase()) return false; 
          }
          else if (filterOwner !== 'all') { if (l.assigned_to !== filterOwner) return false; }
          
          if (filterStage !== 'all') {
              const lStage = l.stage_name || 'New Lead';
              if (lStage !== filterStage) return false;
          }

          const lDateStr = safeDateStr(l.next_follow_up);
          if (filterDateType === 'today') { if (lDateStr !== today) return false; }
          else if (filterDateType === 'overdue') { if (!lDateStr || lDateStr >= today) return false; }
          else if (filterDateType === 'custom') { if (!filterCustomDate || lDateStr !== filterCustomDate) return false; }
          
          if (filterSource === 'resurrected' && !l.resurrected_from_e2) return false; // NEW FILTER

          return true;
      });
  }

  const activeAssignedIds = [...new Set(leads.map(l => l.assigned_to).filter(Boolean))];
  const crmUserIds = crmUsers.map(u => u.id);
  const rawColleagueIds = [...new Set([...activeAssignedIds, ...crmUserIds])];
  const colleagueIds = rawColleagueIds.filter(id => id !== user?.id && id !== user?.email && id !== user?.name);

  const dropdownUsers = colleagueIds.map(id => {
      const crmU = crmUsers.find(u => u.id === id || u.uid === id || u.email === id);
      let displayName = `Agent: ${id.substring(0, 6)}...`;
      if (crmU) {
          let baseName = crmU.full_name || crmU.legal_name || crmU.name || (crmU.first_name ? `${crmU.first_name} ${crmU.last_name || ''}`.trim() : null) || crmU.email || displayName;
          displayName = crmU.badge_id ? `[${crmU.badge_id}] ${baseName}` : baseName;
      } else if (id.includes('@')) displayName = id.split('@')[0];
      return { id, display: displayName };
  });


  const isSelectedMine = selectedLead && (String(selectedLead.assigned_to).toLowerCase() === String(user?.id || '').toLowerCase() || String(selectedLead.assigned_to).toLowerCase() === String(user?.email || '').toLowerCase() || user?.role === 'admin');
  const isSelectedUnassigned = selectedLead && !selectedLead.assigned_to;
  const isSelectedColleague = selectedLead && !isSelectedMine && !isSelectedUnassigned;
  const isLockedDown = !isSelectedMine;

  const getCurrentStageData = () => {
    if (!selectedLead || !e1Pipeline || !e1Pipeline.stages) return null;
    const stage = e1Pipeline.stages.find(s => s.name === selectedLead.stage_name);
    if (!stage) return null;
    return { ...stage, tasks: (e1Pipeline.tasks || []).filter(t => t.stage_id === stage.id).sort((a,b) => a.order - b.order) };
  };

  const currentStageData = getCurrentStageData();
  const pipelineStages = (e1Pipeline && e1Pipeline.stages) ? e1Pipeline.stages.map(s => s.name) : [];
  const activeTask = currentStageData?.tasks?.[expandedTaskId];

  const getLogIcon = (type) => {
    if (type === 'WhatsApp') return <MessageCircle className="w-3 h-3 text-emerald-500" />;
    if (type === 'Call') return <Phone className="w-3 h-3 text-blue-500" />;
    if (type === 'Meeting') return <Video className="w-3 h-3 text-purple-500" />;
    if (type === 'System') return <Zap className="w-3 h-3 text-amber-500" />;
    return <FileText className="w-3 h-3 text-slate-400" />;
  };

  const getTaskDueDate = (task, idx) => {
    let baseDate = null;
    let isEstimated = false;

    if (idx === 0) {
      const stageLog = [...(selectedLead.logs || [])].reverse().find(l => l.text.includes(`Jumped to Pipeline Stage`));
      baseDate = stageLog ? new Date(stageLog.date) : new Date();
    } else {
      const prevTaskName = currentStageData.tasks[idx-1].name;
      const prevTaskKey = `${currentStageData.name}::${prevTaskName}`;
      const currentCompleted = selectedLead.completed_tasks || [];
      const isPrevCurrentlyCompleted = currentCompleted.includes(prevTaskKey);

      if (isPrevCurrentlyCompleted) {
        const prevLog = [...(selectedLead.logs || [])].reverse().find(l => l.text.includes(`Completed Task: ${prevTaskName}`));
        baseDate = prevLog ? new Date(prevLog.date) : new Date();
      } else {
        baseDate = new Date();
        isEstimated = true;
      }
    }

    let delayMs = 0;
    if (task.delay_value) {
      if (task.delay_unit === 'minutes') delayMs = task.delay_value * 60000;
      if (task.delay_unit === 'hours') delayMs = task.delay_value * 3600000;
      if (task.delay_unit === 'days') delayMs = task.delay_value * 86400000;
    }

    const dueDate = new Date(baseDate.getTime() + delayMs);
    const dateString = dueDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return isEstimated ? `Est: ${dateString}` : `Due: ${dateString}`;
  };

  const handleOpenWhatsApp = async (customScript = null) => {
    if (!selectedLead || isLockedDown) return;
    await clearRecentMoveFlag();

    let textToCopy = typeof customScript === 'string' ? customScript : '';
    if (!textToCopy && activeTask && activeTask.override_script) {
        textToCopy = activeTask.override_script;
    }
    
    const rawPhone = selectedLead.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, ''); 

    if (textToCopy) {
      textToCopy = textToCopy.replace(/{contact_name}/g, selectedLead.contact_name || 'there');
      try { await navigator.clipboard.writeText(textToCopy); } catch (err) {}
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else {
      alert("⚠️ Script Required: This task does not have a manual script configured. Please write manually in WhatsApp.");
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleVaultWhatsApp = async (scriptContent, scriptName) => {
    await handleOpenWhatsApp(scriptContent);
    setShowVault(false);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), {
        logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'WhatsApp', text: `Tactical Pivot: Used Vault Script [${scriptName}]`, agent: user?.name || 'Agent' }),
        last_activity_at: serverTimestamp()
      });
    } catch (e) {}
  };

  const clearAllFilters = () => {
      setSearchQuery(''); setFilterOwner('all'); setFilterStage('all'); setFilterDateType('all'); setFilterCustomDate(''); setFilterSource('all');
  };

  const isFilterActive = searchQuery || filterOwner !== 'all' || filterStage !== 'all' || filterDateType !== 'all' || filterSource !== 'all';

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden font-sans text-slate-800 relative w-full">
      <aside className="w-[320px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 h-full">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2 shrink-0">
          <button onClick={() => setActiveTab('action_queue')} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'action_queue' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300' }`}><span className="flex items-center"><Zap className="w-3.5 h-3.5 mr-2"/> Action Queue</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='action_queue'?'bg-white/20':'bg-slate-100'}`}>{actionQueueLeads.length}</span></button>
          <button onClick={() => setActiveTab('demos')} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'demos' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300' }`}><span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-2"/> Demos Booked</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='demos'?'bg-white/20':'bg-slate-100'}`}>{demoLeads.length}</span></button>
          <button onClick={() => setActiveTab('resurrected')} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'resurrected' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300' }`}><span className="flex items-center"><Flame className="w-3.5 h-3.5 mr-2"/> Resurrected (E2)</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='resurrected'?'bg-white/20':'bg-slate-100'}`}>{resurrectedLeads.length}</span></button>
          <button onClick={() => setActiveTab('all')} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300' }`}><span className="flex items-center"><Inbox className="w-3.5 h-3.5 mr-2"/> All Leads (Bank)</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='all'?'bg-white/20':'bg-slate-100'}`}>{leads.filter(l => l.engine !== 2).length}</span></button>
        </div>

        {activeTab === 'all' && (
            <div className="p-3 bg-white border-b border-slate-200 shrink-0 shadow-sm flex flex-col gap-2">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input type="text" placeholder="Search school, contact..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors" />
                    </div>
                    {isFilterActive && (
                        <button onClick={clearAllFilters} className="bg-red-50 text-red-600 hover:bg-red-100 px-2.5 rounded-lg flex items-center justify-center transition-colors shadow-sm" title="Clear Filters">
                            <FilterX className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold text-slate-600 outline-none uppercase tracking-wider cursor-pointer truncate">
                        <option value="all">Any Owner</option>
                        <option value="unassigned">Unassigned (Shark Tank)</option>
                        {user?.id && <option value="me">My Leads</option>}
                        {dropdownUsers.map(u => <option key={u.id} value={u.id}>{u.display}</option>)}
                    </select>
                    <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold text-slate-600 outline-none uppercase tracking-wider cursor-pointer">
                        <option value="all">Any Stage</option>
                        <option value="New Lead">New Lead</option>
                        {pipelineStages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <select value={filterDateType} onChange={(e) => setFilterDateType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold text-slate-600 outline-none uppercase tracking-wider cursor-pointer">
                        <option value="all">Any Date</option>
                        <option value="today">Due Today</option>
                        <option value="overdue">Overdue</option>
                        <option value="custom">Specific Date...</option>
                    </select>
                    <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold text-slate-600 outline-none uppercase tracking-wider cursor-pointer">
                        <option value="all">Any Source</option>
                        <option value="resurrected">E2 Resurrected Only</option>
                    </select>
                </div>
                {filterDateType === 'custom' && (
                    <input type="date" value={filterCustomDate} onChange={(e) => setFilterCustomDate(e.target.value)} className="w-full bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1.5 text-[9px] font-bold text-indigo-700 outline-none uppercase tracking-wider cursor-pointer" />
                )}
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
          {loading ? <div className="p-12 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div> : displayedLeads.length === 0 ? <div className="p-16 text-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] leading-relaxed"><Filter className="w-8 h-8 mx-auto mb-3 opacity-20" /> No Matches</div> : displayedLeads.map((l) => {
              const safeListDate = safeDateStr(l.next_follow_up);
              
              return (
              <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${ selectedLeadId === l.id ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-200' }`}>
                {l.assigned_to && l.assigned_to !== user?.id && l.assigned_to !== user?.email && <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>}
                {!l.assigned_to && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>}

                <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-sm tracking-tight text-slate-900 leading-tight pr-2 truncate">{l.school_name}</h4>{l.temperature === 'Hot' && <Flame className="w-4 h-4 text-orange-500 fill-current shrink-0" />}</div>
                
                {l.is_demo_booked && l.demo_date && (
                  <div className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center w-max px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                    <Calendar className="w-3 h-3 mr-1" /> {new Date(l.demo_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  </div>
                )}
                {!l.is_demo_booked && safeListDate && (
                  <div className={`text-[9px] font-black uppercase tracking-widest mb-2 flex items-center w-max px-2 py-0.5 rounded border ${safeListDate < today ? 'bg-red-50 text-red-600 border-red-200' : safeListDate === today ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    <Clock className="w-3 h-3 mr-1" /> Due: {safeListDate}
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100/50"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest truncate max-w-[120px] ${selectedLeadId === l.id ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{l.stage_name || 'New Lead'}</span><div className="text-[10px] font-black flex items-center text-indigo-600"><Star className="w-3 h-3 mr-1 fill-current" /> {l.score}</div></div>
              </div>
          )})}
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative overflow-hidden min-w-0 bg-white h-full">
        {!selectedLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50"><Zap className="w-20 h-20 mb-6 opacity-20" /><h2 className="text-xl font-black uppercase tracking-widest text-slate-300">Select Target</h2></div>
        ) : (
          <div className="flex flex-col h-full w-full animate-in fade-in duration-300 relative">
            
            {/* Render Safely Extracted Date (Only if NO demo booked) */}
            {!selectedLead.is_demo_booked && safeDateStr(selectedLead.next_follow_up) && safeDateStr(selectedLead.next_follow_up) <= today && (
              <div className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center shrink-0 shadow-sm z-20 ${safeDateStr(selectedLead.next_follow_up) < today ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-950'}`}><Clock className="w-4 h-4 mr-2" /> {safeDateStr(selectedLead.next_follow_up) < today ? `🚨 OVERDUE ACTION (Was due ${safeDateStr(selectedLead.next_follow_up)})` : '⚡ ACTION REQUIRED TODAY'}</div>
            )}

            {isSelectedUnassigned && (
               <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
                  <span className="text-emerald-800 text-[10px] uppercase tracking-widest font-black flex items-center"><Unlock className="w-4 h-4 mr-2 text-emerald-500"/> Shark Tank Lead: Unassigned (Viewing Only)</span>
                  <button onClick={() => handleClaimLead(selectedLead.id)} className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white px-5 py-2 rounded-lg text-[10px] uppercase tracking-widest font-black shadow-md flex items-center"><Shield className="w-3.5 h-3.5 mr-1.5"/> Claim to Unlock Workspace</button>
               </div>
            )}
            {isSelectedColleague && (
               <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
                  <span className="text-amber-800 text-[10px] uppercase tracking-widest font-black flex items-center"><Lock className="w-4 h-4 mr-2 text-amber-500"/> Assigned to Colleague (Viewing Only)</span>
                  <button onClick={() => handleRequestTransfer(selectedLead.id, selectedLead.assigned_to)} className="bg-white hover:bg-amber-100 transition-colors border border-amber-300 text-amber-700 px-5 py-2 rounded-lg text-[10px] uppercase tracking-widest font-black shadow-sm">Request Transfer</button>
               </div>
            )}

            {/* DEAL ROOM HEADER */}
            <header className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-start bg-white z-10 shadow-sm gap-4 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedLead.school_name}</h2>
                <div className="flex flex-wrap items-center mt-1.5 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <p className="flex items-center"><User className="w-4 h-4 mr-1 text-indigo-500" /> {selectedLead.contact_name}</p>
                  <p className="flex items-center"><Phone className="w-4 h-4 mr-1 text-indigo-500" /> {selectedLead.phone}</p>
                </div>
                
                {/* THE PINNED DEMO BADGE */}
                {selectedLead.is_demo_booked && selectedLead.demo_date && (
                  <div className="mt-3 inline-flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black uppercase tracking-widest rounded-lg shadow-sm mr-3">
                    <Calendar className="w-3.5 h-3.5 mr-2" />
                    Upcoming Demo: {new Date(selectedLead.demo_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                )}

                {/* THE RECENTLY MOVED BADGE (Disappears on work) */}
                {selectedLead.recent_move === 'E2 to E1' && (
                  <div className="mt-3 inline-flex items-center px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-600 text-[11px] font-black uppercase tracking-widest rounded-lg shadow-sm animate-pulse">
                    <Flame className="w-3.5 h-3.5 mr-2" /> RECENTLY MOVED: E2 TO E1
                  </div>
                )}
              </div>
              
              <div className="text-right flex gap-3 h-max">
                <button 
                  disabled={isLockedDown} 
                  onClick={handleOpenCalendly} 
                  className="px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-md transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-4 h-4 mr-2" /> Book Demo
                </button>
                <button 
                  disabled={isLockedDown} 
                  onClick={() => setShowVault(!showVault)} 
                  className="px-4 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BookOpen className="w-4 h-4 mr-2" /> Quick Vault Pivot
                </button>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                
                {/* Main Scrollable Workspace */}
                <div className={`flex-1 p-6 bg-slate-50 overflow-y-auto transition-opacity ${isLockedDown ? 'opacity-80' : ''}`}>
                  <div className="max-w-4xl mx-auto space-y-6">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Target Profile</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-2 gap-y-4 text-left">
                          <div className="flex flex-col gap-1"><span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tier:</span><span className="font-bold text-slate-800 text-xs break-words">{selectedLead.pc1 || 'N/A'}</span></div>
                          <div className="flex flex-col gap-1"><span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tech:</span><span className="font-bold text-slate-800 text-xs break-words">{selectedLead.pc2 || 'N/A'}</span></div>
                          <div className="flex flex-col gap-1"><span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Vision:</span><span className="font-bold text-slate-800 text-xs break-words">{selectedLead.pc3 || 'N/A'}</span></div>
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                        {selectedLead.temperature === 'Hot' && <div className="absolute top-0 left-0 w-full h-1 bg-orange-500"></div>}
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Edivy Score</h5>
                        <div className="text-4xl font-black text-indigo-600 tabular-nums leading-none tracking-tighter">{selectedLead.score || 0}</div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                        <h3 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center">
                          <PlayCircle className="w-4 h-4 mr-2 text-indigo-500" /> Stage Protocol & Execution
                        </h3>
                        <select value={selectedLead.stage_name || 'New Lead'} onChange={(e) => handleStageChange(e.target.value)} disabled={isLockedDown} className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          <option value="New Lead">0: New Lead (Unmapped)</option>
                          {pipelineStages.map(stageName => <option key={stageName} value={stageName}>{stageName}</option>)}
                        </select>
                      </div>
                      
                      {currentStageData && currentStageData.tasks && currentStageData.tasks.length > 0 ? (
                        <div className="mb-6 space-y-3">
                          {currentStageData.tasks.map((task, idx) => {
                            const taskKey = `${currentStageData.name}::${task.name}`;
                            const currentCompleted = selectedLead.completed_tasks || [];
                            const isCompleted = currentCompleted.includes(taskKey);

                            const prevTaskKey = idx > 0 ? `${currentStageData.name}::${currentStageData.tasks[idx-1].name}` : null;
                            const isPrevCompleted = idx === 0 || currentCompleted.includes(prevTaskKey);
                            
                            const isForceUnlocked = !isPrevCompleted && unlockedTasks.includes(taskKey);
                            const isSequenceLocked = !isPrevCompleted && !unlockedTasks.includes(taskKey) && !isCompleted;
                            const isEffectivelyLocked = isSequenceLocked || isLockedDown;
                            
                            const isExpanded = expandedTaskId === idx && !isSequenceLocked;
                            
                            const exactDueDate = getTaskDueDate(task, idx);

                            return (
                              <div key={idx} className={`border rounded-xl transition-all duration-200 overflow-hidden ${isEffectivelyLocked ? 'bg-slate-50/50 border-slate-200 opacity-70' : isCompleted ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className={`p-4 flex items-center justify-between ${isEffectivelyLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50/50'}`} onClick={() => !isEffectivelyLocked && setExpandedTaskId(isExpanded ? null : idx)}>
                                  <div className="flex items-center gap-3">
                                    <button disabled={isEffectivelyLocked} onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(currentStageData.name, task.name); }} className={`shrink-0 transition-colors ${isEffectivelyLocked ? 'text-slate-300' : isCompleted ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-indigo-400'}`}>
                                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                    </button>
                                    <span className={`font-black text-sm tracking-tight ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                      Task {idx + 1}: {task.name}
                                    </span>
                                    {!isCompleted && (
                                        <span className={`text-[9px] font-bold ml-2 hidden sm:inline-block border px-2 py-1 rounded-md shadow-sm ${exactDueDate.includes('Est:') ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                          {exactDueDate}
                                        </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {isSequenceLocked && !isLockedDown && (
                                       <button onClick={(e) => { e.stopPropagation(); handleForceUnlock(taskKey, task.name); }} className="text-[8px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 px-2.5 py-1.5 rounded shadow-sm transition-colors flex items-center">
                                          <Unlock className="w-3 h-3 mr-1" /> Force Unlock
                                       </button>
                                    )}
                                    {isForceUnlocked && !isCompleted && !isLockedDown && (
                                       <button onClick={(e) => { e.stopPropagation(); handleReLock(taskKey); }} className="text-[8px] font-black uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 px-2.5 py-1.5 rounded shadow-sm transition-colors flex items-center">
                                          <Lock className="w-3 h-3 mr-1" /> Re-Lock
                                       </button>
                                    )}
                                    {isSequenceLocked ? <Lock className="w-4 h-4 text-slate-300" /> : isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="p-4 pt-0 border-t border-slate-100/50 mt-2 bg-slate-50/30">
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm font-medium text-amber-900 shadow-inner flex items-start mb-4 mt-4">
                                      <AlertCircle className="w-5 h-5 mr-3 text-amber-500 shrink-0 mt-0.5" />
                                      <div><strong className="block text-[10px] uppercase tracking-widest mb-1 text-amber-600">Instructions</strong>{task.instructions}</div>
                                    </div>
                                    {task.override_script && (
                                      <div>
                                         <strong className="block text-[10px] uppercase tracking-widest mb-2 text-slate-400">Approved Manual Script</strong>
                                         <div className="bg-white p-4 rounded-2xl text-sm font-medium text-slate-700 border border-slate-200 shadow-inner whitespace-pre-wrap">{task.override_script.replace(/{contact_name}/g, selectedLead.contact_name || '')}</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-6 rounded-2xl text-sm font-bold text-slate-400 border border-slate-200 text-center uppercase tracking-widest mb-6">No Tasks Found. Please add tasks to this stage in the Pipeline Builder.</div>
                      )}
                      
                      <div className="flex flex-wrap gap-3 items-center border-t border-slate-100 pt-6">
                        <button onClick={() => handleOpenWhatsApp(null)} disabled={isLockedDown} className="bg-emerald-500 text-white font-black py-2.5 px-5 rounded-xl shadow-md hover:bg-emerald-600 transition-all uppercase text-[10px] tracking-widest flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
                          <Send className="w-4 h-4 mr-2" /> Send via WhatsApp
                        </button>
                        
                        {activeTask?.media_url && (
                            <button onClick={() => window.open(activeTask.media_url, '_blank')} className="bg-indigo-50 text-indigo-600 border border-indigo-200 font-black py-2.5 px-4 rounded-xl shadow-sm hover:bg-indigo-100 transition-all uppercase text-[10px] tracking-widest flex items-center">
                                <LinkIcon className="w-4 h-4 mr-1.5" /> View Media
                            </button>
                        )}
                        
                        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                        
                        <button onClick={toggleDemoBooked} disabled={isLockedDown} className={`px-4 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${selectedLead.is_demo_booked ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                          {selectedLead.is_demo_booked ? '❌ Cancel Demo' : '📅 Manual Demo Toggle'}
                        </button>

                        <button onClick={toggleHotStatus} disabled={isLockedDown} className={`px-4 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${selectedLead.temperature === 'Hot' ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-orange-50 hover:text-orange-600'}`}>
                          <Flame className={`w-3.5 h-3.5 mr-1.5 ${selectedLead.temperature === 'Hot' ? 'fill-current' : ''}`} /> {selectedLead.temperature === 'Hot' ? 'Remove Hot Flag' : 'Flag Hot'}
                        </button>
                        
                        <button onClick={ejectToE2} disabled={isLockedDown} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all uppercase tracking-widest shadow-sm flex items-center ml-auto disabled:opacity-50 disabled:cursor-not-allowed">
                          <Snowflake className="w-3.5 h-3.5 mr-1.5" /> Eject to E2
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6 pb-10">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><FileText className="w-3 h-3 mr-1" /> Log Activity / Notes</h4>
                        <form onSubmit={handleAddNote} className="flex flex-col sm:flex-row gap-4 flex-1">
                          <div className="w-full sm:w-1/3"><select value={noteType} onChange={(e) => setNoteType(e.target.value)} disabled={isLockedDown} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-400 disabled:opacity-50"><option value="Internal Note">Internal Note</option><option value="WhatsApp">WhatsApp Message Sent</option><option value="Call">Phone Call</option><option value="Meeting">Meeting Completed</option></select></div>
                          <div className="w-full sm:w-2/3 flex flex-col gap-3"><textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} disabled={isLockedDown} placeholder="Type details here..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-indigo-400 min-h-[60px] disabled:opacity-50"></textarea><button type="submit" disabled={!noteText.trim() || isLockedDown} className="self-end bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-xl disabled:opacity-50 hover:bg-slate-700 transition-colors shadow-md">Save Log</button></div>
                        </form>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-center justify-between">
                        <div className="flex-1"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center"><Calendar className="w-3 h-3 mr-1" /> Tactical Save-Point (Follow-Up)</h4><p className="text-xs font-medium text-slate-500">Set a date here to push this lead to the top of your Action Queue on the chosen day.</p></div>
                        <div className="flex flex-col w-full sm:w-auto items-center sm:items-end">
                          <input type="date" value={safeDateStr(selectedLead.next_follow_up)} disabled={isLockedDown} onChange={(e) => handleSetFollowUp(e.target.value)} className="w-full sm:w-[200px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                          {safeDateStr(selectedLead.next_follow_up) && !isLockedDown && <button onClick={() => handleSetFollowUp(null)} className="mt-2 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">Clear Save-Point</button>}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><Calendar className="w-3 h-3 mr-1" /> The Lead Journey (Audit Trail)</h4>
                        <div className="bg-white rounded-2xl p-5 max-h-[400px] overflow-y-auto border border-slate-200 shadow-sm">
                          {(!Array.isArray(selectedLead.logs) || selectedLead.logs.length === 0) ? <div className="py-12 text-center"><Inbox className="w-8 h-8 text-slate-200 mx-auto mb-3" /><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No activity logged yet.</p></div> : (
                            <div className="space-y-4">
                              {[...selectedLead.logs].reverse().map((log, i) => (
                                <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-4 group hover:border-indigo-100 transition-colors">
                                  <div className="mt-1 bg-white shadow-sm border border-slate-200 p-2 rounded-xl shrink-0">{getLogIcon(log.type)}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1.5"><span className="font-black text-slate-800 text-xs truncate">{log.agent} <span className="text-slate-400 font-bold ml-1">({log.type})</span></span>{!isLockedDown && <button type="button" onClick={() => handleDeleteLog(log.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 bg-white p-1.5 rounded-md border border-slate-200 shadow-sm"><Trash2 className="w-3 h-3" /></button>}</div>
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

                {/* CONSTRAINED VAULT DRAWER */}
                {showVault && !isLockedDown && (
                  <div className="w-[400px] h-full bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 animate-in slide-in-from-right duration-300 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20">
                    <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0 shadow-md">
                      <h3 className="font-black tracking-widest uppercase text-xs flex items-center"><BookOpen className="w-4 h-4 mr-2 text-purple-400" /> Tactical Vault Pivot</h3>
                      <button onClick={() => setShowVault(false)} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="p-4 bg-white border-b border-slate-200 shrink-0">
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Select a script below to override the current pipeline task. The system will copy it to your clipboard and open WhatsApp.
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {vaultScripts.length === 0 ? <div className="text-center p-8 text-xs font-bold text-slate-400 uppercase tracking-widest">Vault is Empty</div> : (
                        vaultScripts.map(script => {
                          const isRecommended = script.pc1 === 'Any' || script.pc1 === selectedLead?.pc1;
                          return (
                            <div key={script.id} className={`bg-white border rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${isRecommended ? 'border-purple-300 ring-2 ring-purple-50' : 'border-slate-200'}`}>
                              <div className="flex justify-between items-center mb-3">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${isRecommended ? 'text-purple-700 bg-purple-100' : 'text-slate-600 bg-slate-100'}`}>{script.message_type}</span>
                                {isRecommended && <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest flex items-center"><Star className="w-3 h-3 mr-1 fill-current" /> Recommended</span>}
                              </div>
                              <div className="text-sm font-medium text-slate-700 whitespace-pre-wrap mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                {(script?.content || '').replace(/{contact_name}/g, selectedLead?.contact_name || 'there')}
                              </div>
                              <button onClick={() => handleVaultWhatsApp(script.content, script.message_type)} className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg flex items-center justify-center shadow-sm">
                                <Send className="w-3.5 h-3.5 mr-1.5" /> Pivot & Send
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* CALENDLY DATE/TIME CONFIRMATION MODAL */}
                {showCalendlyConfirm && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 text-center border border-slate-200 relative">
                      <button onClick={() => setShowCalendlyConfirm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                      
                      <Calendar className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                      <h3 className="text-xl font-black text-slate-800 mb-2">Log the Demo</h3>
                      <p className="text-sm font-medium text-slate-500 mb-6">If you successfully booked a time in the pop-up window, select that date and time below to pin it to this profile.</p>
                      
                      <div className="text-left mb-6">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Agreed Demo Date & Time</label>
                        <input 
                          type="datetime-local" 
                          value={demoDateTime}
                          onChange={(e) => setDemoDateTime(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer shadow-inner"
                        />
                      </div>

                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={handleConfirmCalendlyBooking} 
                          disabled={!demoDateTime}
                          className="w-full px-5 py-3.5 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md hover:bg-emerald-600 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4 mr-2"/> Confirm Booking
                        </button>
                        <button onClick={() => setShowCalendlyConfirm(false)} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-colors">
                          Cancel / Didn't Book
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}