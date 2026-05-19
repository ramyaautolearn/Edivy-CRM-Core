import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, MapPin, User, Star, ShieldCheck, Edit, Trash2, X, Zap, Users, Target, Flame, Download, UploadCloud
} from 'lucide-react';
import {
  collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

export default function LeadEngine() {
  const [leads, setLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    if (!db) return;

    const unsubLeads = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'leads'),
      (snap) => {
        const allLeads = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setLeads(allLeads.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      }
    );

    const unsubAgents = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'users'),
      (snap) => {
        const allUsers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAgents(allUsers.filter((u) => u.role === 'staff' || u.role === 'admin'));
      }
    );

    return () => {
      unsubLeads();
      unsubAgents();
    };
  }, []);

  const calculateEdivyScore = (tier, tech, vision, role) => {
    let score = 30; // Base score
    if (tier === 'Elite/Professional') score += 20;
    if (tech === 'Manual WhatsApp') score += 25;
    if (vision === 'Holistic/Life-Skills') score += 15;

    const roleScores = { 'Owner / Founder': 25, 'Principal': 20, 'Vice Principal': 10, 'Coordinator': 5 };
    score += roleScores[role] || 0;
    return score;
  };

  const handleAddOrEditLead = async (e) => {
    e.preventDefault();
    if (!db) return;

    setIsAdding(true);
    const score = calculateEdivyScore(pc1, pc2, pc3, contactRole);
    const engine = score >= 70 ? 1 : 2;

    const leadData = {
      school_name: schoolName,
      location,
      contact_name: contactName,
      contact_role: contactRole,
      phone,
      email,
      pc1,
      pc2,
      pc3,
      score,
      engine,
      stage_name: engine === 1 ? 'New Lead' : 'Awakening (Entry)',
      last_activity_at: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', editingId), leadData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), {
          ...leadData,
          assigned_to: null,
          temperature: 'Cold',
          createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (err) {
      console.error('Error saving lead:', err);
      alert("Error saving lead. Check console.");
    } finally {
      setIsAdding(false);
    }
  };

  // --- CSV EXPORT ---
  const handleExportCSV = () => {
    const headers = ['School Name', 'Location', 'Contact Name', 'Role', 'Phone', 'Email', 'Tier', 'Tech', 'Vision', 'Score', 'Engine'];
    const csvContent = [
      headers.join(','),
      ...leads.map(l => [
        `"${l.school_name || ''}"`, `"${l.location || ''}"`, `"${l.contact_name || ''}"`, `"${l.contact_role || ''}"`,
        `"${l.phone || ''}"`, `"${l.email || ''}"`, `"${l.pc1 || ''}"`, `"${l.pc2 || ''}"`, `"${l.pc3 || ''}"`,
        l.score, l.engine
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `edivy_leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --- CSV IMPORT ---
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
          if (rows[i].length < 2 || !rows[i][0]) continue; // Skip empty rows
          
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

  const openEditModal = (lead) => {
    setEditingId(lead.id);
    setSchoolName(lead.school_name || '');
    setLocation(lead.location || '');
    setContactName(lead.contact_name || '');
    setContactRole(lead.contact_role || 'Principal');
    setPhone(lead.phone || '');
    setEmail(lead.email || '');
    setPc1(lead.pc1 || 'Middle-Income');
    setPc2(lead.pc2 || 'No System');
    setPc3(lead.pc3 || 'Marks-Only');
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setSchoolName(''); setLocation(''); setContactName(''); setContactRole('Principal');
    setPhone(''); setEmail(''); setPc1('Middle-Income'); setPc2('No System'); setPc3('Marks-Only');
    setShowModal(false);
  };

  const handleAssign = async (leadId, agentId) => {
    if (!db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', leadId), { assigned_to: agentId || null });
  };

  const handleDeleteLead = async (id) => {
    if (window.confirm('Permanently delete this lead?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', id));
    }
  };

  const filteredLeads = leads.filter((l) => (l.school_name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Lead Scoring Engine</h2>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Hidden File Input for CSV */}
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
          
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl flex items-center shadow-sm text-xs uppercase tracking-widest transition-all">
            <UploadCloud className="w-4 h-4 mr-2 text-slate-400" /> {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          
          <button onClick={handleExportCSV} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl flex items-center shadow-sm text-xs uppercase tracking-widest transition-all">
            <Download className="w-4 h-4 mr-2 text-slate-400" /> Export
          </button>

          <button onClick={closeModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center shadow-lg text-xs uppercase tracking-widest transition-all active:scale-95">
            <Plus className="w-5 h-5 mr-2" /> New B2B Lead
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard icon={<Users />} label="Total Leads" value={leads.length} color="blue" />
        <MetricCard icon={<Flame />} label="Hot Leads (Score 70+)" value={leads.filter(l => l.score >= 70).length} color="orange" />
        <MetricCard icon={<Target />} label="Active Engine 1" value={leads.filter(l => l.engine === 1).length} color="emerald" />
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center">
          <Search className="w-5 h-5 mr-3 text-slate-400" />
          <input type="text" placeholder="Search school name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent outline-none text-sm font-bold w-full" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                <th className="p-4 pl-6">School & Contact</th>
                <th className="p-4">Edivy Parameters</th>
                <th className="p-4">Routing & Score</th>
                <th className="p-4">Lead Owner (Assign)</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="font-black text-slate-800 text-sm">{lead.school_name}</div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center uppercase tracking-widest font-bold">
                      <MapPin className="w-3 h-3 mr-1 text-slate-400" /> {lead.location}
                    </div>
                    <div className="text-[10px] font-black text-indigo-600 mt-1.5 flex items-center uppercase tracking-widest">
                      <User className="w-3 h-3 mr-1" /> {lead.contact_name} ({lead.contact_role || 'Contact'})
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 tracking-widest w-max">PC1: {lead.pc1}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 tracking-widest w-max">PC2: {lead.pc2}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 tracking-widest w-max">PC3: {lead.pc3}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center text-yellow-500 font-black text-sm">
                        <Star className="w-4 h-4 mr-1 fill-current" /> {lead.score}
                      </div>
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded border text-center uppercase tracking-widest w-max ${lead.engine === 1 ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {lead.engine === 1 ? '🚀 ENGINE 1' : '💧 ENGINE 2'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <ShieldCheck className={`w-4 h-4 mr-2 ${lead.assigned_to ? 'text-emerald-500' : 'text-slate-200'}`} />
                      <select
                        value={lead.assigned_to || ''}
                        onChange={(e) => handleAssign(lead.id, e.target.value)}
                        className="text-[10px] font-black bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>{agent.name} ({agent.role})</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-right space-x-2">
                    <button onClick={() => openEditModal(lead)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteLead(lead.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
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

              <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4 mt-2">
                <h4 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-500 fill-current" /> Intelligence Profile
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ParameterSelect label="PC1: Tier" value={pc1} setter={setPc1} options={['Elite/Professional', 'Middle-Income', 'Mass-Market']} />
                  <ParameterSelect label="PC2: Tech" value={pc2} setter={setPc2} options={['No System', 'Manual WhatsApp', 'Clunky ERP', 'Premium Portal']} />
                  <ParameterSelect label="PC3: Vision" value={pc3} setter={setPc3} options={['Marks-Only', 'Holistic/Life-Skills', 'Tech-Forward']} />
                </div>
              </div>
              
              <button type="submit" disabled={isAdding} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-md disabled:opacity-70 mt-4 uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all">
                {isAdding ? 'Saving...' : editingId ? 'Update Target' : 'Acquire Target'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, color }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600', blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600', emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 border ${colorMap[color] || colorMap.blue}`}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{value}</h3>
      </div>
    </div>
  );
}

function ParameterSelect({ label, value, setter, options }) {
  return (
    <div className="flex flex-col">
      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">{label}</label>
      <select value={value} onChange={(e) => setter(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer text-slate-700">
        {options.map((o) => (<option key={o} value={o}>{o}</option>))}
      </select>
    </div>
  );
}