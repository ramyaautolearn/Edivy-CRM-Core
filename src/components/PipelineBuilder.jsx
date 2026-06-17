import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, X, Check, CheckCircle2, Zap, ChevronUp, ChevronDown, 
  Copy, Power, Bot, UserCog, Cog, Link as LinkIcon, Sparkles, Loader2, 
  GitMerge, GitBranch, AlertCircle, FastForward, PlayCircle, MessageSquare, Settings
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import OpenAI from 'openai';

const appId = 'edivy-crm-vault';
const pipelineDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'pipelines', 'active');

const getDbData = async () => {
  const snap = await getDoc(pipelineDocRef);
  if (snap.exists()) return snap.data();
  const defaultData = { versions: [{ id: 'v1', name: 'v1.0 - Active Pipeline', status: 'active', engine: 1 }], stages: [], tasks: [] };
  await setDoc(pipelineDocRef, defaultData);
  return defaultData;
};

const pipelineApi = {
  getPipelineVersions: async () => (await getDbData()).versions || [],
  setActiveVersion: async (id) => {
    const data = await getDbData();
    if (data.versions) data.versions.forEach(v => v.status = (v.id === id ? 'active' : 'draft'));
    await updateDoc(pipelineDocRef, { versions: data.versions, updated_at: serverTimestamp() });
    return data.versions;
  },
  duplicatePipelineVersion: async (vId, newName) => {
    const data = await getDbData();
    const newVersionId = 'v_' + Date.now();
    if (!data.versions) data.versions = [];
    data.versions.push({ id: newVersionId, name: newName, status: 'draft', engine: 1 });
    await updateDoc(pipelineDocRef, { versions: data.versions, updated_at: serverTimestamp() });
    return data.versions;
  },
  getPipelineStages: async (vId) => ((await getDbData()).stages || []).filter(s => s.version_id === vId).sort((a,b) => a.order - b.order),
  saveStage: async (stage) => {
    const data = await getDbData();
    if (!data.stages) data.stages = [];
    data.stages.push({ 
        ...stage, 
        id: 'stage_' + Date.now(), 
        order: data.stages.length,
        required_insights: [],
        fast_tracks: []
    });
    await updateDoc(pipelineDocRef, { stages: data.stages, updated_at: serverTimestamp() });
  },
  updateStage: async (updatedStage) => {
    const data = await getDbData();
    const idx = (data.stages || []).findIndex(s => s.id === updatedStage.id);
    if (idx > -1) {
        data.stages[idx] = updatedStage;
    }
    await updateDoc(pipelineDocRef, { stages: data.stages, updated_at: serverTimestamp() });
  },
  deleteStage: async (id) => {
    const data = await getDbData();
    data.stages = (data.stages || []).filter(s => s.id !== id);
    data.tasks = (data.tasks || []).filter(t => t.stage_id !== id);
    await updateDoc(pipelineDocRef, { stages: data.stages, tasks: data.tasks, updated_at: serverTimestamp() });
  },
  reorderStages: async (ids) => {
    const data = await getDbData();
    ids.forEach((id, idx) => { const s = (data.stages || []).find(x => x.id === id); if (s) s.order = idx; });
    await updateDoc(pipelineDocRef, { stages: data.stages, updated_at: serverTimestamp() });
  },
  getTaskTemplates: async (sId) => ((await getDbData()).tasks || []).filter(t => t.stage_id === sId).sort((a,b) => a.order - b.order),
  saveTaskTemplate: async (task) => {
    const data = await getDbData();
    if (!data.tasks) data.tasks = [];
    if (task.id) {
      const idx = data.tasks.findIndex(t => t.id === task.id);
      if (idx > -1) data.tasks[idx] = { ...data.tasks[idx], ...task };
    } else {
      data.tasks.push({ ...task, id: 'task_' + Date.now(), order: data.tasks.length });
    }
    await updateDoc(pipelineDocRef, { tasks: data.tasks, updated_at: serverTimestamp() });
  },
  deleteTaskTemplate: async (id) => {
    const data = await getDbData();
    data.tasks = (data.tasks || []).filter(t => t.id !== id);
    await updateDoc(pipelineDocRef, { tasks: data.tasks, updated_at: serverTimestamp() });
  },
  reorderTasks: async (ids) => {
    const data = await getDbData();
    ids.forEach((id, idx) => { const t = (data.tasks || []).find(x => x.id === id); if (t) t.order = idx; });
    await updateDoc(pipelineDocRef, { tasks: data.tasks, updated_at: serverTimestamp() });
  }
};

export default function AdminPipelineBuilder() {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [stages, setStages] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
  const [tasks, setTasks] = useState([]);
  
  const [isEditingStage, setIsEditingStage] = useState(null);
  const [editingStageData, setEditingStageData] = useState(null);
  
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);

  const [newTask, setNewTask] = useState({
    id: null, title: '', description: '', execution_type: 'human', is_mandatory: true,
    delay_value: 0, delay_unit: 'minutes', type: 'whatsapp', priority: 2,
    ai_guidance: '', resource_text: '', media_url: '', outcomes: []
  });
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  useEffect(() => { loadVersions(); }, []);

  const loadVersions = async () => {
    const vData = await pipelineApi.getPipelineVersions();
    setVersions(vData);
    if (vData.length > 0 && !selectedVersion) setSelectedVersion(vData.find((v) => v.status === 'active') || vData[0]);
  };

  useEffect(() => { if (selectedVersion) loadStages(selectedVersion.id); }, [selectedVersion]);

  const loadStages = async (vId = selectedVersion?.id) => {
    if (!vId) return;
    const data = await pipelineApi.getPipelineStages(vId);
    setStages(data);
    
    if (data.length > 0) {
        if (selectedStage) {
            const updatedSelectedStage = data.find(s => s.id === selectedStage.id);
            setSelectedStage(updatedSelectedStage || data[0]);
        } else {
            setSelectedStage(data[0]);
        }
    } else { 
        setSelectedStage(null); 
        setTasks([]); 
    }
  };

  useEffect(() => { if (selectedStage) pipelineApi.getTaskTemplates(selectedStage.id).then(setTasks); }, [selectedStage]);

  const handleCreateVersion = async () => {
    const newName = prompt('Enter a name for the new Draft version:');
    if (!newName) return;
    const updatedVersions = await pipelineApi.duplicatePipelineVersion(selectedVersion.id, newName);
    setVersions(updatedVersions);
    setSelectedVersion(updatedVersions[updatedVersions.length - 1]);
  };

  const handleMakeActive = async () => {
    if (window.confirm(`Make ${selectedVersion.name} the LIVE active pipeline?`)) {
      const updatedVersions = await pipelineApi.setActiveVersion(selectedVersion.id);
      setVersions([...updatedVersions]);
      alert('Pipeline is now live!');
    }
  };

  const handleSaveNewStage = async () => {
    if (!newStageName.trim()) return;
    await pipelineApi.saveStage({ name: newStageName, version_id: selectedVersion.id, stage_briefing_text: '' });
    setNewStageName(''); setIsAddingStage(false); loadStages();
  };

  const handleDeleteStage = async (id) => {
    if (window.confirm('Delete this stage and all its tasks?')) { await pipelineApi.deleteStage(id); if (selectedStage?.id === id) setSelectedStage(null); loadStages(); }
  };

  const openStageEditor = (stage) => {
    setIsEditingStage(stage.id);
    setEditingStageData({ ...stage, required_insights: stage.required_insights || [], fast_tracks: stage.fast_tracks || [] });
  };

  const handleSaveStageEdit = async () => {
    if (!editingStageData.name.trim()) return;
    await pipelineApi.updateStage(editingStageData);
    setIsEditingStage(null); 
    setEditingStageData(null);
    loadStages();
  };

  const parseOffset = (days) => {
    if (days === 0) return { val: 0, unit: 'minutes' };
    if (days < 1 / 24) return { val: Math.round(days * 24 * 60), unit: 'minutes' };
    if (days < 1) return { val: Math.round(days * 24), unit: 'hours' };
    return { val: days, unit: 'days' };
  };

  const openTaskForm = (task = null) => {
    if (task) {
      const { val, unit } = parseOffset(task.offset_days || 0);
      setNewTask({ 
        ...task, delay_value: val, delay_unit: unit,
        execution_type: task.execution_type || 'human',
        type: task.action_type || task.type || 'whatsapp',
        ai_guidance: task.ai_guidance || '', 
        resource_text: task.override_script || task.resource_text || '', 
        media_url: task.media_url || '',
        outcomes: task.outcomes || []
      });
    } else {
      setNewTask({
        id: null, title: '', description: '', execution_type: 'human', is_mandatory: true,
        delay_value: 0, delay_unit: 'minutes', type: 'whatsapp', priority: 2,
        ai_guidance: '', resource_text: '', media_url: '', outcomes: []
      });
    }
    setIsTaskFormOpen(true);
  };

  // --- SAFE LIVE GROQ AI GENERATOR ---
  const handleGenerateAIPreview = async () => {
    if (!newTask.ai_guidance.trim()) return alert("Please enter instructions in the AI Guidance box first!");
    
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) return alert("Missing API Key! Ensure VITE_GROQ_API_KEY is in your .env file.");

    setIsGenerating(true);
    try {
      // Instantiated safely only when the action executes
      const groq = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.groq.com/openai/v1",
        dangerouslyAllowBrowser: true 
      });

      const prompt = `
        You are an elite B2B SaaS sales copywriter for Edivy (a premium CRM and communication platform for schools).
        
        Based on the following guidance, write a highly-converting, concise script.
        Use {contact_name} for the prospect's name. No fluff, no aggressive corporate jargon. Be consultative.

        Guidance: "${newTask.ai_guidance}"

        Please provide ONLY the script text. Do not include any explanations or quotes around it.
      `;

      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{"role": "system", "content": prompt}],
        temperature: 0.7,
      });

      const generatedScript = response.choices[0].message.content.trim();
      setNewTask({ ...newTask, resource_text: generatedScript });
      
    } catch (error) {
      console.error("Groq AI Error:", error);
      alert("Failed to generate AI script. Please check your API Key and terminal logs.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    let multiplier = 1;
    if (newTask.delay_unit === 'minutes') multiplier = 1 / (24 * 60);
    else if (newTask.delay_unit === 'hours') multiplier = 1 / 24;
    
    const finalTaskPayload = {
      ...newTask,
      name: newTask.title,
      action_type: newTask.type,
      instructions: newTask.description,
      override_script: newTask.resource_text,
      ai_guidance: newTask.ai_guidance,
      media_url: newTask.media_url || '',
      stage_id: selectedStage.id,
      offset_days: newTask.delay_value * multiplier,
      outcomes: newTask.outcomes || []
    };
    
    await pipelineApi.saveTaskTemplate(finalTaskPayload);
    setTasks(await pipelineApi.getTaskTemplates(selectedStage.id));
    setIsTaskFormOpen(false);
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Delete task?')) { await pipelineApi.deleteTaskTemplate(id); setTasks(await pipelineApi.getTaskTemplates(selectedStage.id)); }
  };

  const moveStage = async (e, index, direction) => {
    e.stopPropagation();
    if ((direction === -1 && index === 0) || (direction === 1 && index === stages.length - 1)) return;
    const newStages = [...stages];
    const temp = newStages[index]; newStages[index] = newStages[index + direction]; newStages[index + direction] = temp;
    setStages(newStages); await pipelineApi.reorderStages(newStages.map(s => s.id));
  };

  const moveTask = async (e, index, direction) => {
    e.stopPropagation();
    if ((direction === -1 && index === 0) || (direction === 1 && index === tasks.length - 1)) return;
    const newTasks = [...tasks];
    const temp = newTasks[index]; newTasks[index] = newTasks[index + direction]; newTasks[index + direction] = temp;
    setTasks(newTasks); await pipelineApi.reorderTasks(newTasks.map(t => t.id));
  };

  const renderExecutionBadge = (type) => {
    switch(type) {
      case 'ai': return <span className="flex items-center text-[9px] bg-purple-100 text-purple-700 font-black px-2 py-0.5 rounded border border-purple-200 uppercase tracking-widest"><Bot className="w-3 h-3 mr-1" /> AI-Assisted</span>;
      case 'auto': return <span className="flex items-center text-[9px] bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-widest"><Cog className="w-3 h-3 mr-1" /> Automated</span>;
      default: return <span className="flex items-center text-[9px] bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded border border-blue-200 uppercase tracking-widest"><UserCog className="w-3 h-3 mr-1" /> Human</span>;
    }
  };

  if (!selectedVersion) return <div className="p-10 text-center text-gray-500">Loading Pipeline Architecture...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] pb-6 relative">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center">
            Pipeline Architecture
            <span className={`ml-3 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                selectedVersion.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
              }`}>
              {selectedVersion.status === 'active' ? 'LIVE - Accepting Leads' : 'DRAFT MODE'}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedVersion.id} onChange={(e) => setSelectedVersion(versions.find((v) => v.id === e.target.value))} className="bg-slate-50 border border-gray-200 rounded-lg px-4 py-2 font-bold text-indigo-700 outline-none">
            {versions.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
          </select>
          {selectedVersion.status === 'draft' && (
            <button onClick={handleMakeActive} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-600 transition flex items-center shadow-sm">
              <Power className="w-4 h-4 mr-1.5" /> Publish Live
            </button>
          )}
          <button onClick={handleCreateVersion} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-100 transition flex items-center">
            <Copy className="w-4 h-4 mr-1.5" /> Duplicate to Draft
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        
        {/* STAGES LIST */}
        <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h3 className="font-bold text-gray-800">Engine 1 Stages</h3>
            <button onClick={() => setIsAddingStage(true)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-medium text-sm transition flex items-center">
              <Plus className="w-4 h-4 mr-1" /> Add Stage
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {isAddingStage && (
              <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50 flex mb-2">
                <input autoFocus value={newStageName} onChange={(e) => setNewStageName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveNewStage()} placeholder="New Stage Name" className="border rounded px-2 py-1 text-sm flex-1 outline-none" />
                <button onClick={handleSaveNewStage} className="ml-2 text-green-600"><Check className="w-4 h-4" /></button>
                <button onClick={() => { setIsAddingStage(false); setNewStageName(''); }} className="ml-1 text-gray-400"><X className="w-4 h-4" /></button>
              </div>
            )}
            
            {stages.map((stage, idx) => (
              <div key={stage.id} className={`p-3 rounded-xl border flex transition ${selectedStage?.id === stage.id ? 'bg-indigo-50/50 border-indigo-300' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-col border-r border-gray-200 pr-2 mr-3 justify-center text-gray-300">
                  <button onClick={(e) => moveStage(e, idx, -1)} disabled={idx === 0} className="hover:text-indigo-600 disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={(e) => moveStage(e, idx, 1)} disabled={idx === stages.length - 1} className="hover:text-indigo-600 disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 flex justify-between items-start">
                  <div onClick={() => setSelectedStage(stage)} className="flex-1 flex flex-col cursor-pointer mt-0.5">
                    <span className="font-bold text-gray-800 text-sm">{stage.name}</span>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {stage.required_insights?.length > 0 && <span className="text-[8px] font-bold text-amber-500 bg-amber-50 border border-amber-200 px-1 rounded uppercase tracking-widest">{stage.required_insights.length} Insights</span>}
                      {stage.fast_tracks?.length > 0 && <span className="text-[8px] font-bold text-emerald-500 bg-emerald-50 border border-emerald-200 px-1 rounded uppercase tracking-widest">{stage.fast_tracks.length} Fast-Tracks</span>}
                    </div>
                  </div>
                  <div className="flex space-x-1 opacity-60 hover:opacity-100 transition h-max">
                    <button onClick={(e) => { e.stopPropagation(); openStageEditor(stage); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Settings className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteStage(stage.id); }} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TASKS LIST */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
          {!selectedStage ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">Select a stage</div>
          ) : (
            <>
              <div className="p-5 border-b border-gray-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-indigo-600" /> Tasks for "{selectedStage.name}"
                  </h3>
                </div>
                <button onClick={() => openTaskForm()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center">
                  <Plus className="w-4 h-4 mr-1" /> Add Protocol
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                {tasks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">No tasks configured.</div>
                ) : (
                  tasks.map((task, idx) => (
                    <div key={task.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-stretch gap-4 hover:border-indigo-300 transition-colors group">
                      <div className="flex flex-col justify-center border-r border-gray-100 pr-3 text-gray-300 shrink-0">
                        <button onClick={(e) => moveTask(e, idx, -1)} disabled={idx === 0} className="p-1 hover:bg-gray-50 hover:text-indigo-600 rounded disabled:opacity-20"><ChevronUp className="w-5 h-5" /></button>
                        <button onClick={(e) => moveTask(e, idx, 1)} disabled={idx === tasks.length - 1} className="p-1 hover:bg-gray-50 hover:text-indigo-600 rounded disabled:opacity-20"><ChevronDown className="w-5 h-5" /></button>
                      </div>
                      <div className="flex-1 py-1">
                        <div className="flex items-center gap-3 mb-1">
                          {renderExecutionBadge(task.execution_type)}
                          <h4 className="font-black text-gray-800 text-sm">{task.name || task.title}</h4>
                          {task.outcomes?.length > 0 && <span className="bg-blue-100 text-blue-700 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-blue-200 flex items-center"><GitBranch className="w-2.5 h-2.5 mr-1"/> Branches</span>}
                          {task.media_url && <LinkIcon className="w-3.5 h-3.5 text-indigo-400" title="Media Attached" />}
                        </div>
                        <p className="text-xs font-medium text-gray-500 mt-1">{task.instructions || task.description}</p>
                      </div>
                      <div className="flex items-center space-x-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openTaskForm(task)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors">Edit</button>
                        <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* STAGE EDITOR MODAL */}
      {isEditingStage && editingStageData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-slate-800 flex items-center"><Settings className="w-5 h-5 mr-2 text-indigo-500" /> Configure Stage Parameters</h3>
              <button onClick={() => { setIsEditingStage(null); setEditingStageData(null); }} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 bg-slate-50/30">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Stage Name</label>
                  <input type="text" value={editingStageData.name} onChange={e => setEditingStageData({...editingStageData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Tactical Stage Briefing (AI Context)</label>
                  <textarea value={editingStageData.stage_briefing_text || ''} onChange={e => setEditingStageData({...editingStageData, stage_briefing_text: e.target.value})} placeholder="Provide context for the AI prompt generator..." className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium text-slate-700 outline-none focus:border-indigo-500 h-32" />
                </div>
              </div>

              {/* Required Insights */}
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-amber-200/50 pb-3">
                  <div>
                    <h4 className="font-black text-amber-900 flex items-center text-sm"><AlertCircle className="w-4 h-4 mr-2 text-amber-600" /> Required Insights (Data Capture)</h4>
                    <p className="text-[10px] uppercase tracking-widest text-amber-700/70 font-bold mt-1">Fields the agent must fill out during this stage to feed the AI generator.</p>
                  </div>
                  <button onClick={() => setEditingStageData({...editingStageData, required_insights: [...editingStageData.required_insights, '']})} className="bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center"><Plus className="w-3 h-3 mr-1"/> Add Field</button>
                </div>
                <div className="space-y-3">
                  {editingStageData.required_insights.map((insight, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={insight} onChange={(e) => {
                          const newArr = [...editingStageData.required_insights]; newArr[idx] = e.target.value; setEditingStageData({...editingStageData, required_insights: newArr});
                      }} placeholder="e.g., 'Current Competitor' or 'Biggest Pain Point'" className="flex-1 bg-white border border-amber-200 p-2.5 rounded-lg font-bold text-sm outline-none focus:border-amber-400 shadow-sm" />
                      <button onClick={() => {
                          const newArr = editingStageData.required_insights.filter((_, i) => i !== idx); setEditingStageData({...editingStageData, required_insights: newArr});
                      }} className="bg-white border border-amber-200 text-amber-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-2.5 rounded-lg transition-colors shadow-sm"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  {editingStageData.required_insights.length === 0 && <p className="text-xs text-amber-700/50 font-medium bg-amber-100/50 p-3 rounded-lg border border-dashed border-amber-300">No required insights configured.</p>}
                </div>
              </div>

              {/* Fast Track Triggers */}
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-emerald-200/50 pb-3">
                  <div>
                    <h4 className="font-black text-emerald-900 flex items-center text-sm"><FastForward className="w-4 h-4 mr-2 text-emerald-600" /> Fast-Track Triggers (God Mode)</h4>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-700/70 font-bold mt-1">Conditions that instantly bypass remaining tasks and jump to a new stage.</p>
                  </div>
                  <button onClick={() => setEditingStageData({...editingStageData, fast_tracks: [...editingStageData.fast_tracks, { trigger: '', target_stage_id: '' }]})} className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center"><Plus className="w-3 h-3 mr-1"/> Add Trigger</button>
                </div>
                <div className="space-y-3">
                  {editingStageData.fast_tracks.map((ft, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" value={ft.trigger} onChange={(e) => {
                          const newArr = [...editingStageData.fast_tracks]; newArr[idx].trigger = e.target.value; setEditingStageData({...editingStageData, fast_tracks: newArr});
                      }} placeholder="Condition (e.g., 'Leadership requests meeting')" className="flex-1 bg-white border border-emerald-200 p-2.5 rounded-lg font-bold text-sm outline-none focus:border-emerald-400 shadow-sm" />
                      
                      <select value={ft.target_stage_id} onChange={(e) => {
                          const newArr = [...editingStageData.fast_tracks]; newArr[idx].target_stage_id = e.target.value; setEditingStageData({...editingStageData, fast_tracks: newArr});
                      }} className="w-1/3 bg-white border border-emerald-200 p-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest outline-none focus:border-emerald-400 shadow-sm">
                        <option value="">Jump To...</option>
                        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>

                      <button onClick={() => {
                          const newArr = editingStageData.fast_tracks.filter((_, i) => i !== idx); setEditingStageData({...editingStageData, fast_tracks: newArr});
                      }} className="bg-white border border-emerald-200 text-emerald-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-2.5 rounded-lg transition-colors shadow-sm"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  {editingStageData.fast_tracks.length === 0 && <p className="text-xs text-emerald-700/50 font-medium bg-emerald-100/50 p-3 rounded-lg border border-dashed border-emerald-300">No fast-tracks configured.</p>}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 shrink-0 bg-white rounded-b-3xl">
              <button onClick={handleSaveStageEdit} className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-md">Apply Stage Configuration</button>
            </div>
          </div>
        </div>
      )}

      {/* TASK EDITOR MODAL */}
      {isTaskFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <h3 className="font-black text-xl text-slate-800 flex items-center"><GitMerge className="w-5 h-5 mr-2 text-indigo-500"/> {newTask.id ? 'Edit Execution Protocol' : 'New Execution Protocol'}</h3>
              <button onClick={() => setIsTaskFormOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <form id="task-form" onSubmit={handleSaveTask} className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/30">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Task Title</label>
                    <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Execution Type</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {['human', 'ai'].map(type => (
                        <button key={type} type="button" onClick={() => setNewTask({ ...newTask, execution_type: type })} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center ${newTask.execution_type === type ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                          {type === 'ai' ? <Bot className="w-3.5 h-3.5 mr-1.5"/> : <UserCog className="w-3.5 h-3.5 mr-1.5"/>} {type === 'ai' ? 'AI-Assisted' : 'Human'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Agent Instructions / Context</label>
                  <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 h-20" required placeholder="What exactly should the agent do during this task?" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Action Type</label>
                    <select value={newTask.type} onChange={(e) => setNewTask({ ...newTask, type: e.target.value })} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none shadow-sm cursor-pointer">
                      <option value="whatsapp">WhatsApp Message</option>
                      <option value="email">Email Draft</option>
                      <option value="call">Phone Call</option>
                      <option value="research">Manual Research / Admin Task</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Wait Delay</label>
                    <input type="number" min="0" value={newTask.delay_value} onChange={(e) => setNewTask({ ...newTask, delay_value: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Time Unit</label>
                    <select value={newTask.delay_unit} onChange={(e) => setNewTask({ ...newTask, delay_unit: e.target.value })} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none text-indigo-700 shadow-sm cursor-pointer">
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {newTask.type !== 'research' && (
                <div className="bg-purple-50/30 border border-purple-100 rounded-2xl p-6 shadow-sm">
                  <h4 className="font-black text-purple-900 text-sm flex items-center mb-4">
                    <Bot className="w-5 h-5 mr-2 text-purple-500" /> AI Auto-Pilot & Approved Scripts
                  </h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                       <label className="block text-[9px] font-black uppercase tracking-widest text-purple-600 mb-2">1. AI Guidance Prompt (The Brain)</label>
                       <textarea value={newTask.ai_guidance} onChange={(e) => setNewTask({ ...newTask, ai_guidance: e.target.value })} className="w-full border border-purple-200 rounded-xl px-4 py-3 text-sm bg-purple-50/50 outline-none focus:border-purple-500 min-h-[160px] shadow-sm mb-3" placeholder="e.g., Review the pain point collected. Write a casual 2-sentence reply offering a demo to solve it..." />
                       <button type="button" onClick={handleGenerateAIPreview} disabled={isGenerating || !newTask.ai_guidance} className="w-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-3.5 rounded-xl shadow-md hover:bg-purple-700 transition flex items-center justify-center disabled:opacity-50">
                         {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Test AI Generation</>}
                       </button>
                    </div>

                    <div className="flex flex-col">
                       <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">2. Approved Manual Script (The Output)</label>
                       <textarea value={newTask.resource_text} onChange={(e) => setNewTask({ ...newTask, resource_text: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-indigo-500 flex-1 min-h-[160px] shadow-sm" placeholder="Hi {contact_name}, here is the info you requested..." />
                       <p className="text-[9px] font-bold text-slate-400 mt-3 text-center uppercase tracking-widest">If Execution Type is Human, agents will just copy this box.</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-purple-100">
                     <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center"><LinkIcon className="w-3 h-3 mr-1" /> External Media Attachment (URL)</label>
                     <input type="text" value={newTask.media_url} onChange={(e) => setNewTask({ ...newTask, media_url: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white shadow-sm outline-none focus:border-purple-400" placeholder="https://link-to-video-or-pdf.com" />
                  </div>
                </div>
              )}

              {/* Conditional Outcomes Branching */}
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
                <div className="flex justify-between items-center mb-5 border-b border-blue-200/50 pb-4">
                  <div>
                    <h4 className="font-black text-blue-900 flex items-center text-sm"><GitBranch className="w-5 h-5 mr-2 text-blue-600" /> Conditional Outcomes (Branching Logic)</h4>
                    <p className="text-[10px] uppercase tracking-widest text-blue-700/70 font-bold mt-1">Force the agent to log the outcome of this action to trigger the next move.</p>
                  </div>
                  <button type="button" onClick={() => setNewTask({...newTask, outcomes: [...newTask.outcomes, { label: '', action: 'next_task', target_stage_id: '', target_task_id: '' }]})} className="bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm"><Plus className="w-3.5 h-3.5 mr-1"/> Add Branch</button>
                </div>
                
                <div className="space-y-3">
                  {newTask.outcomes.map((outcome, idx) => (
                    <div key={idx} className="flex gap-2 bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
                      <div className="flex-1">
                          <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">If Agent Selects:</label>
                          <input type="text" value={outcome.label} onChange={e => { const newArr = [...newTask.outcomes]; newArr[idx].label = e.target.value; setNewTask({...newTask, outcomes: newArr}); }} placeholder="E.g., 'Replied Positively'" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-bold text-sm outline-none focus:border-blue-400" />
                      </div>
                      
                      <div className="w-1/3">
                          <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Then Do This:</label>
                          <select value={outcome.action} onChange={e => { const newArr = [...newTask.outcomes]; newArr[idx].action = e.target.value; setNewTask({...newTask, outcomes: newArr}); }} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest outline-none focus:border-blue-400 cursor-pointer">
                            <option value="next_task">Continue Next Task</option>
                            <option value="jump_task">Skip to Specific Task</option>
                            <option value="jump_stage">Jump to Stage</option>
                            <option value="eject_e2">Eject to Nurture (E2)</option>
                            <option value="kill">Kill Lead (Archive)</option>
                          </select>
                      </div>

                      {outcome.action === 'jump_task' && (
                        <div className="w-1/3">
                            <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Target Task:</label>
                            <select value={outcome.target_task_id || ''} onChange={e => { const newArr = [...newTask.outcomes]; newArr[idx].target_task_id = e.target.value; setNewTask({...newTask, outcomes: newArr}); }} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest outline-none focus:border-blue-400 cursor-pointer">
                              <option value="">Select Target Task</option>
                              {tasks.map(t => <option key={t.id} value={t.id}>{t.title || t.name}</option>)}
                            </select>
                        </div>
                      )}

                      {outcome.action === 'jump_stage' && (
                        <div className="w-1/3">
                            <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Target Stage:</label>
                            <select value={outcome.target_stage_id || ''} onChange={e => { const newArr = [...newTask.outcomes]; newArr[idx].target_stage_id = e.target.value; setNewTask({...newTask, outcomes: newArr}); }} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest outline-none focus:border-blue-400 cursor-pointer">
                              <option value="">Select Stage</option>
                              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                      )}

                      <div className="flex items-end">
                        <button type="button" onClick={() => { const newArr = newTask.outcomes.filter((_, i) => i !== idx); setNewTask({...newTask, outcomes: newArr}); }} className="bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-2.5 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
                      </div>
                    </div>
                  ))}
                  {newTask.outcomes.length === 0 && (
                      <div className="bg-blue-100/50 border border-dashed border-blue-300 p-4 rounded-xl text-center">
                          <p className="text-xs text-blue-800 font-bold uppercase tracking-widest">Standard linear progression active.</p>
                          <p className="text-[10px] text-blue-600/70 font-medium mt-1">If no branches are added, the pipeline simply moves to the next action.</p>
                      </div>
                  )}
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-slate-100 shrink-0 bg-white rounded-b-3xl">
               <button type="submit" form="task-form" className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-indigo-700 transition shadow-md">Save Execution Protocol</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}