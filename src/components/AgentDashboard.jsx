import React, { useState, useEffect } from 'react';
import {
  Shield, RefreshCw, MapPin, Star, Flame, Zap, User, Phone, MessageSquare, Send, Inbox
} from 'lucide-react';
import {
  collection, onSnapshot, doc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export default function AgentDashboard({ user }) {
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const appId = 'edivy-crm-vault';

  useEffect(() => {
    if (!db || !user?.id) {
      return;
    }
    
    const unsub = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'leads'),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const myLeads = all.filter(
          (l) => l.assigned_to === user.id || l.assigned_to === 'staff' 
        );
        
        myLeads.sort((a, b) => (b.score || 0) - (a.score || 0));
        setLeads(myLeads);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const handleOutcome = async (leadId, outcome) => {
    if (!db) return;
    try {
      const leadRef = doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId);
      let updates = {
        temperature: outcome === 'Interested' ? 'Hot' : 'Warm',
        last_activity_at: serverTimestamp(),
      };
      if (outcome === 'Meeting Booked') updates.stage_name = 'Meeting Scheduled';
      else if (outcome === 'Not Now') {
        updates.engine = 2;
        updates.stage_name = 'Awakening (Entry)';
      }
      await updateDoc(leadRef, updates);
    } catch (e) {}
  };

  const displayedLeads = activeTab === 'tasks'
      ? leads.filter((l) => l.stage_name === 'New Lead' || l.temperature === 'Hot')
      : leads;

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-slate-50 overflow-hidden font-sans text-slate-800 rounded-2xl shadow-xl border border-slate-200">
      
      {/* LEFT COLUMN: THE QUEUE */}
      <aside className="w-[350px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-10">
        <div className="p-6 bg-[#0B0F19] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="font-black uppercase tracking-[0.2em] text-sm leading-none mt-1">Workspace</span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-2">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-2.5 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all ${
              activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
            }`}
          >
            Smart Queue
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex-1 py-2.5 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all ${
              activeTab === 'leads' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
            }`}
          >
            Lead Bank
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-300" />
            </div>
          ) : displayedLeads.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] leading-relaxed">
              <Inbox className="w-8 h-8 mx-auto mb-3 opacity-20" />
              {activeTab === 'tasks' ? 'Queue Clear' : 'Bank Empty'}
              <br />
              <span className="text-[9px] opacity-50 mt-2 block">
                {activeTab === 'tasks' ? 'No urgent tasks right now' : 'No leads assigned yet'}
              </span>
            </div>
          ) : (
            displayedLeads.map((l) => (
              <div
                key={l.id}
                onClick={() => setSelectedLeadId(l.id)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedLeadId === l.id ? 'bg-indigo-50 border-indigo-500 shadow-sm scale-[1.02]' : 'bg-white border-slate-100 hover:border-indigo-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm tracking-tight text-slate-900 leading-tight pr-2">{l.school_name}</h4>
                  {l.temperature === 'Hot' && (
                    <Flame className={`w-4 h-4 shrink-0 ${selectedLeadId === l.id ? 'text-orange-500' : 'text-orange-400'} fill-current`} />
                  )}
                </div>
                <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  <MapPin className="w-3 h-3 mr-1" /> {l.location}
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${selectedLeadId === l.id ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                    {l.stage_name || 'New'}
                  </span>
                  <div className="text-xs font-black flex items-center text-indigo-600">
                    <Star className="w-3.5 h-3.5 mr-1 fill-current" /> {l.score}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* RIGHT COLUMN: DEAL ROOM */}
      <div className="flex-1 bg-slate-50 flex flex-col relative overflow-hidden min-w-0">
        {!selectedLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <Zap className="w-20 h-20 mb-6 opacity-20" />
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-300">Select Target</h2>
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-in fade-in duration-300">
            
            {/* Header */}
            <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shadow-sm flex-wrap gap-4 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedLead.school_name}</h2>
                <div className="flex flex-wrap items-center mt-2 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <p className="flex items-center"><User className="w-4 h-4 mr-1 text-indigo-500" /> {selectedLead.contact_name}</p>
                  <p className="flex items-center"><Phone className="w-4 h-4 mr-1 text-indigo-500" /> {selectedLead.phone}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <span className="px-3 py-1 bg-[#0B0F19] text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-sm">
                  {selectedLead.stage_name || 'New'}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded border ${
                    selectedLead.temperature === 'Hot' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                }`}>
                  {selectedLead.temperature || 'Cold'}
                </span>
              </div>
            </header>

            {/* Scrollable Content Body */}
            <div className="flex-1 p-6 bg-slate-50/50 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-4">
                
                {/* Stats Row (Side by Side to save space) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  
                  {/* Target Profile */}
                  <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Target Profile</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tier:</span>
                        <span className="font-bold text-slate-800 text-xs">{selectedLead.pc1 || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tech:</span>
                        <span className="font-bold text-slate-800 text-xs">{selectedLead.pc2 || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Vision:</span>
                        <span className="font-bold text-slate-800 text-xs">{selectedLead.pc3 || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Edivy Score</h5>
                    <div className="text-4xl font-black text-indigo-600 tabular-nums leading-none tracking-tighter">
                      {selectedLead.score || 0}
                    </div>
                  </div>
                </div>

                {/* Execution Protocol - Pulled UP so it's instantly visible */}
                <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5"><MessageSquare className="w-32 h-32" /></div>
                  <h3 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-4 flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-yellow-500 fill-current" /> Execution Protocol
                  </h3>
                  
                  <div className="bg-slate-50 p-5 rounded-2xl text-sm font-medium italic text-slate-600 border border-slate-200 shadow-inner">
                    "Hi {selectedLead.contact_name}, noticed {selectedLead.school_name} is managing parent comms via {selectedLead.pc2 || 'manual methods'}. We help schools automate this. Open to a 10-min chat?"
                  </div>
                  
                  <div className="mt-5">
                    <button
                      onClick={() => window.open(`https://wa.me/${selectedLead.phone}?text=Hi%20${selectedLead.contact_name}...`, '_blank')}
                      className="w-full sm:w-auto bg-emerald-500 text-white font-black py-3.5 px-6 rounded-xl shadow-md hover:bg-emerald-600 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center"
                    >
                      <Send className="w-4 h-4 mr-2" /> Open Discovery WhatsApp
                    </button>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Log Outcome</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {['Interested', 'No Reply', 'Meeting Booked', 'Not Now'].map((o) => (
                        <button
                          key={o}
                          onClick={() => handleOutcome(selectedLead.id, o)}
                          className="px-2 py-2.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest shadow-sm"
                        >
                          {o}
                        </button>
                      ))}
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