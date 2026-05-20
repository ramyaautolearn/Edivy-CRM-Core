import React, { useState, useEffect } from 'react';
import {
  Shield, RefreshCw, MapPin, Star, Flame, Zap, User, Phone, Send, Inbox, Calendar, FileText, CheckCircle, BookOpen, AlertCircle, PlayCircle, Trash2, Video, MessageCircle
} from 'lucide-react';
import {
  collection, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { mockApi } from '../data/mockDb';

export default function AgentDashboard({ user }) {
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // NEW: Expanded Sidebar Tabs
  const [activeTab, setActiveTab] = useState('action_queue'); 
  
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('Internal Note'); // NEW: Note Types
  
  const [e1Pipeline, setE1Pipeline] = useState(null);
  const [vaultScripts, setVaultScripts] = useState([]);
  const [showVault, setShowVault] = useState(false);
  
  const appId = 'edivy-crm-vault';

  useEffect(() => {
    const loadIntelligence = async () => {
      try {
        const pData = await mockApi.getPipeline(1);
        setE1Pipeline(pData);
        const sData = await mockApi.getScripts();
        setVaultScripts(sData);
      } catch (err) {
        console.error("Error loading intelligence:", err);
      }
    };
    loadIntelligence();

    if (!db || !user?.id) return;
    const unsub = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'leads'),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const myLeads = all.filter(l => l.assigned_to === user.id || (!l.assigned_to && user.role === 'admin'));
        myLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
        setLeads(myLeads);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // --- UPGRADED: ADD NOTE WITH TYPE ---
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedLeadId) return;

    try {
      const leadRef = doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLeadId);
      await updateDoc(leadRef, {
        logs: arrayUnion({
          id: Date.now().toString(), // Unique ID for deletion
          date: new Date().toISOString(),
          type: noteType,
          text: noteText,
          agent: user?.name || 'Agent'
        }),
        last_activity_at: serverTimestamp()
      });
      setNoteText('');
      setNoteType('Internal Note');
    } catch (err) {}
  };

  // --- NEW: DELETE LOG ---
  const handleDeleteLog = async (logIdToRemove) => {
    if (!window.confirm("Delete this log?")) return;
    try {
      const leadRef = doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLeadId);
      const docSnap = await getDoc(leadRef);
      if (docSnap.exists()) {
        const currentLogs = docSnap.data().logs || [];
        const updatedLogs = currentLogs.filter(log => log.id !== logIdToRemove);
        await updateDoc(leadRef, { logs: updatedLogs });
      }
    } catch (err) { console.error("Error deleting log", err); }
  };

  const handleSetFollowUp = async (dateStr) => {
    if (!selectedLeadId) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLeadId), {
        next_follow_up: dateStr,
        last_activity_at: serverTimestamp()
      });
    } catch (err) {}
  };

  // --- NEW: MANUAL PIPELINE STAGE SWAPPER ---
  const handleStageChange = async (newStageName) => {
    if (!selectedLeadId) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', selectedLeadId), {
        stage_name: newStageName,
        last_activity_at: serverTimestamp()
      });
    } catch (err) {}
  };

  const handleOutcome = async (leadId, outcome) => {
    if (!db) return;
    try {
      const leadRef = doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId);
      let updates = { last_activity_at: serverTimestamp() };

      if (outcome === 'Meeting Booked') {
        updates.temperature = 'Hot';
        updates.next_follow_up = new Date().toISOString().split('T')[0];
      }
      else if (outcome === 'Interested') { updates.temperature = 'Hot'; }
      else if (outcome === 'Not Now (Eject to E2)') {
        updates.engine = 2;
        updates.stage_name = 'Awakening (Entry)';
        updates.temperature = 'Cold';
        updates.next_follow_up = null;
      }
      
      await updateDoc(leadRef, updates);
    } catch (e) {}
  };

  // --- UPGRADED: SMART SIDEBAR FILTERING ---
  const today = new Date().toISOString().split('T')[0];
  
  const actionQueueLeads = leads.filter(l => 
    (l.engine === 1 && l.stage_name === 'New Lead') || 
    l.temperature === 'Hot' || 
    (l.next_follow_up && l.next_follow_up <= today)
  );

  const demoLeads = leads.filter(l => 
    (l.stage_name || '').toLowerCase().includes('demo') || 
    (l.stage_name || '').toLowerCase().includes('meeting')
  );

  let displayedLeads = leads;
  if (activeTab === 'action_queue') displayedLeads = actionQueueLeads;
  if (activeTab === 'demos') displayedLeads = demoLeads;

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  // --- DYNAMIC PROTOCOL FINDER ---
  const getCurrentProtocol = () => {
    if (!selectedLead || !e1Pipeline) return null;
    const currentStage = e1Pipeline.stages.find(s => s.name === selectedLead.stage_name);
    if (!currentStage || !currentStage.tasks || currentStage.tasks.length === 0) return null;
    return currentStage.tasks[0]; 
  };

  const currentTask = getCurrentProtocol();

  // Helper function for Log Icons
  const getLogIcon = (type) => {
    if (type === 'WhatsApp') return <MessageCircle className="w-3 h-3 text-emerald-500" />;
    if (type === 'Call') return <Phone className="w-3 h-3 text-blue-500" />;
    if (type === 'Meeting') return <Video className="w-3 h-3 text-purple-500" />;
    return <FileText className="w-3 h-3 text-slate-400" />;
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-slate-50 overflow-hidden font-sans text-slate-800 rounded-2xl shadow-xl border border-slate-200 relative">
      
      {/* LEFT COLUMN: THE QUEUE */}
      <aside className="w-[320px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 h-full">
        <div className="p-6 bg-[#0B0F19] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="font-black uppercase tracking-[0.2em] text-sm leading-none mt-1">Workspace</span>
          </div>
        </div>

        {/* UPGRADED: 3 TABS FOR CLARITY */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2 shrink-0">
          <button onClick={() => setActiveTab('action_queue')} className={`py-2.5 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'action_queue' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300' }`}>
            <span className="flex items-center"><Zap className="w-3 h-3 mr-2"/> Action Queue</span>
            <span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='action_queue'?'bg-white/20':'bg-slate-100'}`}>{actionQueueLeads.length}</span>
          </button>
          <button onClick={() => setActiveTab('demos')} className={`py-2.5 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'demos' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300' }`}>
             <span className="flex items-center"><Calendar className="w-3 h-3 mr-2"/> Demos Booked</span>
             <span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='demos'?'bg-white/20':'bg-slate-100'}`}>{demoLeads.length}</span>
          </button>
          <button onClick={() => setActiveTab('all')} className={`py-2.5 px-3 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all flex items-center justify-between ${ activeTab === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300' }`}>
            <span className="flex items-center"><Inbox className="w-3 h-3 mr-2"/> All Leads (Bank)</span>
            <span className={`px-1.5 py-0.5 rounded text-[8px] ${activeTab==='all'?'bg-white/20':'bg-slate-100'}`}>{leads.length}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="p-12 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>
          ) : displayedLeads.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] leading-relaxed">
              <Inbox className="w-8 h-8 mx-auto mb-3 opacity-20" /> Queue Clear
            </div>
          ) : (
            displayedLeads.map((l) => (
              <div key={l.id} onClick={() => setSelectedLeadId(l.id)} className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${ selectedLeadId === l.id ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-200' }`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm tracking-tight text-slate-900 leading-tight pr-2 truncate">{l.school_name}</h4>
                  {l.temperature === 'Hot' && <Flame className="w-4 h-4 text-orange-500 fill-current shrink-0" />}
                </div>
                {l.next_follow_up && (
                  <div className={`text-[9px] font-black uppercase tracking-widest mb-2 flex items-center w-max px-2 py-0.5 rounded border ${l.next_follow_up <= today ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    <Calendar className="w-3 h-3 mr-1" /> Due: {l.next_follow_up}
                  </div>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100/50">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest truncate max-w-[120px] ${selectedLeadId === l.id ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                    {l.stage_name || 'New Lead'}
                  </span>
                  <div className="text-[10px] font-black flex items-center text-indigo-600"><Star className="w-3 h-3 mr-1 fill-current" /> {l.score}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* RIGHT COLUMN: DEAL ROOM */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-w-0 bg-white h-full">
        {!selectedLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50">
            <Zap className="w-20 h-20 mb-6 opacity-20" />
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-300">Select Target</h2>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full animate-in fade-in duration-300">
            
            <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shadow-sm flex-wrap gap-4 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedLead.school_name}</h2>
                <div className="flex flex-wrap items-center mt-2 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <p className="flex items-center"><User className="w-4 h-4 mr-1 text-indigo-500" /> {selectedLead.contact_name}</p>
                  <p className="flex items-center"><Phone className="w-4 h-4 mr-1 text-indigo-500" /> {selectedLead.phone}</p>
                </div>
              </div>
              <div className="text-right flex gap-3">
                <button onClick={() => setShowVault(!showVault)} className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm transition-colors flex items-center">
                  <BookOpen className="w-3 h-3 mr-1.5" /> Script Vault
                </button>
              </div>
            </header>

            <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Stats & Score Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Target Profile</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-2 gap-y-4 text-left">
                      <div className="flex flex-col gap-1"><span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tier:</span><span className="font-bold text-slate-800 text-xs break-words">{selectedLead.pc1 || 'N/A'}</span></div>
                      <div className="flex flex-col gap-1"><span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tech:</span><span className="font-bold text-slate-800 text-xs break-words">{selectedLead.pc2 || 'N/A'}</span></div>
                      <div className="flex flex-col gap-1"><span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Vision:</span><span className="font-bold text-slate-800 text-xs break-words">{selectedLead.pc3 || 'N/A'}</span></div>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Edivy Score</h5>
                    <div className="text-4xl font-black text-indigo-600 tabular-nums leading-none tracking-tighter">{selectedLead.score || 0}</div>
                  </div>
                </div>

                {/* DYNAMIC EXECUTION PROTOCOL */}
                <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center">
                      <PlayCircle className="w-4 h-4 mr-2 text-indigo-500" /> Current Pipeline Stage
                    </h3>
                    
                    {/* UPGRADED: MANUAL STAGE SWAPPER (Fixes the "Undo" issue!) */}
                    {e1Pipeline && (
                      <select 
                        value={selectedLead.stage_name || ''} 
                        onChange={(e) => handleStageChange(e.target.value)}
                        className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none uppercase tracking-widest cursor-pointer"
                      >
                        <option value="New Lead">0: New Lead (Unmapped)</option>
                        {e1Pipeline.stages.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {currentTask ? (
                    <div className="mb-6 space-y-4">
                      <div className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg w-max">
                        Active Step: {currentTask.name}
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm font-medium text-amber-900 shadow-inner flex items-start">
                        <AlertCircle className="w-5 h-5 mr-3 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[10px] uppercase tracking-widest mb-1 text-amber-600">Instructions</strong>
                          {currentTask.instructions}
                        </div>
                      </div>

                      {currentTask.override_script && (
                        <div>
                           <strong className="block text-[10px] uppercase tracking-widest mb-2 text-slate-400">Approved Script</strong>
                           <div className="bg-slate-50 p-4 rounded-2xl text-sm font-medium text-slate-700 border border-slate-200 shadow-inner whitespace-pre-wrap">
                             {currentTask.override_script.replace('{contact_name}', selectedLead.contact_name)}
                           </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-6 rounded-2xl text-sm font-bold text-slate-400 border border-slate-200 text-center uppercase tracking-widest mb-6">
                      Select a stage from the dropdown above to view tasks.
                    </div>
                  )}
                  
                  {/* Action Bar */}
                  <div className="flex flex-wrap gap-3 items-center border-t border-slate-100 pt-6">
                    <button onClick={() => window.open(`https://wa.me/${selectedLead.phone}`, '_blank')} className="bg-emerald-500 text-white font-black py-3 px-6 rounded-xl shadow-md hover:bg-emerald-600 transition-all uppercase text-[10px] tracking-widest flex items-center">
                      <Send className="w-4 h-4 mr-2" /> Open WhatsApp
                    </button>
                    <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
                    
                    <button onClick={() => handleOutcome(selectedLead.id, 'Interested')} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all uppercase tracking-widest shadow-sm">
                      🔥 Mark Interested
                    </button>
                    <button onClick={() => handleOutcome(selectedLead.id, 'Meeting Booked')} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all uppercase tracking-widest shadow-sm">
                      📅 Demo Booked
                    </button>
                    <button onClick={() => handleOutcome(selectedLead.id, 'Not Now (Eject to E2)')} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all uppercase tracking-widest shadow-sm">
                      Not Now (Eject E2)
                    </button>
                  </div>
                </div>

                {/* Notes & Follow Up Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                      <FileText className="w-3 h-3 mr-1" /> Log Activity / Notes
                    </h4>
                    <form onSubmit={handleAddNote} className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      {/* UPGRADED: NOTE TYPE DROPDOWN */}
                      <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-600 outline-none focus:border-indigo-400">
                        <option value="Internal Note">Internal Note</option>
                        <option value="WhatsApp">WhatsApp Message Sent</option>
                        <option value="Call">Phone Call</option>
                        <option value="Meeting">Meeting Completed</option>
                      </select>
                      <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Type details here..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-indigo-400 min-h-[80px]"></textarea>
                      <button type="submit" disabled={!noteText.trim()} className="w-full bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl disabled:opacity-50 hover:bg-slate-700 transition-colors shadow-md">
                        Save Log
                      </button>
                    </form>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" /> Set Next Follow-Up
                    </h4>
                    <input type="date" value={selectedLead.next_follow_up || ''} onChange={(e) => handleSetFollowUp(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 mb-4 cursor-pointer shadow-sm"/>

                    <div className="bg-white rounded-xl p-3 h-[180px] overflow-y-auto border border-slate-200 shadow-sm">
                      {(!selectedLead.logs || selectedLead.logs.length === 0) ? (
                        <p className="text-xs text-slate-400 font-medium italic text-center mt-12">No activity logged yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {[...selectedLead.logs].reverse().map((log, i) => (
                            <div key={i} className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-3 group">
                              <div className="mt-0.5">{getLogIcon(log.type)}</div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-black text-slate-700">{log.agent} <span className="text-slate-400 font-medium ml-1">({log.type})</span></span>
                                  {/* NEW: DELETE LOG BUTTON */}
                                  <button type="button" onClick={() => handleDeleteLog(log.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <span className="text-slate-600 block mb-1.5">{log.text}</span>
                                <div className="text-[8px] text-slate-400 font-bold uppercase">{new Date(log.date).toLocaleString()}</div>
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

        {/* --- UPGRADED: SCRIPT VAULT SLIDE-OUT PANEL --- */}
        {showVault && (
          <div className="absolute top-0 right-0 w-[400px] h-full bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black tracking-widest uppercase text-xs flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-purple-400" /> Reactive Arsenal
              </h3>
              <button onClick={() => setShowVault(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {/* Shows ALL scripts, but highlights recommended ones! */}
              {vaultScripts.length === 0 ? (
                <div className="text-center p-8 text-xs font-bold text-slate-400 uppercase tracking-widest">Vault is Empty</div>
              ) : (
                vaultScripts.map(script => {
                  const isRecommended = script.pc1 === 'Any' || script.pc1 === selectedLead?.pc1;
                  return (
                    <div key={script.id} className={`bg-white border rounded-xl p-4 shadow-sm ${isRecommended ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-200 opacity-70 hover:opacity-100'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isRecommended ? 'text-purple-700 bg-purple-100' : 'text-slate-500 bg-slate-100'}`}>
                          {script.message_type}
                        </span>
                        {isRecommended && <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest">⭐ Recommended</span>}
                      </div>
                      <div className="text-xs font-medium text-slate-700 whitespace-pre-wrap mt-2">{script.content.replace('{contact_name}', selectedLead?.contact_name || '')}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}