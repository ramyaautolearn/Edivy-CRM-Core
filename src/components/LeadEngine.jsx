import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, MapPin, User, Star, ShieldCheck, Edit, Trash2, X, Zap, Users, Target, Flame, Download, UploadCloud, RefreshCw, Filter, FilterX, AlertCircle, CheckCircle, XCircle, Unlock, ArrowUpDown, CheckSquare, Square, Inbox, Snowflake
} from 'lucide-react';
import {
  collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch, arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';

export default function LeadEngine({ user }) {
  const [leads, setLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Filtering & Sorting States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEngine, setFilterEngine] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  
  // Bulk Action States
  const [selectedLeads, setSelectedLeads] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  const appId = 'edivy-crm-vault';

  // Form State
  const [schoolName, setSchoolName] = useState('');
  const [location, setLocation] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('Principal');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pc1, setPc1] = useState('Middle-Income');
  const [pc2, setPc2] = useState('No System');
  const [pc3, setPc3] = useState('Marks-Only');
  const [engineTarget, setEngineTarget] = useState(1);

  useEffect(() => {
    if (!db) return;

    const unsubLeads = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'leads'),
      (snap) => {
        const allLeads = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setLeads(allLeads);
      }
    );

    // FIX 3: Removed the role filter so ALL registered users show up
    const unsubAgents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      const allUsers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAgents(allUsers);
    });

    return () => { unsubLeads(); unsubAgents(); };
  }, []);

  const calculateEdivyScore = (tier, tech, vision, role) => {
    let score = 30;
    if (tier === 'Elite/Professional') score += 20;
    if (tech === 'Manual WhatsApp') score += 25;
    if (vision === 'Holistic/Life-Skills') score += 15;
    const roleScores = { 'Owner / Founder': 25, 'Principal': 20, 'Vice Principal': 10, 'Coordinator': 5 };
    score += roleScores[role] || 0;
    return score;
  };

  // BADGE FIX 1: Update the helper function to display badges in logs and the pending inbox
  const getAgentName = (agentId) => {
    if (!agentId) return 'Unassigned';
    const agent = agents.find(a => a.id === agentId || a.email === agentId);
    if (agent) {
       return agent.badge_id ? `[${agent.badge_id}] ${agent.name}` : (agent.name || agent.email);
    }
    return agentId.substring(0,8);
  };

  // --- ADD / EDIT LOGIC ---
  const handleAddOrEditLead = async (e) => {
    e.preventDefault();
    if (!db) return;

    setIsAdding(true);
    const score = calculateEdivyScore(pc1, pc2, pc3, contactRole);
    const engine = Number(engineTarget);

    const leadData = {
      school_name: schoolName,
      location,
      contact_name: contactName,
      contact_role: contactRole,
      phone,
      email,
      pc1, pc2, pc3,
      score,
      engine,
      ...( !editingId && { stage_name: engine === 1 ? 'New Lead' : 'Awakening (Entry)' } ),
      last_activity_at: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', editingId), leadData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), {
          ...leadData,
          assigned_to: null,
          is_recycled: false, // Explicitly mark as Fresh
          temperature: 'Cold',
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (err) {
      console.error('Error saving lead:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // --- ADMIN APPROVALS & ROUTING ---
  const handleAssign = async (leadId, agentId) => {
    if (!db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), { 
        assigned_to: agentId || null,
        transfer_requested_by: null,
        transfer_reason: null,
        logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Admin manually routed lead to ${getAgentName(agentId)}.`, agent: user?.name || 'Admin' })
    });
  };

  const handleRevokeClaim = async (leadId) => {
    if (!window.confirm("Revoke claim and dump this lead back into the Unassigned Bank?")) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), { 
        assigned_to: null,
        is_recycled: true, // Flag as Recycled so next agent knows it was dropped
        transfer_requested_by: null,
        transfer_reason: null,
        logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Admin revoked claim. Lead returned to Shark Tank (Recycled).`, agent: user?.name || 'Admin' })
    });
  };

  const handleApproveTransfer = async (lead) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', lead.id), { 
        assigned_to: lead.transfer_requested_by,
        transfer_requested_by: null,
        transfer_reason: null,
        logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Admin Approved Transfer to ${getAgentName(lead.transfer_requested_by)}.`, agent: user?.name || 'Admin' })
    });
  };

  const handleDenyTransfer = async (lead) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', lead.id), { 
        transfer_requested_by: null,
        transfer_reason: null,
        logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Admin Denied Transfer Request from ${getAgentName(lead.transfer_requested_by)}.`, agent: user?.name || 'Admin' })
    });
  };

  const handleEngineChange = async (leadId, newEngineValue) => {
    if (!db) return;
    const engineNum = Number(newEngineValue);
    const initialStage = engineNum === 1 ? 'New Lead' : 'Awakening (Entry)';
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), { 
      engine: engineNum,
      stage_name: initialStage,
      last_activity_at: serverTimestamp(),
      logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Admin forcefully moved lead to Engine ${engineNum}.`, agent: user?.name || 'Admin' })
    });
  };

  // --- BULK ACTIONS ENGINE ---
  const handleBulkAssign = async (agentId) => {
      if (!agentId || selectedLeads.length === 0) return;
      const batch = writeBatch(db);
      selectedLeads.forEach(id => {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'leads', id);
          batch.update(ref, { 
              assigned_to: agentId === 'unassigned' ? null : agentId, 
              transfer_requested_by: null,
              logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Admin Bulk Assigned lead to ${agentId === 'unassigned' ? 'Shark Tank' : getAgentName(agentId)}.`, agent: user?.name || 'Admin' })
          });
      });
      await batch.commit();
      setSelectedLeads([]); // Clear selection
  };

  const handleBulkEngine = async (engineNum) => {
      if (selectedLeads.length === 0) return;
      const batch = writeBatch(db);
      const initialStage = engineNum === 1 ? 'New Lead' : 'Awakening (Entry)';
      
      selectedLeads.forEach(id => {
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'leads', id);
          batch.update(ref, { 
              engine: engineNum,
              stage_name: initialStage,
              logs: arrayUnion({ id: Date.now().toString(), date: new Date().toISOString(), type: 'System', text: `Admin Bulk Moved lead to Engine ${engineNum}.`, agent: user?.name || 'Admin' })
          });
      });
      await batch.commit();
      setSelectedLeads([]);
  };

  // FIX 2: Bulletproof Select All Logic for Icon Buttons
  const toggleSelectAll = () => {
      if (selectedLeads.length === processedLeads.length && processedLeads.length > 0) {
          setSelectedLeads([]); // Deselect all
      } else {
          setSelectedLeads(processedLeads.map(l => l.id)); // Select all
      }
  };

  const toggleSelectLead = (id) => {
      if (selectedLeads.includes(id)) setSelectedLeads(selectedLeads.filter(lId => lId !== id));
      else setSelectedLeads([...selectedLeads, id]);
  };

  // --- SORTING & FILTERING ---
  const handleSort = (key) => {
      let direction = 'desc';
      if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
      setSortConfig({ key, direction });
  };

  const uniqueStages = [...new Set(leads.map(l => l.stage_name).filter(Boolean))];
  
  // Separate Pending Approvals for Inbox
  const pendingApprovals = leads.filter(l => l.transfer_requested_by);
  
  // Base Filter (Remove pending approvals from main view unless explicitly searched)
  let processedLeads = leads.filter((l) => {
      if (searchTerm && !(l.school_name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterEngine !== 'all' && l.engine?.toString() !== filterEngine) return false;
      if (filterStage !== 'all' && l.stage_name !== filterStage) return false;
      
      if (filterOwner === 'unassigned_all') { if (l.assigned_to) return false; }
      else if (filterOwner === 'unassigned_fresh') { if (l.assigned_to || l.is_recycled) return false; }
      else if (filterOwner === 'unassigned_recycled') { if (l.assigned_to || !l.is_recycled) return false; }
      else if (filterOwner !== 'all' && filterOwner !== 'unassigned_all' && filterOwner !== 'unassigned_fresh' && filterOwner !== 'unassigned_recycled' && l.assigned_to !== filterOwner) return false;
      
      return true;
  });

  // Apply Sorting
  processedLeads.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
  });

  const clearFilters = () => {
      setSearchTerm(''); setFilterEngine('all'); setFilterStage('all'); setFilterOwner('all');
  };

  const isFilterActive = filterEngine !== 'all' || filterStage !== 'all' || filterOwner !== 'all';

  // Modal / CSV Controls
  const openNewModal = () => {
    setEditingId(null); setSchoolName(''); setLocation(''); setContactName(''); setContactRole('Principal');
    setPhone(''); setEmail(''); setPc1('Middle-Income'); setPc2('No System'); setPc3('Marks-Only'); setEngineTarget(1);
    setShowModal(true);
  };
  const openEditModal = (lead) => {
    setEditingId(lead.id); setSchoolName(lead.school_name || ''); setLocation(lead.location || '');
    setContactName(lead.contact_name || ''); setContactRole(lead.contact_role || 'Principal');
    setPhone(lead.phone || ''); setEmail(lead.email || ''); setPc1(lead.pc1 || 'Middle-Income');
    setPc2(lead.pc2 || 'No System'); setPc3(lead.pc3 || 'Marks-Only'); setEngineTarget(lead.engine || 1);
    setShowModal(true);
  };
  const closeModal = () => { setEditingId(null); setShowModal(false); };
  
  const handleDeleteLead = async (id) => {
    if (window.confirm('Permanently delete this lead?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', id));
  };
  
  // CSV Import/Export implementation
  const handleExportCSV = () => {
    // Export only selected leads, OR export the filtered list if none are selected
    const leadsToExport = selectedLeads.length > 0 
      ? leads.filter(l => selectedLeads.includes(l.id))
      : processedLeads;

    if (leadsToExport.length === 0) {
      alert("No leads available to export!");
      return;
    }

    const headers = ['School Name', 'Location', 'Contact Name', 'Role', 'Phone', 'Email', 'Tier', 'Tech', 'Vision', 'Score', 'Engine', 'Stage', 'Assigned To'];
    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(l => [
        `"${l.school_name || ''}"`, `"${l.location || ''}"`, `"${l.contact_name || ''}"`, `"${l.contact_role || ''}"`,
        `"${l.phone || ''}"`, `"${l.email || ''}"`, `"${l.pc1 || ''}"`, `"${l.pc2 || ''}"`, `"${l.pc3 || ''}"`,
        l.score || 0, l.engine || 1, `"${l.stage_name || ''}"`, `"${getAgentName(l.assigned_to)}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `edivy_leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"|"$/g, '').trim()));
        const headers = rows[0].map(h => h.toLowerCase());
        
        const batch = writeBatch(db);
        const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
        let count = 0;

        for (let i = 1; i < rows.length; i++) {
          if (rows[i].length < 2 || !rows[i][0]) continue; 
          
          const rowData = {};
          headers.forEach((header, index) => { rowData[header] = rows[i][index]; });

          const score = calculateEdivyScore(
            rowData['tier'] || 'Middle-Income', 
            rowData['tech'] || 'No System', 
            rowData['vision'] || 'Marks-Only', 
            rowData['role'] || 'Principal'
          );
          
          const engine = score >= 70 ? 1 : 2;

          const newLeadRef = doc(leadsRef);
          batch.set(newLeadRef, {
            school_name: rowData['school name'] || 'Unknown School',
            location: rowData['location'] || '',
            contact_name: rowData['contact name'] || '',
            contact_role: rowData['role'] || 'Principal',
            phone: rowData['phone'] || '',
            email: rowData['email'] || '',
            pc1: rowData['tier'] || 'Middle-Income',
            pc2: rowData['tech'] || 'No System',
            pc3: rowData['vision'] || 'Marks-Only',
            score: score,
            engine: engine,
            stage_name: engine === 1 ? 'New Lead' : 'Awakening (Entry)',
            temperature: 'Cold',
            assigned_to: null,
            createdAt: serverTimestamp(),
            last_activity_at: serverTimestamp()
          });
          count++;
        }

        await batch.commit();
        alert(`Successfully imported ${count} leads!`);
      } catch (error) {
        console.error("Import error:", error);
        alert("Failed to import CSV. Check format.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 relative">
      
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Lead Routing Engine</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Manual Master Command Center for Lead Flow.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* UPDATED: Export CSV Button Added Here */}
          <button onClick={handleExportCSV} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl flex items-center shadow-sm text-xs uppercase tracking-widest transition-all">
            <Download className="w-4 h-4 mr-2 text-slate-400" /> Export CSV
          </button>
          
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl flex items-center shadow-sm text-xs uppercase tracking-widest transition-all">
            <UploadCloud className="w-4 h-4 mr-2 text-slate-400" /> {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          
          <button onClick={openNewModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center shadow-lg text-xs uppercase tracking-widest transition-all">
            <Plus className="w-5 h-5 mr-2" /> New B2B Lead
          </button>
        </div>
      </div>

      {/* PENDING APPROVALS INBOX */}
      {pendingApprovals.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 shadow-sm">
             <div className="flex items-center mb-4">
                 <Inbox className="w-5 h-5 text-amber-600 mr-2" />
                 <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Pending Approvals Inbox</h3>
                 <span className="ml-3 bg-amber-200 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">{pendingApprovals.length}</span>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {pendingApprovals.map(lead => (
                    <div key={lead.id} className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start">
                                <span className="font-black text-sm text-slate-800 truncate pr-2">{lead.school_name}</span>
                                <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded uppercase">Transfer</span>
                            </div>
                            <div className="mt-3">
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Request By:</p>
                                <p className="text-sm font-bold text-indigo-600">{getAgentName(lead.transfer_requested_by)}</p>
                            </div>
                            <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Reason:</p>
                                <p className="text-xs text-slate-600 font-medium italic">"{lead.transfer_reason}"</p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                            <button onClick={() => handleApproveTransfer(lead)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl transition-colors flex items-center justify-center shadow-sm">
                                <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                            </button>
                            <button onClick={() => handleDenyTransfer(lead)} className="flex-1 bg-white hover:bg-red-50 text-red-500 border border-red-200 text-[10px] font-black uppercase tracking-widest py-2 rounded-xl transition-colors flex items-center justify-center shadow-sm">
                                <XCircle className="w-4 h-4 mr-1.5" /> Deny
                            </button>
                        </div>
                    </div>
                ))}
             </div>
          </div>
      )}

      {/* Main Table with Sticky Headers & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between z-20 relative">
          <div className="flex items-center w-full xl:w-auto bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <Search className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
            <input type="text" placeholder="Search school name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent outline-none text-xs font-bold w-full min-w-[200px]" />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1"><Filter className="w-3.5 h-3.5 mr-1" /> Filters:</div>
            <select value={filterEngine} onChange={(e) => setFilterEngine(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold outline-none text-slate-700 bg-white cursor-pointer uppercase tracking-widest">
              <option value="all">Any Engine</option>
              <option value="1">Engine 1 (Sales)</option>
              <option value="2">Engine 2 (Nurture)</option>
            </select>
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold outline-none text-slate-700 bg-white cursor-pointer uppercase tracking-widest">
              <option value="all">Any Stage</option>
              {uniqueStages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold outline-none text-slate-700 bg-white cursor-pointer uppercase tracking-widest">
              <option value="all">Any Owner</option>
              <option value="unassigned_all">All Unassigned</option>
              <option value="unassigned_fresh">✨ Fresh Unassigned</option>
              <option value="unassigned_recycled">♻️ Recycled Unassigned</option>
              
              {/* BADGE FIX 2: Filter Dropdown */}
              {agents.map(a => {
                  const displayName = a.badge_id ? `[${a.badge_id}] ${a.name}` : (a.name || a.email);
                  return <option key={a.id} value={a.id}>{displayName}</option>;
              })}
            </select>
            {isFilterActive && (
              <button onClick={clearFilters} className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg flex items-center justify-center transition-colors border border-red-100" title="Clear Filters">
                  <FilterX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* SCROLLABLE TABLE CONTAINER */}
        <div className="overflow-x-auto overflow-y-auto max-h-[60vh] relative">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                <th className="p-4 pl-6 w-10">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600">
                        {selectedLeads.length === processedLeads.length && processedLeads.length > 0 ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                    </button>
                </th>
                <th className="p-4 cursor-pointer hover:text-slate-700 group" onClick={() => handleSort('school_name')}>
                    School & Contact <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </th>
                <th className="p-4">Intelligence Profile</th>
                <th className="p-4 cursor-pointer hover:text-slate-700 group" onClick={() => handleSort('score')}>
                    Routing & Score <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </th>
                <th className="p-4 w-[280px]">Lead Owner & Status</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {processedLeads.map((lead) => (
                <tr key={lead.id} className={`hover:bg-slate-50/80 transition-colors ${selectedLeads.includes(lead.id) ? 'bg-indigo-50/30' : ''}`}>
                  <td className="p-4 pl-6">
                    <button onClick={() => toggleSelectLead(lead.id)} className="text-slate-300 hover:text-indigo-600 transition-colors">
                        {selectedLeads.includes(lead.id) ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="font-black text-slate-800 text-sm flex items-center">
                        {lead.school_name}
                        {!lead.assigned_to && !lead.is_recycled && <span className="ml-2 bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">✨ Fresh</span>}
                        {!lead.assigned_to && lead.is_recycled && <span className="ml-2 bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">♻️ Recycled</span>}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center uppercase tracking-widest font-bold">
                      <MapPin className="w-3 h-3 mr-1 text-slate-400" /> {lead.location}
                    </div>
                    <div className="text-[10px] font-black text-indigo-600 mt-1.5 flex items-center uppercase tracking-widest">
                      <User className="w-3 h-3 mr-1" /> {lead.contact_name} ({lead.contact_role})
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 tracking-widest w-max">PC1: {lead.pc1}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 tracking-widest w-max">PC2: {lead.pc2}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className={`flex items-center font-black text-sm ${lead.score >= 70 ? 'text-amber-500' : 'text-slate-500'}`}>
                        <Star className="w-4 h-4 mr-1 fill-current" /> {lead.score} <span className="text-xs text-slate-400 ml-1">/ 100</span>
                      </div>
                      <select
                        value={lead.engine || 1}
                        onChange={(e) => handleEngineChange(lead.id, e.target.value)}
                        className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer uppercase tracking-widest w-max transition ${lead.engine === 1 ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                      >
                        <option value={1}>🚀 E1 (Sales)</option>
                        <option value={2}>💧 E2 (Nurture)</option>
                      </select>
                    </div>
                  </td>
                  
                  {/* BADGE FIX 3: 1-Click Assignment Dropdown */}
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center">
                        <ShieldCheck className={`w-4 h-4 mr-2 shrink-0 ${lead.assigned_to ? 'text-emerald-500' : 'text-slate-200'}`} />
                        <select
                          value={lead.assigned_to || ''}
                          onChange={(e) => handleAssign(lead.id, e.target.value)}
                          className={`text-[10px] font-black border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest cursor-pointer w-full max-w-[180px] truncate ${lead.assigned_to ? 'bg-white border-slate-200 text-slate-700' : 'bg-red-50 border-red-100 text-red-500'}`}
                        >
                          <option value="">⚠️ Unassigned</option>
                          {agents.map((agent) => {
                             const displayName = agent.badge_id ? `[${agent.badge_id}] ${agent.name}` : (agent.name || agent.email);
                             return <option key={agent.id} value={agent.id}>{displayName}</option>;
                          })}
                        </select>
                        {lead.assigned_to && (
                          <button onClick={() => handleRevokeClaim(lead.id)} title="Revoke Claim" className="ml-2 p-1.5 bg-white hover:bg-red-50 text-slate-400 hover:border-red-200 hover:text-red-500 rounded-lg transition-colors shadow-sm shrink-0">
                              <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-4 pr-6 text-right space-x-2">
                    <button onClick={() => openEditModal(lead)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-lg transition-all shadow-sm"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteLead(lead.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-100 rounded-lg transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FLOATING BULK ACTION BAR */}
      {selectedLeads.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in">
              <div className="flex items-center text-white">
                  <span className="bg-indigo-600 text-white font-black px-3 py-1 rounded-lg mr-3 text-sm">{selectedLeads.length}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Leads Selected</span>
              </div>
              <div className="w-px h-8 bg-slate-700"></div>
              <div className="flex items-center gap-3">
                  {/* BADGE FIX 4: Bulk Action Dropdown */}
                  <select onChange={(e) => handleBulkAssign(e.target.value)} className="bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer">
                      <option value="">Bulk Assign To...</option>
                      <option value="unassigned">Dump to Unassigned Bank</option>
                      {agents.map(a => {
                          const displayName = a.badge_id ? `[${a.badge_id}] ${a.name}` : (a.name || a.email);
                          return <option key={a.id} value={a.id}>{displayName}</option>;
                      })}
                  </select>
                  <button onClick={() => handleBulkEngine(1)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center">
                      <Zap className="w-3.5 h-3.5 mr-1.5" /> Route E1
                  </button>
                  <button onClick={() => handleBulkEngine(2)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center">
                      <Snowflake className="w-3.5 h-3.5 mr-1.5" /> Route E2
                  </button>
                  
                  {/* UPDATED: Export Selected Action */}
                  <button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center ml-2 border border-emerald-500">
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Export Selected
                  </button>
              </div>
              <button onClick={() => setSelectedLeads([])} className="ml-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
              </button>
          </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl shrink-0">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingId ? 'Edit B2B Lead' : 'New B2B Lead'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 bg-white rounded-full p-1.5 shadow-sm border border-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddOrEditLead} className="p-6 space-y-5">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">School Name</label>
                  <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Location</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contact Name</label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Designation</label>
                  <select value={contactRole} onChange={(e) => setContactRole(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer">
                    <option value="Owner / Founder">Owner / Founder</option>
                    <option value="Principal">Principal</option>
                    <option value="Vice Principal">Vice Principal</option>
                    <option value="Coordinator">Coordinator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 space-y-4 mt-2">
                <h4 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-500 fill-current" /> Intelligence & Routing Profile
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">PC1: Tier</label>
                    <select value={pc1} onChange={(e) => setPc1(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none">
                      {['Elite/Professional', 'Middle-Income', 'Mass-Market'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">PC2: Tech</label>
                    <select value={pc2} onChange={(e) => setPc2(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none">
                      {['No System', 'Manual WhatsApp', 'Clunky ERP', 'Premium Portal'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">PC3: Vision</label>
                    <select value={pc3} onChange={(e) => setPc3(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none">
                      {['Marks-Only', 'Holistic/Life-Skills', 'Tech-Forward'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col border-l border-indigo-200 pl-4">
                    <label className="text-[10px] font-black text-indigo-500 uppercase mb-2 ml-1 tracking-widest">Pipeline Target</label>
                    <select value={engineTarget} onChange={(e) => setEngineTarget(e.target.value)} className="w-full px-3 py-2.5 bg-indigo-600 text-white border border-indigo-700 rounded-xl text-xs font-bold outline-none">
                      <option value={1}>🚀 E1 (Active Sales)</option>
                      <option value={2}>💧 E2 (Nurture)</option>
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isAdding} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-md disabled:opacity-70 mt-4 uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center justify-center">
                {isAdding ? 'Processing...' : editingId ? 'Update Target & Reroute' : 'Acquire Target & Route'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}