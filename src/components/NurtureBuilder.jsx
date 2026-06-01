import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Check, CheckCircle2, ChevronUp, ChevronDown, Copy, Power, Droplets, Bot, Clock, Loader2, Sparkles, Link as LinkIcon } from 'lucide-react';
import OpenAI from 'openai';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// --- ROCK-SOLID FIREBASE ENGINE (CLOUD STORAGE) ---
const appId = 'edivy-crm-vault';
// Saved to a dedicated E2 document so it never touches Engine 1!
const e2DocRef = doc(db, 'artifacts', appId, 'public', 'data', 'pipelines', 'e2_active');

const getDbData = async () => {
  const snap = await getDoc(e2DocRef);
  if (snap.exists()) return snap.data();
  const defaultData = {
    versions: [{ id: 'v1', name: 'v1.0 - Delayed Conversion Engine', status: 'active' }],
    stages: [],
    actions: []
  };
  await setDoc(e2DocRef, defaultData);
  return defaultData;
};

const e2Api = {
  getVersions: async () => (await getDbData()).versions || [],
  setActiveVersion: async (id) => {
    const data = await getDbData();
    if (data.versions) data.versions.forEach(v => v.status = (v.id === id ? 'active' : 'draft'));
    await updateDoc(e2DocRef, { versions: data.versions });
    return data.versions;
  },
  duplicateVersion: async (vId, newName) => {
    const data = await getDbData();
    if (!data.versions) data.versions = [];
    data.versions.push({ id: 'v_' + Date.now(), name: newName, status: 'draft' });
    await updateDoc(e2DocRef, { versions: data.versions });
    return data.versions;
  },
  getStages: async (vId) => ((await getDbData()).stages || []).filter(s => s.version_id === vId).sort((a,b) => a.order - b.order),
  saveStage: async (stage) => {
    const data = await getDbData();
    if (!data.stages) data.stages = [];
    data.stages.push({ ...stage, id: 'stage_' + Date.now(), order: data.stages.length });
    await updateDoc(e2DocRef, { stages: data.stages });
  },
  updateStage: async (id, name) => {
    const data = await getDbData();
    const s = (data.stages || []).find(s => s.id === id);
    if (s) s.name = name;
    await updateDoc(e2DocRef, { stages: data.stages });
  },
  deleteStage: async (id) => {
    const data = await getDbData();
    data.stages = (data.stages || []).filter(s => s.id !== id);
    data.actions = (data.actions || []).filter(a => a.stage_id !== id);
    await updateDoc(e2DocRef, { stages: data.stages, actions: data.actions });
  },
  reorderStages: async (ids) => {
    const data = await getDbData();
    ids.forEach((id, idx) => {
      const s = (data.stages || []).find(x => x.id === id);
      if (s) s.order = idx;
    });
    await updateDoc(e2DocRef, { stages: data.stages });
  },
  getActions: async (sId) => ((await getDbData()).actions || []).filter(a => a.stage_id === sId).sort((a,b) => a.order - b.order),
  saveAction: async (action) => {
    const data = await getDbData();
    if (!data.actions) data.actions = [];
    if (action.id) {
      const idx = data.actions.findIndex(a => a.id === action.id);
      if (idx > -1) data.actions[idx] = { ...data.actions[idx], ...action };
    } else {
      data.actions.push({ ...action, id: 'action_' + Date.now(), order: data.actions.length });
    }
    await updateDoc(e2DocRef, { actions: data.actions });
  },
  deleteAction: async (id) => {
    const data = await getDbData();
    data.actions = (data.actions || []).filter(a => a.id !== id);
    await updateDoc(e2DocRef, { actions: data.actions });
  },
  reorderActions: async (ids) => {
    const data = await getDbData();
    ids.forEach((id, idx) => {
      const a = (data.actions || []).find(x => x.id === id);
      if (a) a.order = idx;
    });
    await updateDoc(e2DocRef, { actions: data.actions });
  }
};
// ------------------------------------------------

export default function E2NurtureBuilder() {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [stages, setStages] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
  const [actions, setActions] = useState([]);
  const [isEditingStage, setIsEditingStage] = useState(null);
  const [stageNameInput, setStageNameInput] = useState('');
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize Groq AI (Paste your key here!)
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const groq = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true 
  });

  const [newAction, setNewAction] = useState({
    id: null, title: '', description: '', execution_type: 'auto',
    delay_value: 0, delay_unit: 'days', type: 'whatsapp', ai_guidance: '', resource_text: '', media_url: ''
  });
  
  const [isActionFormOpen, setIsActionFormOpen] = useState(false);

  useEffect(() => { loadVersions(); }, []);

  const loadVersions = async () => {
    const vData = await e2Api.getVersions();
    setVersions(vData);
    if (vData.length > 0 && !selectedVersion)
      setSelectedVersion(vData.find((v) => v.status === 'active') || vData[0]);
  };

  useEffect(() => { if (selectedVersion) loadStages(selectedVersion.id); }, [selectedVersion]);

  const loadStages = async (vId = selectedVersion?.id) => {
    if (!vId) return;
    const data = await e2Api.getStages(vId);
    setStages(data);
    if (data.length > 0) setSelectedStage(data[0]);
    else { setSelectedStage(null); setActions([]); }
  };

  useEffect(() => {
    if (selectedStage) e2Api.getActions(selectedStage.id).then(setActions);
  }, [selectedStage]);

  const handleCreateVersion = async () => {
    const newName = prompt('Enter a name for the new Draft version:');
    if (!newName) return;
    const updatedVersions = await e2Api.duplicateVersion(selectedVersion.id, newName);
    setVersions(updatedVersions);
    setSelectedVersion(updatedVersions[updatedVersions.length - 1]);
  };

  const handleMakeActive = async () => {
    if (window.confirm(`Make ${selectedVersion.name} the LIVE active E2 pipeline?`)) {
      const updatedVersions = await e2Api.setActiveVersion(selectedVersion.id);
      setVersions([...updatedVersions]);
      alert('E2 Pipeline is now live!');
    }
  };

  const handleSaveNewStage = async () => {
    if (!newStageName.trim()) return;
    await e2Api.saveStage({ name: newStageName, version_id: selectedVersion.id });
    setNewStageName(''); setIsAddingStage(false); loadStages();
  };

  const handleDeleteStage = async (id) => {
    if (window.confirm('Delete this stage?')) {
      await e2Api.deleteStage(id);
      if (selectedStage?.id === id) setSelectedStage(null);
      loadStages();
    }
  };

  const handleSaveStageEdit = async (id) => {
    if (!stageNameInput.trim()) return;
    await e2Api.updateStage(id, stageNameInput);
    setIsEditingStage(null); loadStages();
  };

  const openActionForm = (action = null) => {
    if (action) {
      setNewAction({ 
        ...action,
        resource_text: action.resource_text || '',
        media_url: action.media_url || ''
      });
    } else {
      setNewAction({
        id: null, title: '', description: '', execution_type: 'auto',
        delay_value: 0, delay_unit: 'days', type: 'whatsapp', ai_guidance: '', resource_text: '', media_url: ''
      });
    }
    setIsActionFormOpen(true);
  };

  // --- LIVE GROQ AI GENERATOR ---
  const handleGenerateAIPreview = async () => {
    if (!newAction.ai_guidance.trim()) return alert("Please enter instructions in the AI Guidance box first!");
    if (!apiKey || apiKey === "gsk_YOUR_ACTUAL_KEY_HERE") return alert("Missing API Key! Please paste it in the code.");

    setIsGenerating(true);
    try {
      const prompt = `
        You are an elite B2B SaaS sales copywriter for Edivy (a premium CRM and communication platform for schools).
        
        Based on the following guidance, write a highly-converting, concise WhatsApp nurture script.
        Use {contact_name} for the prospect's name. No fluff, no aggressive corporate jargon. Be consultative and educational.

        Guidance: "${newAction.ai_guidance}"

        Please provide ONLY the script text. Do not include any explanations or quotes around it.
      `;

      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{"role": "system", "content": prompt}],
        temperature: 0.7,
      });

      const generatedScript = response.choices[0].message.content.trim();
      setNewAction({ ...newAction, resource_text: generatedScript });
      
    } catch (error) {
      console.error("Groq AI Error:", error);
      alert("Failed to generate AI script. Please check your API Key and terminal logs.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAction = async (e) => {
    e.preventDefault();
    await e2Api.saveAction({ ...newAction, stage_id: selectedStage.id });
    setActions(await e2Api.getActions(selectedStage.id));
    setIsActionFormOpen(false);
  };

  const handleDeleteAction = async (id) => {
    if (window.confirm('Delete this action?')) {
      await e2Api.deleteAction(id);
      setActions(await e2Api.getActions(selectedStage.id));
    }
  };

  const moveStage = async (e, index, direction) => {
    e.stopPropagation();
    if ((direction === -1 && index === 0) || (direction === 1 && index === stages.length - 1)) return;
    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[index + direction];
    newStages[index + direction] = temp;
    setStages(newStages);
    await e2Api.reorderStages(newStages.map(s => s.id));
  };

  const moveAction = async (e, index, direction) => {
    e.stopPropagation();
    if ((direction === -1 && index === 0) || (direction === 1 && index === actions.length - 1)) return;
    const newActions = [...actions];
    const temp = newActions[index];
    newActions[index] = newActions[index + direction];
    newActions[index + direction] = temp;
    setActions(newActions);
    await e2Api.reorderActions(newActions.map(a => a.id));
  };

  if (!selectedVersion) return <div className="p-10 text-center text-gray-500">Loading E2 Architecture...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] pb-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-black text-blue-900 flex items-center">
            <Droplets className="w-6 h-6 mr-2 text-blue-500" /> Engine 2: Delayed Conversion
            <span className={`ml-3 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                selectedVersion.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
              }`}>
              {selectedVersion.status === 'active' ? 'LIVE - Auto Nurturing' : 'DRAFT MODE'}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedVersion.id} onChange={(e) => setSelectedVersion(versions.find((v) => v.id === e.target.value))} className="bg-slate-50 border border-gray-200 rounded-lg px-4 py-2 font-bold text-blue-700 outline-none">
            {versions.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
          </select>
          {selectedVersion.status === 'draft' && (
            <button onClick={handleMakeActive} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-600 transition flex items-center shadow-sm">
              <Power className="w-4 h-4 mr-1.5" /> Publish Live
            </button>
          )}
          <button onClick={handleCreateVersion} className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-100 transition flex items-center">
            <Copy className="w-4 h-4 mr-1.5" /> Duplicate
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h3 className="font-bold text-gray-800">Engine 2 Flow</h3>
            <button onClick={() => setIsAddingStage(true)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium text-sm transition flex items-center">
              <Plus className="w-4 h-4 mr-1" /> Add Stage
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {isAddingStage && (
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 flex mb-2">
                <input autoFocus value={newStageName} onChange={(e) => setNewStageName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveNewStage()} placeholder="New Nurture Stage" className="border rounded px-2 py-1 text-sm flex-1 outline-none" />
                <button onClick={handleSaveNewStage} className="ml-2 text-green-600"><Check className="w-4 h-4" /></button>
                <button onClick={() => { setIsAddingStage(false); setNewStageName(''); }} className="ml-1 text-gray-400"><X className="w-4 h-4" /></button>
              </div>
            )}
            {stages.map((stage, idx) => (
              <div key={stage.id} className={`p-3 rounded-xl border flex transition ${selectedStage?.id === stage.id ? 'bg-blue-50/50 border-blue-300' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-col border-r border-gray-200 pr-2 mr-3 justify-center text-gray-300">
                  <button onClick={(e) => moveStage(e, idx, -1)} disabled={idx === 0} className="hover:text-blue-600 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={(e) => moveStage(e, idx, 1)} disabled={idx === stages.length - 1} className="hover:text-blue-600 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div onClick={() => setSelectedStage(stage)} className="flex-1 flex items-center cursor-pointer">
                    {isEditingStage === stage.id ? (
                      <div className="flex w-full pr-2" onClick={(e) => e.stopPropagation()}>
                        <input autoFocus value={stageNameInput} onChange={(e) => setStageNameInput(e.target.value)} className="border rounded px-2 py-1 text-sm outline-none w-full" />
                        <button onClick={() => handleSaveStageEdit(stage.id)} className="ml-2 text-green-600"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setIsEditingStage(null)} className="ml-1 text-gray-400"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <span className="font-bold text-gray-800 text-sm">{stage.name}</span>
                    )}
                  </div>
                  {isEditingStage !== stage.id && (
                    <div className="flex space-x-1 opacity-60 hover:opacity-100 transition">
                      <button onClick={(e) => { e.stopPropagation(); setStageNameInput(stage.name); setIsEditingStage(stage.id); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteStage(stage.id); }} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
          {!selectedStage ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">Select an E2 stage</div>
          ) : (
            <>
              <div className="p-5 border-b border-gray-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg flex items-center">
                    Auto-Actions for "{selectedStage.name}"
                  </h3>
                </div>
                <button onClick={() => openActionForm()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" /> Schedule Action
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                {actions.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">No automations configured for this stage.</div>
                ) : (
                  actions.map((action, idx) => (
                    <div key={action.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-stretch gap-4">
                      <div className="flex flex-col justify-center border-r border-gray-100 pr-3 text-gray-300 shrink-0">
                        <button onClick={(e) => moveAction(e, idx, -1)} disabled={idx === 0} className="p-1 hover:bg-gray-50 hover:text-blue-600 rounded disabled:opacity-20"><ChevronUp className="w-5 h-5" /></button>
                        <button onClick={(e) => moveAction(e, idx, 1)} disabled={idx === actions.length - 1} className="p-1 hover:bg-gray-50 hover:text-blue-600 rounded disabled:opacity-20"><ChevronDown className="w-5 h-5" /></button>
                      </div>
                      <div className="flex-1 py-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="flex items-center text-[9px] bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded border border-blue-200 uppercase tracking-widest"><Bot className="w-3 h-3 mr-1" /> {action.execution_type === 'auto' ? 'Automated' : 'AI-Assisted'}</span>
                          <span className="flex items-center text-[9px] bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest"><Clock className="w-3 h-3 mr-1" /> {action.delay_value} {action.delay_unit}</span>
                          <h4 className="font-black text-gray-800 text-sm">{action.title}</h4>
                          {action.media_url && <LinkIcon className="w-3.5 h-3.5 text-blue-400" title="Media Attached" />}
                        </div>
                        <p className="text-xs font-medium text-gray-500 mt-1">{action.description}</p>
                      </div>
                      <div className="flex space-x-1 py-1">
                        <button onClick={() => openActionForm(action)} className="p-2 text-gray-400 hover:text-blue-600 h-max"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteAction(action.id)} className="p-2 text-gray-400 hover:text-red-600 h-max"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {isActionFormOpen && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col border-t-4 border-blue-500">
                  <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-slate-50">
                    <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">{newAction.id ? 'Edit Nurture Action' : 'Schedule Nurture Action'}</h3>
                    <button onClick={() => setIsActionFormOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={handleSaveAction} className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Action Title</label>
                        <input type="text" value={newAction.title} onChange={(e) => setNewAction({ ...newAction, title: e.target.value })} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Execution Type</label>
                        <select value={newAction.execution_type} onChange={(e) => setNewAction({ ...newAction, execution_type: e.target.value })} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer">
                          <option value="auto">Automated (System runs quietly)</option>
                          <option value="ai">AI-Assisted (Human confirms AI work)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">System/Agent Instructions</label>
                      <textarea value={newAction.description} onChange={(e) => setNewAction({ ...newAction, description: e.target.value })} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500" rows="3" required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Action Type</label>
                        <select value={newAction.type} onChange={(e) => setNewAction({ ...newAction, type: e.target.value })} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none">
                          <option value="whatsapp">WhatsApp Message</option>
                          <option value="research">System Data Sync / Logic</option>
                          <option value="wait">Intelligent Wait Logic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Delay Value</label>
                        <input type="number" min="0" value={newAction.delay_value} onChange={(e) => setNewAction({ ...newAction, delay_value: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Time Unit</label>
                        <select value={newAction.delay_unit} onChange={(e) => setNewAction({ ...newAction, delay_unit: e.target.value })} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none text-blue-700">
                          <option value="days">Days</option>
                          <option value="hours">Hours</option>
                          <option value="minutes">Minutes</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-5">
                      <h4 className="font-black text-blue-900 text-[10px] uppercase tracking-widest flex items-center">
                        <Bot className="w-4 h-4 mr-2 text-blue-500" /> Nurture Scripts & AI Auto-Pilot
                      </h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* LEFT BOX: AI Prompt */}
                        <div className="flex flex-col">
                           <label className="block text-[9px] font-black uppercase tracking-widest text-purple-600 mb-2">1. AI Guidance Prompt (The Brain)</label>
                           <textarea value={newAction.ai_guidance} onChange={(e) => setNewAction({ ...newAction, ai_guidance: e.target.value })} className="w-full border border-purple-200 rounded-xl px-4 py-3 text-sm bg-purple-50/30 outline-none focus:border-purple-500 min-h-[160px] shadow-sm mb-3" placeholder="e.g., Frame as an industry observation. NO direct pitch..." />
                           <button 
                             type="button" 
                             onClick={handleGenerateAIPreview} 
                             disabled={isGenerating}
                             className="w-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl shadow-md hover:bg-purple-700 transition flex items-center justify-center disabled:opacity-50"
                           >
                             {isGenerating ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5 mr-2" /> Generate Script</>}
                           </button>
                        </div>

                        {/* RIGHT BOX: Manual Script */}
                        <div className="flex flex-col">
                           <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">2. Approved Script (The Output)</label>
                           <textarea value={newAction.resource_text} onChange={(e) => setNewAction({ ...newAction, resource_text: e.target.value })} className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-blue-500 flex-1 min-h-[160px] shadow-sm" placeholder="Hi {contact_name}, thought you might find this interesting..." />
                           <p className="text-[9px] font-bold text-slate-400 mt-3 text-center uppercase tracking-widest">System will send exactly what is in this box.</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-blue-100">
                         <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center"><LinkIcon className="w-3 h-3 mr-1" /> Media Attachment (URL)</label>
                         <input type="text" value={newAction.media_url} onChange={(e) => setNewAction({ ...newAction, media_url: e.target.value })} className="w-full border border-blue-200 rounded-lg px-4 py-2.5 text-sm bg-white shadow-sm" placeholder="https://link-to-flyer.pdf" />
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white font-black uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-blue-700 transition shadow-md">
                      Save Action
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}