import React, { useState, useEffect } from 'react';
import {
  Shield, RefreshCw, MapPin, Star, Flame, Zap, User, Phone, Mail, Send, Inbox, Calendar, 
  FileText, CheckCircle, BookOpen, AlertCircle, PlayCircle, Trash2, Video, MessageCircle, 
  Clock, Circle, ChevronDown, ChevronUp, Snowflake, Lock, Unlock, Link as LinkIcon, X, 
  Search, Filter, FilterX, Brain, BrainCircuit, Edit3, FastForward, Bot, Sparkles, Loader2, GitBranch, Maximize, Minimize
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function DealRoomTab({ user, initialLeadId }) {
  const [leads, setLeads] = useState([]);
  const [crmUsers, setCrmUsers] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeadId || null);
  const [loading, setLoading] = useState(true);
  
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState('action_queue'); 
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false); 
  
  // Note & Pipeline State
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('Internal Note'); 
  const [e1Pipeline, setE1Pipeline] = useState(null);
  const [vaultScripts, setVaultScripts] = useState([]);
  const [expandedTaskId, setExpandedTaskId] = useState(0); 
  const [unlockedTasks, setUnlockedTasks] = useState([]); 

  // Contact Info Editing
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Calendly State
  const [showCalendlyConfirm, setShowCalendlyConfirm] = useState(false);
  const [demoDateTime, setDemoDateTime] = useState(''); 

  // Branching & AI State
  const [pendingOutcomeTask, setPendingOutcomeTask] = useState(null);
  const [generatingTaskId, setGeneratingTaskId] = useState(null);
  const [generatedDrafts, setGeneratedDrafts] = useState({});

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterDateType, setFilterDateType] = useState('all');
  const [filterCustomDate, setFilterCustomDate] = useState('');
  const [filterSource, setFilterSource] = useState('all');

  const appId = 'edivy-crm-vault';
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!db || !user?.id) return;

    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
        if (!snap.empty) setCrmUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        else onSnapshot(collection(db, 'users'), (rootSnap) => { if (!rootSnap.empty) setCrmUsers(rootSnap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    });

    const pipelineRef = doc(db, 'artifacts', appId, 'public', 'data', 'pipelines', 'active'); 
    const unsubPipelines = onSnapshot(pipelineRef, (docSnap) => {
        if (docSnap.exists()) setE1Pipeline(docSnap.data());
        else onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'pipelines'), (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (docs.length > 0) setE1Pipeline(docs[0]); 
        });
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

  // RESET STATES WHEN SWITCHING LEADS
  useEffect(() => { 
    setExpandedTaskId(0); 
    setUnlockedTasks([]); 
    setShowVault(false); 
    setShowBriefing(false); 
    setShowCalendlyConfirm(false); 
    setDemoDateTime(''); 
    setIsEditingInfo(false); 
    setPendingOutcomeTask(null);
  }, [selectedLeadId]);

  // ==========================================
  // UTILITIES
  // ==========================================
  const safeDateStr = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'object' && dateVal.seconds) return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
    if (typeof dateVal === 'string') return dateVal.split('T')[0];
    return '';
  };

  const safeLower = (val) => String(val || '').toLowerCase();
  
  const formatScriptText = (text, leadContext) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/{contact_name}/g, leadContext?.contact_name || leadContext?.decision_maker || 'there');
  };

  const formatActionLabel = (actionStr) => {
    if (!actionStr || typeof actionStr !== 'string') return 'Unknown Action';
    return actionStr.replace(/_/g, ' ');
  };

  const getLogIcon = (type) => {
    if (type === 'WhatsApp') return <MessageCircle className="w-3 h-3 text-emerald-500" />;
    if (type === 'Call') return <Phone className="w-3 h-3 text-blue-500" />;
    if (type === 'Meeting') return <Video className="w-3 h-3 text-purple-500" />;
    if (type === 'System') return <Zap className="w-3 h-3 text-amber-500" />;
    return <FileText className="w-3 h-3 text-slate-400" />;
  };

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  // ==========================================
  // CORE ACTIONS
  // ==========================================
  const clearRecentMoveFlag = async () => { if (selectedLead?.recent_move) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), { recent_move: null }); };

  const handleClaimLead = async (leadId) => {
    if (!window.confirm("Claim this lead for your Action Queue?")) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), { assigned_to: user?.id, logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Agent ${user?.name || 'Unknown'} claimed lead.`, agent: user?.name || 'Agent' }) });
    setActiveTab('action_queue');
  };

  const handleRequestTransfer = async (leadId) => {
    const reason = window.prompt(`Request transfer from current owner? Reason:`);
    if (!reason) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), { transfer_requested_by: user?.id, transfer_reason: reason, logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Transfer Requested: ${reason}`, agent: user?.name || 'Agent' }) });
    alert("Transfer request logged for Admin review!");
  };

  const handleSaveContactInfo = async () => {
    if (!selectedLead) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), { contact_name: editName, phone: editPhone, email: editEmail, last_activity_at: serverTimestamp(), logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Agent updated contact info.`, agent: user?.name || 'Agent' }) });
    setIsEditingInfo(false);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedLeadId) return;
    await clearRecentMoveFlag();
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLeadId), { logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: noteType, text: noteText, agent: user?.name || 'Agent' }), last_activity_at: serverTimestamp() });
    setNoteText(''); setNoteType('Internal Note');
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
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLeadId), { stage_name: newStageName, last_activity_at: serverTimestamp(), logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Jumped to Pipeline Stage: ${newStageName}`, agent: user?.name || 'Agent' }) });
    setExpandedTaskId(0); setUnlockedTasks([]);
  };

  const handleUpdateInsight = async (insightKey, value) => {
    if (!selectedLead) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), {
      [`insights.${insightKey}`]: value
    });
  };

  const handleFastTrack = async (fastTrackConfig) => {
    if (!selectedLead || !fastTrackConfig.target_stage_id) return;
    if (!window.confirm(`Trigger Fast-Track: "${fastTrackConfig.trigger}"?`)) return;
    const targetStage = e1Pipeline?.stages?.find(s => s.id === fastTrackConfig.target_stage_id);
    if (targetStage) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), { 
        stage_name: targetStage.name, last_activity_at: serverTimestamp(), 
        logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `⚡ FAST-TRACK: [${fastTrackConfig.trigger}] Jumped to ${targetStage.name}`, agent: user?.name || 'Agent' }) 
      });
      setExpandedTaskId(0); setUnlockedTasks([]);
    }
  };

  const toggleTaskCompletion = async (stageName, taskName, additionalLog = null) => {
    if (!selectedLead) return;
    await clearRecentMoveFlag();
    const taskKey = `${stageName}::${taskName}`;
    let currentCompleted = selectedLead.completed_tasks || [];
    const isCompleted = currentCompleted.includes(taskKey);
    let newCompleted = isCompleted ? currentCompleted.filter(k => k !== taskKey) : [...currentCompleted, taskKey];
    const logText = additionalLog ? `Completed Task: ${taskName} (${additionalLog})` : (isCompleted ? `Unchecked Task: ${taskName}` : `Completed Task: ${taskName}`);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), {
      completed_tasks: newCompleted, last_activity_at: serverTimestamp(),
      logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: logText, agent: user?.name || 'Agent' })
    });
  };

  const initiateTaskCompletion = (task) => {
    const taskName = task.name || task.title;
    const taskKey = `${currentStageData?.name}::${taskName}`;
    const isCompleted = (selectedLead.completed_tasks || []).includes(taskKey);
    if (isCompleted) toggleTaskCompletion(currentStageData.name, taskName);
    else if (Array.isArray(task.outcomes) && task.outcomes.length > 0) setPendingOutcomeTask(task);
    else toggleTaskCompletion(currentStageData.name, taskName);
  };

  // --- UPDATED BRANCHING EXECUTION LOGIC ---
  const executeOutcome = async (outcome) => {
    const task = pendingOutcomeTask;
    setPendingOutcomeTask(null);
    await toggleTaskCompletion(currentStageData.name, task.name || task.title, `Outcome: ${outcome.label}`);

    if (outcome.action === 'jump_stage') {
      const targetStage = e1Pipeline?.stages?.find(s => s.id === outcome.target_stage_id);
      if (targetStage) await handleStageChange(targetStage.name);
    } 
    else if (outcome.action === 'jump_task') {
      const targetTaskId = outcome.target_task_id;
      if (targetTaskId && currentStageData && currentStageData.tasks) {
          const targetTaskIndex = currentStageData.tasks.findIndex(t => t.id === targetTaskId);
          const currentTaskIndex = currentStageData.tasks.findIndex(t => t.id === task.id);
          
          if (targetTaskIndex > -1 && targetTaskIndex > currentTaskIndex) {
              const keysToUnlock = [];
              for (let i = currentTaskIndex + 1; i <= targetTaskIndex; i++) {
                  const tToUnlock = currentStageData.tasks[i];
                  keysToUnlock.push(`${currentStageData.name}::${tToUnlock.name || tToUnlock.title}`);
              }
              setUnlockedTasks(prev => [...prev, ...keysToUnlock]);
              setExpandedTaskId(targetTaskIndex);
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), {
                logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `⚡ Branch Trigger: Skipped to Task "${currentStageData.tasks[targetTaskIndex].name || currentStageData.tasks[targetTaskIndex].title}"`, agent: user?.name || 'Agent' })
              });
          }
      }
    }
    else if (outcome.action === 'eject_e2') {
      await ejectToE2(`Branch Trigger: ${outcome.label}`);
    } 
    else if (outcome.action === 'kill') {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), {
        status: 'archived', archive_reason: `Rejected via Branch: ${outcome.label}`, last_activity_at: serverTimestamp(),
        logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Lead Killed (Trigger: ${outcome.label})`, agent: user?.name || 'Agent' })
      });
    }
  };

  const handleGenerateLiveDraft = async (task) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) return alert("Missing API Key! Ensure VITE_GROQ_API_KEY is active in your environment variables.");
    setGeneratingTaskId(task.id);

    try {
      const contextInsights = selectedLead.insights ? JSON.stringify(selectedLead.insights) : "None collected yet.";
      const prompt = `
        You are an elite B2B SaaS sales copywriter for Edivy (a premium CRM for schools).
        We are talking to: ${selectedLead.contact_name || 'the school leadership'}.
        CRITICAL STAGE CONTEXT: "${currentStageData?.stage_briefing_text || 'Standard follow up'}"
        AGENT'S GATHERED DATA ABOUT THIS SCHOOL: ${contextInsights}
        YOUR INSTRUCTIONS FOR THIS TASK: "${task.ai_guidance || 'Write a friendly, professional follow up.'}"

        Write a highly-converting, concise script based ONLY on this context. 
        It must sound human, consultative, and directly reference the insights provided if relevant.
        Provide ONLY the script text. No explanations.
      `;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{"role": "system", "content": prompt}], temperature: 0.7 })
      });

      if (!response.ok) throw new Error("API Connection Failed");
      const data = await response.json();
      const generatedScript = data.choices[0].message.content.trim();
      setGeneratedDrafts(prev => ({ ...prev, [task.id]: generatedScript }));
      
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), {
        logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Agent generated AI Draft for Task: ${task.name || task.title}`, agent: user?.name || 'Agent' })
      });
    } catch (error) {
      console.error("AI Error:", error);
      alert("Failed to generate AI script. Check your API Key and Network.");
    } finally {
      setGeneratingTaskId(null);
    }
  };

  const handleForceUnlock = async (taskKey, taskName) => {
    if (!selectedLead || !window.confirm("Bypass sequence and unlock this task early?")) return;
    setUnlockedTasks(prev => [...prev, taskKey]);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), { logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Tactical Bypass: Force Unlocked Task "${taskName}"`, agent: user?.name || 'Agent' }) });
    if (currentStageData?.tasks) setExpandedTaskId(currentStageData.tasks.findIndex(t => `${currentStageData.name}::${t.name || t.title}` === taskKey));
  };
  
  const handleReLock = (taskKey) => { setUnlockedTasks(prev => prev.filter(k => k !== taskKey)); };

  const handleOpenCalendly = () => {
    const w = 1000; const h = 700; const l = (window.innerWidth - w) / 2; const t = (window.innerHeight - h) / 2;
    window.open("https://calendly.com/ramya-autolearn/30min", "CalendlyBooking", `width=${w},height=${h},left=${l},top=${t},scrollbars=yes`);
    setShowCalendlyConfirm(true);
  };

  const handleConfirmCalendlyBooking = async () => {
    if (!selectedLead || !demoDateTime) return;
    await clearRecentMoveFlag();
    let updates = { is_demo_booked: true, demo_date: demoDateTime, temperature: 'Hot', next_follow_up: today, last_activity_at: serverTimestamp(), logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Meeting Booked for ${new Date(demoDateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`, agent: user?.name || 'Agent' }) };
    const demoStage = e1Pipeline?.stages?.find(s => safeLower(s.name).includes('demo') || safeLower(s.name).includes('meeting'))?.name;
    if (demoStage) updates.stage_name = demoStage;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), updates);
    setShowCalendlyConfirm(false); setDemoDateTime(''); setExpandedTaskId(0); setUnlockedTasks([]); setActiveTab('demos');
  };

  const toggleDemoBooked = async () => {
    if (!selectedLead) return;
    await clearRecentMoveFlag();
    const isCurrentlyBooked = selectedLead.is_demo_booked;
    let updates = { is_demo_booked: !isCurrentlyBooked, demo_date: !isCurrentlyBooked ? (selectedLead.demo_date || null) : null, last_activity_at: serverTimestamp(), logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: isCurrentlyBooked ? 'Action Reversed: Removed Demo Booked Status' : 'Action Completed: Manual Demo Booked', agent: user?.name || 'Agent' }) };
    if (!isCurrentlyBooked) {
      updates.temperature = 'Hot'; updates.next_follow_up = today; 
      const demoStage = e1Pipeline?.stages?.find(s => safeLower(s.name).includes('demo') || safeLower(s.name).includes('meeting'))?.name;
      if (demoStage) updates.stage_name = demoStage;
    }
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), updates);
    if (!isCurrentlyBooked) setActiveTab('demos'); 
  };

  const ejectToE2 = async (reason = "Manual Ejection") => {
    if (!selectedLead) return;
    if (reason === "Manual Ejection" && !window.confirm("Eject this lead to Engine 2 (Nurture)?")) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), { engine: 2, stage_name: 'Awakening (Entry)', temperature: 'Cold', next_follow_up: null, recent_move: 'E1 to E2', last_activity_at: serverTimestamp(), logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Ejected to Engine 2 (${reason})`, agent: user?.name || 'Agent' }) });
  };

  const ejectToE3Converted = async () => {
    if (!selectedLead || !window.confirm("🎉 CONVERSION: Move to Engine 3 (Client Success)?")) return;
    await clearRecentMoveFlag();
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), { engine: 3, stage_name: 'Financial & Welcome Activation', temperature: 'Client', is_demo_booked: false, is_setup_booked: false, next_follow_up: today, recent_move: 'E1 to E3', last_activity_at: serverTimestamp(), logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `🏆 DEAL WON: Ejected to Engine 3`, agent: user?.name || 'Agent' }) });
  };

  const toggleHotStatus = async () => {
    if (!selectedLead) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), { temperature: selectedLead.temperature === 'Hot' ? 'Warm' : 'Hot', last_activity_at: serverTimestamp() });
  };

  const handleOpenExternalAction = async (task = null, customScript = null) => {
    if (!selectedLead || isLockedDown) return;
    await clearRecentMoveFlag();

    let textToCopy = typeof customScript === 'string' ? customScript : '';
    if (!textToCopy && task) textToCopy = generatedDrafts[task.id] || task.override_script || task.resource_text || '';
    
    const rawPhone = String(selectedLead.phone || '');
    const cleanPhone = rawPhone.replace(/\D/g, ''); 
    const email = String(selectedLead.email || '');

    if (textToCopy && typeof textToCopy === 'string') {
      textToCopy = formatScriptText(textToCopy, selectedLead);
      try { await navigator.clipboard.writeText(textToCopy); } catch (err) {}
    }

    const taskType = safeLower(task?.action_type || task?.type || 'whatsapp');
    if (taskType === 'email') {
      if (!email) alert("⚠️ No email address found for this lead. Script copied to clipboard.");
      else window.open(`mailto:${email}?subject=Following Up&body=${encodeURIComponent(textToCopy)}`, '_blank');
    } else if (taskType === 'whatsapp') {
      if (!textToCopy) alert("⚠️ No script configured. Please write manually.");
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else if (taskType === 'call') {
      alert("📞 Call Action Required. Ensure you log the outcome.");
    }
  };

  const handleVaultWhatsApp = async (scriptContent, scriptName) => {
    await handleOpenExternalAction(null, scriptContent);
    setShowVault(false);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLead.id), {
        logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'WhatsApp', text: `Tactical Pivot: Used Vault Script [${scriptName}]`, agent: user?.name || 'Agent' }),
        last_activity_at: serverTimestamp()
      });
    } catch (e) {}
  };


  // ==========================================
  // PIPELINE QUEUE LOGIC
  // ==========================================
  const getNextActionForLead = (lead) => {
    try {
      if (!e1Pipeline || !Array.isArray(e1Pipeline.stages)) return null;
      const stage = e1Pipeline.stages.find(s => s.name === lead.stage_name);
      if (!stage) return null;
      const stageTasks = Array.isArray(e1Pipeline.tasks) 
        ? e1Pipeline.tasks.filter(t => t.stage_id === stage.id).sort((a,b) => (a.order || 0) - (b.order || 0)) 
        : [];
      if (stageTasks.length === 0) return null;
      const completed = lead.completed_tasks || [];
      return stageTasks.find(t => !completed.includes(`${stage.name}::${t.name || t.title}`)) || null;
    } catch (e) {
      return null;
    }
  };

  const isLeadActionableToday = (lead) => {
    try {
      if (!lead) return false;
      const manualDate = safeDateStr(lead.next_follow_up);
      if (manualDate && manualDate <= today) return true;
      if (lead.engine === 1 && lead.stage_name === 'New Lead') return true;
      if (lead.temperature === 'Hot') return true;
      
      const activeTask = getNextActionForLead(lead);
      if (!activeTask) return false;

      let baseDate = new Date(); 
      const stageLog = Array.isArray(lead.logs) ? [...lead.logs].reverse().find(l => String(l?.text || '').includes(`Jumped to Pipeline Stage`)) : null;
      if (stageLog && stageLog.date) baseDate = new Date(stageLog.date);
      if (isNaN(baseDate.getTime())) baseDate = new Date(); 
      
      let delayMs = 0;
      if (activeTask.delay_value) {
          if (activeTask.delay_unit === 'minutes') delayMs = activeTask.delay_value * 60000;
          if (activeTask.delay_unit === 'hours') delayMs = activeTask.delay_value * 3600000;
          if (activeTask.delay_unit === 'days') delayMs = activeTask.delay_value * 86400000;
      }
      
      const dueStr = new Date(baseDate.getTime() + delayMs).toISOString().split('T')[0];
      return dueStr <= today;
    } catch(e) {
      return false; 
    }
  };

  const getActionIcon = (actionType) => {
    const type = safeLower(actionType);
    if (type.includes('whatsapp')) return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
    if (type.includes('call')) return <Phone className="w-3.5 h-3.5 text-blue-500" />;
    if (type.includes('email')) return <Mail className="w-3.5 h-3.5 text-indigo-500" />;
    if (type.includes('research')) return <Search className="w-3.5 h-3.5 text-amber-500" />;
    return <Zap className="w-3.5 h-3.5 text-slate-400" />;
  };

  const myLeads = leads.filter(l => {
      if (l.engine === 2 || l.status === 'archived') return false; 
      if (!l.assigned_to || !user) return false;
      const a = safeLower(l.assigned_to);
      return a === safeLower(user.id) || a === safeLower(user.email);
  });

  const actionQueueLeads = myLeads.filter(l => isLeadActionableToday(l) && !l.is_demo_booked); 
  const demoLeads = myLeads.filter(l => l.is_demo_booked);
  const reActivationLeads = myLeads.filter(l => l.recent_move === 'E2 to E1'); 
  
  let displayedLeads = [];
  if (activeTab === 'action_queue') displayedLeads = actionQueueLeads;
  else if (activeTab === 'demos') displayedLeads = demoLeads;
  else if (activeTab === 'resurrected') displayedLeads = reActivationLeads;
  else if (activeTab === 'all') {
      displayedLeads = leads.filter(l => {
          if (l.engine === 2 || l.status === 'archived') return false; 
          
          if (searchQuery) {
              const q = safeLower(searchQuery);
              const matchSchool = safeLower(l.school_name).includes(q);
              const matchContact = safeLower(l.contact_name).includes(q);
              const matchPhone = safeLower(l.phone).includes(q);
              if (!matchSchool && !matchContact && !matchPhone) return false;
          }
          if (filterOwner === 'unassigned') { if (l.assigned_to) return false; }
          else if (filterOwner === 'me') { 
              const a = safeLower(l.assigned_to);
              if (a !== safeLower(user?.id) && a !== safeLower(user?.email)) return false; 
          }
          else if (filterOwner !== 'all') { if (l.assigned_to !== filterOwner) return false; }
          
          if (filterStage !== 'all' && (l.stage_name || 'New Lead') !== filterStage) return false;
          
          const lDateStr = safeDateStr(l.next_follow_up);
          if (filterDateType === 'today' && lDateStr !== today) return false;
          else if (filterDateType === 'overdue' && (!lDateStr || lDateStr >= today)) return false;
          else if (filterDateType === 'custom' && (!filterCustomDate || lDateStr !== filterCustomDate)) return false;
          
          if (filterSource === 'resurrected' && !l.resurrected_from_e2) return false; 
          return true;
      });
  }

  const activeAssignedIds = [...new Set(leads.map(l => l.assigned_to).filter(Boolean))];
  const colleagueIds = [...new Set([...activeAssignedIds, ...crmUsers.map(u => u.id)])].filter(id => id !== user?.id && id !== user?.email);
  const dropdownUsers = colleagueIds.map(id => {
      const crmU = crmUsers.find(u => u.id === id || u.email === id);
      return { id, display: crmU ? (crmU.name || crmU.email) : `Agent: ${String(id || '').substring(0, 6)}` };
  });

  const isSelectedMine = selectedLead && (safeLower(selectedLead.assigned_to) === safeLower(user?.id) || safeLower(selectedLead.assigned_to) === safeLower(user?.email) || user?.role === 'admin');
  const isSelectedUnassigned = selectedLead && !selectedLead.assigned_to;
  const isSelectedColleague = selectedLead && !isSelectedMine && !isSelectedUnassigned;
  const isLockedDown = !isSelectedMine;

  const getCurrentStageData = () => {
    if (!selectedLead || !e1Pipeline || !Array.isArray(e1Pipeline.stages)) return null;
    const stage = e1Pipeline.stages.find(s => s.name === selectedLead.stage_name);
    if (!stage) return null;
    return { ...stage, tasks: (e1Pipeline.tasks || []).filter(t => t.stage_id === stage.id).sort((a,b) => (a.order || 0) - (b.order || 0)) };
  };

  const currentStageData = getCurrentStageData();
  const pipelineStages = (e1Pipeline && Array.isArray(e1Pipeline.stages)) ? e1Pipeline.stages.map(s => s.name) : [];

  const isFilterActive = searchQuery !== '' || filterOwner !== 'all' || filterStage !== 'all' || filterDateType !== 'all' || filterSource !== 'all' || filterCustomDate !== '';

  const clearAllFilters = () => {
      setSearchQuery(''); setFilterOwner('all'); setFilterStage('all'); setFilterDateType('all'); setFilterCustomDate(''); setFilterSource('all');
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden font-sans text-slate-800 relative w-full">
      
      {/* SIDEBAR (Hides in Full Screen Mode) */}
      <aside className={`w-[320px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 h-full transition-all duration-300 ${isFullScreen ? 'hidden' : 'flex'}`}>
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2 shrink-0">
          <button onClick={() => setActiveTab('action_queue')} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'action_queue' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300' }`}><span className="flex items-center"><Zap className="w-3.5 h-3.5 mr-2"/> Action Queue</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='action_queue'?'bg-white/20':'bg-slate-100'}`}>{actionQueueLeads.length}</span></button>
          <button onClick={() => setActiveTab('demos')} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'demos' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300' }`}><span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-2"/> Demos Booked</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='demos'?'bg-white/20':'bg-slate-100'}`}>{demoLeads.length}</span></button>
          <button onClick={() => setActiveTab('resurrected')} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'resurrected' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-300' }`}><span className="flex items-center"><Flame className="w-3.5 h-3.5 mr-2"/> Re-Activations</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='resurrected'?'bg-white/20':'bg-slate-100'}`}>{reActivationLeads.length}</span></button>
          <button onClick={() => setActiveTab('all')} className={`py-2 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300' }`}><span className="flex items-center"><Inbox className="w-3.5 h-3.5 mr-2"/> All Leads (Bank)</span><span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='all'?'bg-white/20':'bg-slate-100'}`}>{leads.filter(l => l.engine !== 2 && l.status !== 'archived').length}</span></button>
        </div>

        {activeTab === 'all' && (
            <div className="p-3 bg-white border-b border-slate-200 shrink-0 shadow-sm flex flex-col gap-2">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input type="text" placeholder="Search school, contact..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400" />
                    </div>
                    {isFilterActive && (
                        <button onClick={clearAllFilters} className="bg-red-50 text-red-600 hover:bg-red-100 px-2.5 rounded-lg flex items-center justify-center transition-colors shadow-sm"><FilterX className="w-3.5 h-3.5" /></button>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold text-slate-600 outline-none uppercase tracking-wider cursor-pointer truncate">
                        <option value="all">Any Owner</option><option value="unassigned">Unassigned</option><option value="me">My Leads</option>
                        {dropdownUsers.map(u => <option key={u.id} value={u.id}>{u.display}</option>)}
                    </select>
                    <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold text-slate-600 outline-none uppercase tracking-wider cursor-pointer">
                        <option value="all">Any Stage</option><option value="New Lead">New Lead</option>
                        {pipelineStages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
          {loading ? <div className="p-12 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div> : displayedLeads.length === 0 ? <div className="p-16 text-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] leading-relaxed"><Filter className="w-8 h-8 mx-auto mb-3 opacity-20" /> No Matches</div> : displayedLeads.map((l) => {
              const safeListDate = safeDateStr(l.next_follow_up);
              const nextTask = getNextActionForLead(l);
              const nextActionType = nextTask?.action_type || nextTask?.type || 'none';
              const nextActionName = nextTask?.name || nextTask?.title || 'No Action Needed';

              return (
              <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${ selectedLeadId === l.id ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-200' }`}>
                {l.assigned_to && l.assigned_to !== user?.id && l.assigned_to !== user?.email && <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>}
                {!l.assigned_to && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>}

                <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-sm tracking-tight text-slate-900 leading-tight pr-2 truncate">{l.school_name}</h4>{l.temperature === 'Hot' && <Flame className="w-4 h-4 text-orange-500 fill-current shrink-0" />}</div>
                
                {l.is_demo_booked && l.demo_date && <div className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center w-max px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200"><Calendar className="w-3 h-3 mr-1" /> {new Date(l.demo_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</div>}
                {!l.is_demo_booked && safeListDate && <div className={`text-[9px] font-black uppercase tracking-widest mb-2 flex items-center w-max px-2 py-0.5 rounded border ${safeListDate < today ? 'bg-red-50 text-red-600 border-red-200' : safeListDate === today ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}><Clock className="w-3 h-3 mr-1" /> Due: {safeListDate}</div>}
                
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100/50">
                   <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest truncate max-w-[120px] ${selectedLeadId === l.id ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{l.stage_name || 'New Lead'}</span>
                   <div className="text-[10px] font-black flex items-center text-indigo-600"><Star className="w-3 h-3 mr-1 fill-current" /> {l.score || 0}</div>
                </div>

                {!l.is_demo_booked && nextActionType !== 'none' && (
                  <div className="mt-2 pt-2 border-t border-slate-100/50 flex items-center">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest text-slate-500 w-full">
                       {getActionIcon(nextActionType)}
                       <span className="truncate flex-1">{nextActionName}</span>
                    </div>
                  </div>
                )}
              </div>
          )})}
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-w-0 bg-white h-full">
        {!selectedLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50"><Zap className="w-20 h-20 mb-6 opacity-20" /><h2 className="text-xl font-black uppercase tracking-widest text-slate-300">Select Target</h2></div>
        ) : (
          <div className="flex flex-col h-full w-full animate-in fade-in duration-300 relative">
            
            {isSelectedUnassigned && (
               <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
                  <span className="text-emerald-800 text-[10px] uppercase tracking-widest font-black flex items-center"><Unlock className="w-4 h-4 mr-2 text-emerald-500"/> Shark Tank Lead: Unassigned (Viewing Only)</span>
                  <button onClick={() => handleClaimLead(selectedLead.id)} className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white px-5 py-2 rounded-lg text-[10px] uppercase tracking-widest font-black shadow-md flex items-center"><Shield className="w-3.5 h-3.5 mr-1.5"/> Claim to Unlock Workspace</button>
               </div>
            )}
            {isSelectedColleague && (
               <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
                  <span className="text-amber-800 text-[10px] uppercase tracking-widest font-black flex items-center"><Lock className="w-4 h-4 mr-2 text-amber-500"/> Assigned to Colleague (Viewing Only)</span>
                  <button onClick={() => handleRequestTransfer(selectedLead.id)} className="bg-white hover:bg-amber-100 transition-colors border border-amber-300 text-amber-700 px-5 py-2 rounded-lg text-[10px] uppercase tracking-widest font-black shadow-sm">Request Transfer</button>
               </div>
            )}

            {/* DEAL ROOM HEADER & CONTACT INFO */}
            <header className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-start bg-white z-10 shadow-sm gap-4 shrink-0 relative">
              
              <button 
                onClick={() => setIsFullScreen(!isFullScreen)} 
                className="absolute top-6 right-6 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 p-2 rounded-lg transition-colors shadow-sm z-20"
                title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen Focus Mode"}
              >
                {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>

              <div className="pr-12">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedLead.school_name}</h2>
                
                {isEditingInfo ? (
                  <div className="flex flex-wrap items-center mt-2 gap-2">
                    <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Contact Name" className="text-xs font-bold text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500 w-40" />
                    <input type="text" value={editPhone} onChange={e=>setEditPhone(e.target.value)} placeholder="Phone Number" className="text-xs font-bold text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500 w-32" />
                    <input type="email" value={editEmail} onChange={e=>setEditEmail(e.target.value)} placeholder="Email Address" className="text-xs font-bold text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg outline-none focus:border-indigo-500 w-48" />
                    <button onClick={handleSaveContactInfo} className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-lg uppercase font-black tracking-widest hover:bg-indigo-700 transition-colors shadow-sm">Save</button>
                    <button onClick={() => setIsEditingInfo(false)} className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1.5 rounded-lg uppercase font-black tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center mt-1.5 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <p className="flex items-center"><User className="w-4 h-4 mr-1 text-indigo-500" /> {selectedLead.contact_name || selectedLead.decision_maker || 'Unknown Contact'}</p>
                    <p className="flex items-center"><Phone className="w-4 h-4 mr-1 text-indigo-500" /> {selectedLead.phone || 'No Phone'}</p>
                    <p className="flex items-center"><Mail className="w-4 h-4 mr-1 text-indigo-500" /> {selectedLead.email || 'No Email'}</p>
                    {!isLockedDown && <button onClick={() => { setEditName(selectedLead.contact_name || selectedLead.decision_maker || ''); setEditPhone(selectedLead.phone || ''); setEditEmail(selectedLead.email || ''); setIsEditingInfo(true); }} className="text-indigo-400 hover:text-indigo-600 transition-colors flex items-center bg-indigo-50 px-2 py-0.5 rounded ml-2"><Edit3 className="w-3 h-3 mr-1" /> Edit</button>}
                  </div>
                )}
              </div>
              
              <div className="text-right flex gap-3 h-max mt-4 sm:mt-0 pr-12 sm:pr-0">
                <button disabled={isLockedDown} onClick={handleOpenCalendly} className="px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-md transition-colors flex items-center disabled:opacity-50">
                  <Calendar className="w-4 h-4 mr-2" /> Book Demo
                </button>
                <button disabled={isLockedDown} onClick={() => { setShowBriefing(false); setShowVault(!showVault); }} className="px-4 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm transition-colors flex items-center disabled:opacity-50">
                  <BookOpen className="w-4 h-4 mr-2" /> Quick Vault Pivot
                </button>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                <div className={`flex-1 p-6 bg-slate-50 overflow-y-auto transition-opacity ${isLockedDown ? 'opacity-80' : ''}`}>
                  <div className="max-w-4xl mx-auto space-y-6">
                    
                    {/* E0 AI INTELLIGENCE */}
                    {selectedLead.ai_brief && (
                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4 border-b border-slate-800 pb-4">
                          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center"><BrainCircuit className="w-4 h-4 mr-2" /> E0 Artificial Intelligence</h3>
                          <div className="flex gap-2">
                             <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center"><Zap className="w-3 h-3 mr-1" /> {selectedLead.growth_probability || 'Medium'} Prob</span>
                             <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest">PP Score: {selectedLead.ai_score || 'N/A'}</span>
                          </div>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed font-medium mb-5">{selectedLead.ai_brief}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800"><span className="text-slate-500 text-[8px] font-black uppercase tracking-widest block mb-1">Decision Maker</span><span className="text-white font-bold text-xs flex items-center"><User className="w-3 h-3 mr-1.5 text-slate-400"/> {selectedLead.decision_maker || 'Owner / Director'}</span></div>
                          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800"><span className="text-slate-500 text-[8px] font-black uppercase tracking-widest block mb-1">Admissions Campaign</span><span className="text-white font-bold text-xs flex items-center">{selectedLead.admissions_active ? <><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" /> Active Signals</> : <><span className="w-2 h-2 rounded-full bg-slate-600 mr-1.5" /> Passive</>}</span></div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
                      
                      {/* UNIVERSAL CONTEXT ENGINE */}
                      {Array.isArray(currentStageData?.required_insights) && currentStageData.required_insights.length > 0 && !isLockedDown && (
                        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 mb-6 shadow-sm">
                          <h4 className="text-amber-900 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2 text-amber-500" /> Required Context Insights
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {currentStageData.required_insights.map(insight => (
                              <div key={insight}>
                                <label className="block text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">{insight}</label>
                                <input
                                  type="text"
                                  value={selectedLead?.insights?.[insight] || ''}
                                  onChange={(e) => handleUpdateInsight(insight, e.target.value)}
                                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all shadow-sm"
                                  placeholder="Enter value..."
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                        <h3 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center">
                          <PlayCircle className="w-4 h-4 mr-2 text-indigo-500" /> Stage Protocol & Execution
                        </h3>
                        
                        <div className="flex items-center gap-3">
                          {currentStageData?.stage_briefing_text && (
                              <button onClick={() => { setShowVault(false); setShowBriefing(!showBriefing); }} disabled={isLockedDown} className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center shadow-sm disabled:opacity-50 ${showBriefing ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'}`}>
                                <Brain className={`w-3.5 h-3.5 mr-1.5 ${showBriefing ? 'text-indigo-200' : 'text-indigo-500'}`} /> Briefing
                              </button>
                          )}

                          {/* FAST TRACK GOD BUTTON */}
                          {Array.isArray(currentStageData?.fast_tracks) && currentStageData.fast_tracks.length > 0 && !isLockedDown && (
                            <div className="relative group">
                              <button className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center shadow-sm transition-colors">
                                <FastForward className="w-3.5 h-3.5 mr-1.5" /> Fast Track
                              </button>
                              <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-xl p-2 hidden group-hover:block z-50">
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2 pt-1">Select Trigger Event</div>
                                {currentStageData.fast_tracks.map((ft, idx) => (
                                  <button key={idx} onClick={() => handleFastTrack(ft)} className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 text-sm font-bold text-slate-700 hover:text-emerald-700 rounded-lg transition-colors flex items-center">
                                    <Zap className="w-3 h-3 mr-2 text-emerald-500" /> {ft.trigger}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <select value={selectedLead.stage_name || 'New Lead'} onChange={(e) => handleStageChange(e.target.value)} disabled={isLockedDown} className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none uppercase tracking-widest cursor-pointer hover:bg-slate-100 disabled:opacity-50">
                            <option value="New Lead">0: New Lead (Unmapped)</option>
                            {pipelineStages.map(stageName => <option key={stageName} value={stageName}>{stageName}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      {currentStageData && Array.isArray(currentStageData.tasks) && currentStageData.tasks.length > 0 ? (
                        <div className="mb-6 space-y-3">
                          {currentStageData.tasks.map((task, idx) => {
                            const taskKey = `${currentStageData.name}::${task.name || task.title}`;
                            const currentCompleted = selectedLead.completed_tasks || [];
                            const isCompleted = currentCompleted.includes(taskKey);

                            const prevTaskKey = idx > 0 ? `${currentStageData.name}::${currentStageData.tasks[idx-1].name || currentStageData.tasks[idx-1].title}` : null;
                            const isPrevCompleted = idx === 0 || currentCompleted.includes(prevTaskKey);
                            const isForceUnlocked = !isPrevCompleted && unlockedTasks.includes(taskKey);
                            const isSequenceLocked = !isPrevCompleted && !unlockedTasks.includes(taskKey) && !isCompleted;
                            const isEffectivelyLocked = isSequenceLocked || isLockedDown;
                            const isExpanded = expandedTaskId === idx && !isSequenceLocked;

                            return (
                              <div key={idx} className={`border rounded-xl transition-all duration-200 overflow-hidden ${isEffectivelyLocked ? 'bg-slate-50/50 border-slate-200 opacity-70' : isCompleted ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className={`p-4 flex items-center justify-between ${isEffectivelyLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50/50'}`} onClick={() => !isEffectivelyLocked && setExpandedTaskId(isExpanded ? null : idx)}>
                                  <div className="flex items-center gap-3">
                                    <button disabled={isEffectivelyLocked} onClick={(e) => { e.stopPropagation(); initiateTaskCompletion(task); }} className={`shrink-0 transition-colors ${isEffectivelyLocked ? 'text-slate-300' : isCompleted ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-indigo-400'}`}>
                                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                    </button>
                                    <span className={`font-black text-sm tracking-tight flex items-center ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                      Task {idx + 1}: {task.name || task.title}
                                      {Array.isArray(task.outcomes) && task.outcomes.length > 0 && <GitBranch className={`w-3.5 h-3.5 ml-2 ${isCompleted ? 'text-slate-300' : 'text-blue-500'}`} title="Branching Task" />}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {isSequenceLocked && !isLockedDown && <button onClick={(e) => { e.stopPropagation(); handleForceUnlock(taskKey, task.name || task.title); }} className="text-[8px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 px-2.5 py-1.5 rounded flex items-center"><Unlock className="w-3 h-3 mr-1" /> Force</button>}
                                    {isSequenceLocked ? <Lock className="w-4 h-4 text-slate-300" /> : isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="p-4 pt-0 border-t border-slate-100/50 mt-2 bg-slate-50/30">
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm font-medium text-amber-900 shadow-inner flex items-start mb-4 mt-4">
                                      <AlertCircle className="w-5 h-5 mr-3 text-amber-500 shrink-0 mt-0.5" />
                                      <div><strong className="block text-[10px] uppercase tracking-widest mb-1 text-amber-600">Instructions</strong>{task.instructions || task.description}</div>
                                    </div>

                                    {/* UNIVERSAL AI DRAFTER & MANUAL SCRIPT SIDE-BY-SIDE */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 mt-4">
                                      
                                      {/* Left: Approved Manual Script */}
                                      <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
                                        <strong className="text-[10px] uppercase tracking-widest mb-3 text-slate-500 flex items-center">
                                          <User className="w-3.5 h-3.5 mr-1.5 text-slate-400"/> Approved Manual Script
                                        </strong>
                                        <div className="bg-white p-4 rounded-lg text-sm font-medium text-slate-700 border border-slate-200 shadow-inner whitespace-pre-wrap flex-1 min-h-[80px]">
                                          {task.override_script || task.resource_text ? 
                                            formatScriptText(task.override_script || task.resource_text, selectedLead)
                                            : <span className="text-slate-400 italic font-medium">No manual fallback script provided.</span>}
                                        </div>
                                      </div>

                                      {/* Right: AI Auto-Pilot Drafter */}
                                      <div className="bg-purple-50/40 border border-purple-200 rounded-xl p-4 shadow-sm flex flex-col">
                                        <div className="flex justify-between items-center mb-3">
                                          <strong className="text-[10px] font-black uppercase tracking-widest text-purple-800 flex items-center">
                                            <Bot className="w-3.5 h-3.5 mr-1.5 text-purple-500"/> AI Auto-Pilot Drafter
                                          </strong>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleGenerateLiveDraft(task); }} 
                                            disabled={generatingTaskId === task.id || isLockedDown}
                                            className="bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md shadow-sm transition-colors flex items-center disabled:opacity-50"
                                          >
                                            {generatingTaskId === task.id ? <><Loader2 className="w-3 h-3 animate-spin mr-1"/> Gen...</> : <><Sparkles className="w-3 h-3 mr-1.5"/> Generate</>}
                                          </button>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg text-sm font-medium text-slate-700 border border-purple-100 shadow-inner whitespace-pre-wrap flex-1 min-h-[80px]">
                                          {generatedDrafts[task.id] ? formatScriptText(generatedDrafts[task.id], selectedLead) : <span className="text-slate-400 italic font-medium">Click generate for a context-aware script...</span>}
                                        </div>
                                      </div>

                                    </div>
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
                        <button onClick={() => handleOpenExternalAction(currentStageData?.tasks?.[expandedTaskId], null)} disabled={isLockedDown} className="bg-emerald-500 text-white font-black py-2.5 px-6 rounded-xl shadow-md hover:bg-emerald-600 transition-all uppercase text-[10px] tracking-widest flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
                          <Send className="w-4 h-4 mr-2" /> Execute Primary Action
                        </button>
                        
                        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                        
                        <button onClick={toggleDemoBooked} disabled={isLockedDown} className={`px-4 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${selectedLead.is_demo_booked ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                          {selectedLead.is_demo_booked ? '❌ Cancel Demo' : '📅 Manual Demo Toggle'}
                        </button>

                        <button onClick={toggleHotStatus} disabled={isLockedDown} className={`px-4 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${selectedLead.temperature === 'Hot' ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-orange-50 hover:text-orange-600'}`}>
                          <Flame className={`w-3.5 h-3.5 mr-1.5 ${selectedLead.temperature === 'Hot' ? 'fill-current' : ''}`} /> {selectedLead.temperature === 'Hot' ? 'Remove Hot Flag' : 'Flag Hot'}
                        </button>
                        
                        <div className="flex items-center gap-3 ml-auto">
                          <button onClick={() => ejectToE2()} disabled={isLockedDown} className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-all uppercase tracking-widest shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed">
                            <Snowflake className="w-3.5 h-3.5 mr-1.5" /> Eject to E2
                          </button>

                          <button onClick={ejectToE3Converted} disabled={isLockedDown} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black hover:bg-emerald-700 transition-all uppercase tracking-widest shadow-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-700">
                            <CheckCircle className="w-4 h-4 mr-2" /> Convert to E3
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* RESTORED BOTTOM SECTIONS: Activity Log, Follow-up, Audit Trail */}
                    <div className="flex flex-col gap-6 pb-10">
                      
                      {/* Note Logging Form */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><FileText className="w-3 h-3 mr-1" /> Log Activity / Notes</h4>
                        <form onSubmit={handleAddNote} className="flex flex-col sm:flex-row gap-4 flex-1">
                          <div className="w-full sm:w-1/3">
                            <select value={noteType} onChange={(e) => setNoteType(e.target.value)} disabled={isLockedDown} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-400 disabled:opacity-50">
                              <option value="Internal Note">Internal Note</option>
                              <option value="WhatsApp">WhatsApp Message Sent</option>
                              <option value="Call">Phone Call</option>
                              <option value="Meeting">Meeting Completed</option>
                            </select>
                          </div>
                          <div className="w-full sm:w-2/3 flex flex-col gap-3">
                            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} disabled={isLockedDown} placeholder="Type details here..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-indigo-400 min-h-[60px] disabled:opacity-50"></textarea>
                            <button type="submit" disabled={!noteText.trim() || isLockedDown} className="self-end bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-xl disabled:opacity-50 hover:bg-slate-700 transition-colors shadow-md">Save Log</button>
                          </div>
                        </form>
                      </div>

                      {/* Tactical Save-Point */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center"><Calendar className="w-3 h-3 mr-1" /> Tactical Save-Point (Follow-Up)</h4>
                          <p className="text-xs font-medium text-slate-500">Set a date here to push this lead to the top of your Action Queue on the chosen day.</p>
                        </div>
                        <div className="flex flex-col w-full sm:w-auto items-center sm:items-end">
                          <input type="date" value={safeDateStr(selectedLead.next_follow_up)} disabled={isLockedDown} onChange={(e) => handleSetFollowUp(e.target.value)} className="w-full sm:w-[200px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                          {safeDateStr(selectedLead.next_follow_up) && !isLockedDown && <button onClick={() => handleSetFollowUp(null)} className="mt-2 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">Clear Save-Point</button>}
                        </div>
                      </div>

                      {/* Audit Trail */}
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

                {/* CONDITIONAL OUTCOME MODAL (BRANCHING) */}
                {pendingOutcomeTask && Array.isArray(pendingOutcomeTask.outcomes) && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                      <div className="bg-blue-600 p-5 text-center relative">
                        <button onClick={() => setPendingOutcomeTask(null)} className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
                        <GitBranch className="w-10 h-10 text-white/90 mx-auto mb-2" />
                        <h3 className="text-lg font-black text-white tracking-tight">Log Outcome</h3>
                        <p className="text-blue-100 text-xs font-medium mt-1">What happened during: {pendingOutcomeTask.name || pendingOutcomeTask.title}?</p>
                      </div>
                      <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                        {pendingOutcomeTask.outcomes.map((outcome, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => executeOutcome(outcome)}
                            className="w-full text-left p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all group"
                          >
                            <span className="block font-black text-slate-800 group-hover:text-blue-700">{outcome.label}</span>
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                              Action: {formatActionLabel(outcome.action)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* RESTORED: THE VAULT DRAWER */}
                {showVault && !isLockedDown && (
                  <div className="w-[400px] h-full bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 animate-in slide-in-from-right duration-300 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20 absolute right-0">
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

                {/* THE STAGE BRIEFING DRAWER */}
                {showBriefing && !isLockedDown && (
                  <div className="w-[400px] h-full bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 animate-in slide-in-from-right duration-300 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20 absolute right-0">
                    <div className="p-5 bg-indigo-900 text-white flex justify-between items-center shrink-0 shadow-md">
                      <h3 className="font-black tracking-widest uppercase text-xs flex items-center"><Brain className="w-4 h-4 mr-2 text-indigo-400" /> Tactical Briefing</h3>
                      <button onClick={() => setShowBriefing(false)} className="text-slate-400 hover:text-white bg-indigo-800 p-1 rounded"><X className="w-4 h-4"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-white border-l border-slate-200 shadow-inner">
                      <h4 className="font-black text-lg text-slate-800 mb-5 tracking-tight border-b border-slate-100 pb-4">{currentStageData?.name || 'Current Stage'}</h4>
                      <div className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {currentStageData?.stage_briefing_text || "No briefing text configured for this stage yet."}
                      </div>
                    </div>
                  </div>
                )}

                {/* THE CALENDLY MODAL */}
                {showCalendlyConfirm && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 text-center border border-slate-200 relative overflow-y-auto max-h-[85vh]">
                      <button onClick={() => setShowCalendlyConfirm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                      <Calendar className="w-12 h-12 mx-auto text-blue-500 mb-4 mt-2" />
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