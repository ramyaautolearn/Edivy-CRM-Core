import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, ShieldCheck, Trash2, Save, X, RefreshCw, Lock, BadgeIcon } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; 

export default function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  
  // Form State
  const [agentId, setAgentId] = useState(''); // The hidden Firebase UID
  const [badgeId, setBadgeId] = useState(''); // THE NEW CLEAN ALIAS (e.g. AGT-001)
  const [name, setName] = useState('');
  const [role, setRole] = useState('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 

  const appId = 'edivy-crm-vault';

  useEffect(() => {
    if (!db) { setLoading(false); return; }

    const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAgents(allUsers);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSaveAgent = async (e) => {
    e.preventDefault();
    if (!db || !agentId.trim()) return;

    setIsSaving(true);
    // We strictly use their exact Firebase UID to ensure the "Front Door" matches the Database
    const cleanId = agentId.trim();

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', cleanId), {
        badge_id: badgeId.toUpperCase().trim(), // Saving the clean display ID
        name,
        role,
        email: email.toLowerCase().trim(),
        temporary_password: password, 
        updatedAt: serverTimestamp()
      });
      
      setAgentId('');
      setBadgeId('');
      setName('');
      setRole('staff');
      setEmail('');
      setPassword('');
      setIsEditing(false);
      setShowModal(false);
    } catch (error) {
      console.error("Error saving agent details:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (agent) => {
    setIsEditing(true); 
    setAgentId(agent.id);
    setBadgeId(agent.badge_id || '');
    setName(agent.name || '');
    setRole(agent.role || 'staff');
    setEmail(agent.email || '');
    setPassword(agent.temporary_password || ''); 
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase flex items-center">
            <Users className="w-6 h-6 mr-3 text-indigo-600" /> Agent Deployment
          </h2>
          <p className="text-slate-500 font-medium text-xs uppercase tracking-widest mt-1">Manage live team credentials and profile access</p>
        </div>
        <button onClick={() => { setIsEditing(false); setAgentId(''); setBadgeId(''); setName(''); setEmail(''); setPassword(''); setRole('staff'); setShowModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center shadow-lg text-xs uppercase tracking-widest transition-all active:scale-95">
          <Plus className="w-5 h-5 mr-2" /> Link New Agent
        </button>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex justify-center items-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-indigo-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-indigo-300 transition-all">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 font-black text-lg border border-slate-200 uppercase shadow-inner">
                    {agent.name?.[0] || 'U'}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${agent.role === 'admin' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {agent.role}
                      </span>
                      {agent.badge_id && (
                          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest">
                              {agent.badge_id}
                          </span>
                      )}
                  </div>
                </div>
                <h3 className="font-black text-slate-800 text-base tracking-tight truncate">{agent.name}</h3>
                <p className="text-xs text-slate-400 font-medium truncate mt-1">{agent.email || 'No email assigned'}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                   <p className="text-[8px] font-mono font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded border border-slate-100 tracking-wider truncate max-w-[120px]" title={agent.id}>
                       UID: {agent.id.substring(0,8)}...
                   </p>
                   {agent.temporary_password && (
                     <p className="text-[8px] font-mono font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded border border-emerald-100 tracking-wider flex items-center">
                       <Lock className="w-2.5 h-2.5 mr-1" /> Linked
                     </p>
                   )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <button onClick={() => openEditModal(agent)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider">Edit Profile</button>
                <button 
                  onClick={async () => {
                    if (window.confirm(`Permanently terminate access for ${agent.name}?`)) {
                      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', agent.id));
                    }
                  }} 
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-8 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{isEditing ? 'Update Agent Profile' : 'Link New Agent'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 bg-white rounded-full p-1.5 shadow-sm border border-slate-200"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSaveAgent} className="p-6 space-y-4">
               
               <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4">
                   <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1.5 ml-1">Firebase Auth UID (Required)</label>
                   <input type="text" value={agentId} onChange={e => setAgentId(e.target.value)} disabled={isEditing} required placeholder="Paste exact UID from Firebase Authentication..." className="w-full px-4 py-3 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50" />
                   <p className="text-[9px] font-bold text-amber-600 mt-1.5 ml-1 leading-relaxed">This must perfectly match their UID in the Firebase Authentication tab.</p>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Display Badge</label>
                    <input type="text" value={badgeId} onChange={e => setBadgeId(e.target.value)} placeholder="e.g., AGT-01" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase tracking-wider" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">System Role</label>
                    <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer">
                       <option value="staff">Staff Operator</option>
                       <option value="admin">Administrator</option>
                    </select>
                 </div>
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Legal Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Jane Smith" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Corporate Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane@edivy.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
               </div>
               
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center">
                    <Lock className="w-3 h-3 mr-1.5" /> Temporary Setup Password (For records)
                  </label>
                  <input 
                    type="text" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="Enter assigned password" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700" 
                  />
               </div>

               <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-md disabled:opacity-70 mt-4 uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all flex items-center justify-center space-x-2">
                 <Save className="w-4 h-4" /> <span>{isSaving ? 'Updating Registry...' : 'Authorize Profile'}</span>
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}