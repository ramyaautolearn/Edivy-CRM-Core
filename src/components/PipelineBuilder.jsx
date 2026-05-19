import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Check, CheckCircle2, Zap, ChevronUp, ChevronDown, Copy, Power, Bot, UserCog, Cog } from 'lucide-react';

// --- NEW ROCK-SOLID PIPELINE DATABASE ENGINE ---
const STORAGE_KEY = 'edivy_pipeline_data_v2';

const getDb = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) return JSON.parse(data);
  return {
    versions: [{ id: 'v1', name: 'v1.0 - Active Pipeline', status: 'active' }],
    stages: [],
    tasks: []
  };
};

const saveDb = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

const pipelineApi = {
  getPipelineVersions: async () => getDb().versions,
  setActiveVersion: async (id) => {
    const db = getDb();
    db.versions.forEach(v => v.status = (v.id === id ? 'active' : 'draft'));
    saveDb(db);
    return db.versions;
  },
  duplicatePipelineVersion: async (vId, newName) => {
    const db = getDb();
    const newVersionId = 'v_' + Date.now();
    db.versions.push({ id: newVersionId, name: newName, status: 'draft' });
    saveDb(db);
    return db.versions;
  },
  getPipelineStages: async (vId) => getDb().stages.filter(s => s.version_id === vId).sort((a,b) => a.order - b.order),
  saveStage: async (stage) => {
    const db = getDb();
    db.stages.push({ ...stage, id: 'stage_' + Date.now(), order: db.stages.length });
    saveDb(db);
  },
  updateStage: async (id, name) => {
    const db = getDb();
    const s = db.stages.find(s => s.id === id);
    if (s) s.name = name;
    saveDb(db);
  },
  deleteStage: async (id) => {
    const db = getDb();
    db.stages = db.stages.filter(s => s.id !== id);
    db.tasks = db.tasks.filter(t => t.stage_id !== id);
    saveDb(db);
  },
  reorderStages: async (ids) => {
    const db = getDb();
    ids.forEach((id, idx) => {
      const s = db.stages.find(x => x.id === id);
      if (s) s.order = idx;
    });
    saveDb(db);
  },
  getTaskTemplates: async (sId) => getDb().tasks.filter(t => t.stage_id === sId).sort((a,b) => a.order - b.order),
  saveTaskTemplate: async (task) => {
    const db = getDb();
    if (task.id) {
      const idx = db.tasks.findIndex(t => t.id === task.id);
      if (idx > -1) db.tasks[idx] = { ...db.tasks[idx], ...task };
    } else {
      db.tasks.push({ ...task, id: 'task_' + Date.now(), order: db.tasks.length });
    }
    saveDb(db);
  },
  deleteTaskTemplate: async (id) => {
    const db = getDb();
    db.tasks = db.tasks.filter(t => t.id !== id); // Flawless specific deletion
    saveDb(db);
  },
  reorderTasks: async (ids) => {
    const db = getDb();
    ids.forEach((id, idx) => {
      const t = db.tasks.find(x => x.id === id);
      if (t) t.order = idx;
    });
    saveDb(db);
  }
};
// ------------------------------------------------


export default function AdminPipelineBuilder() {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [stages, setStages] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isEditingStage, setIsEditingStage] = useState(null);
  const [stageNameInput, setStageNameInput] = useState('');
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  const [newTask, setNewTask] = useState({
    id: null, title: '', description: '', execution_type: 'human', is_mandatory: true,
    delay_value: 0, delay_unit: 'minutes', type: 'whatsapp', priority: 2,
    ai_guidance: '', failure_action: 'none', resource_text: '', resource_url: '',
  });
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  useEffect(() => { loadVersions(); }, []);

  const loadVersions = async () => {
    const vData = await pipelineApi.getPipelineVersions();
    setVersions(vData);
    if (vData.length > 0 && !selectedVersion)
      setSelectedVersion(vData.find((v) => v.status === 'active') || vData[0]);
  };

  useEffect(() => { if (selectedVersion) loadStages(selectedVersion.id); }, [selectedVersion]);

  const loadStages = async (vId = selectedVersion?.id) => {
    if (!vId) return;
    const data = await pipelineApi.getPipelineStages(vId);
    setStages(data);
    if (data.length > 0) setSelectedStage(data[0]);
    else { setSelectedStage(null); setTasks([]); }
  };

  useEffect(() => {
    if (selectedStage) pipelineApi.getTaskTemplates(selectedStage.id).then(setTasks);
  }, [selectedStage]);

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
    await pipelineApi.saveStage({ name: newStageName, version_id: selectedVersion.id });
    setNewStageName(''); setIsAddingStage(false); loadStages();
  };

  const handleDeleteStage = async (id) => {
    if (window.confirm('Delete this stage?')) {
      await pipelineApi.deleteStage(id);
      if (selectedStage?.id === id) setSelectedStage(null);
      loadStages();
    }
  };

  const handleSaveStageEdit = async (id) => {
    if (!stageNameInput.trim()) return;
    await pipelineApi.updateStage(id, stageNameInput);
    setIsEditingStage(null); loadStages();
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
        ai_guidance: task.ai_guidance || '', failure_action: task.failure_action || 'none'
      });
    } else {
      setNewTask({
        id: null, title: '', description: '', execution_type: 'human', is_mandatory: true,
        delay_value: 0, delay_unit: 'minutes', type: 'whatsapp', priority: 2,
        ai_guidance: '', failure_action: 'none', resource_text: '', resource_url: '',
      });
    }
    setIsTaskFormOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    let multiplier = 1;
    if (newTask.delay_unit === 'minutes') multiplier = 1 / (24 * 60);
    else if (newTask.delay_unit === 'hours') multiplier = 1 / 24;
    
    const finalTaskPayload = {
      ...newTask,
      stage_id: selectedStage.id,
      offset_days: newTask.delay_value * multiplier,
    };
    
    await pipelineApi.saveTaskTemplate(finalTaskPayload);
    setTasks(await pipelineApi.getTaskTemplates(selectedStage.id));
    setIsTaskFormOpen(false);
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Delete task?')) {
      await pipelineApi.deleteTaskTemplate(id);
      setTasks(await pipelineApi.getTaskTemplates(selectedStage.id));
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
    await pipelineApi.reorderStages(newStages.map(s => s.id));
  };

  const moveTask = async (e, index, direction) => {
    e.stopPropagation();
    if ((direction === -1 && index === 0) || (direction === 1 && index === tasks.length - 1)) return;
    const newTasks = [...tasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[index + direction];
    newTasks[index + direction] = temp;
    setTasks(newTasks);
    await pipelineApi.reorderTasks(newTasks.map(t => t.id));
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
    <div className="flex flex-col h-[calc(100vh-6rem)] pb-6">
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
                  <Plus className="w-4 h-4 mr-1" /> Add Task
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                {tasks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">No tasks configured.</div>
                ) : (
                  tasks.map((task, idx) => (
                    <div key={task.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-stretch gap-4">
                      <div className="flex flex-col justify-center border-r border-gray-100 pr-3 text-gray-300 shrink-0">
                        <button onClick={(e) => moveTask(e, idx, -1)} disabled={idx === 0} className="p-1 hover:bg-gray-50 hover:text-indigo-600 rounded disabled:opacity-20"><ChevronUp className="w-5 h-5" /></button>
                        <button onClick={(e) => moveTask(e, idx, 1)} disabled={idx === tasks.length - 1} className="p-1 hover:bg-gray-50 hover:text-indigo-600 rounded disabled:opacity-20"><ChevronDown className="w-5 h-5" /></button>
                      </div>
                      <div className="flex-1 py-1">
                        <div className="flex items-center gap-3 mb-1">
                          {renderExecutionBadge(task.execution_type)}
                          <h4 className="font-black text-gray-800 text-sm">{task.title}</h4>
                          {task.priority === 3 && <span className="text-[9px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded border border-red-200 uppercase tracking-widest">High Priority</span>}
                        </div>
                        <p className="text-xs font-medium text-gray-500 mt-1">{task.description}</p>
                      </div>
                      <div className="flex space-x-1 py-1">
                        <button onClick={() => openTaskForm(task)} className="p-2 text-gray-400 hover:text-indigo-600 h-max"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-600 h-max"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {isTaskFormOpen && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col border-t-4 border-indigo-500">
                  <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-slate-50">
                    <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">{newTask.id ? 'Edit Execution Protocol' : 'New Execution Protocol'}</h3>
                    <button onClick={() => setIsTaskFormOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={handleSaveTask} className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Task Title</label>
                        <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Execution Type</label>
                        <select value={newTask.execution_type} onChange={(e) => setNewTask({ ...newTask, execution_type: e.target.value })} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer">
                          <option value="human">Human (Manual Step)</option>
                          <option value="ai">AI-Assisted (Human confirms AI work)</option>
                          <option value="auto">Automated (System runs quietly)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Agent Instructions</label>
                      <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500" rows="2" required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Action Type</label>
                        <select value={newTask.type} onChange={(e) => setNewTask({ ...newTask, type: e.target.value })} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none">
                          <option value="whatsapp">WhatsApp Message</option>
                          <option value="call">Phone Call</option>
                          <option value="research">Manual Research</option>
                          <option value="wait">Intelligent Wait Logic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Delay Value</label>
                        <input type="number" min="0" value={newTask.delay_value} onChange={(e) => setNewTask({ ...newTask, delay_value: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Time Unit</label>
                        <select value={newTask.delay_unit} onChange={(e) => setNewTask({ ...newTask, delay_unit: e.target.value })} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none text-indigo-700">
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 space-y-4">
                      <h4 className="font-black text-indigo-900 text-[10px] uppercase tracking-widest flex items-center">
                        <Bot className="w-4 h-4 mr-2 text-indigo-500" /> AI Guidance Rules (Optional)
                      </h4>
                      <div>
                        <textarea value={newTask.ai_guidance} onChange={(e) => setNewTask({ ...newTask, ai_guidance: e.target.value })} className="w-full border border-indigo-200 rounded-lg px-4 py-3 text-sm text-slate-700 bg-white outline-none focus:border-indigo-500" rows="2" placeholder="e.g., Elite -> Strategic Tone. Avoid saying 'cheap'..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Override Script (Blank = AI Smart Script)</label>
                           <input type="text" value={newTask.resource_text} onChange={(e) => setNewTask({ ...newTask, resource_text: e.target.value })} className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Static fallback text..." />
                        </div>
                        <div>
                           <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Failure Action (If no reply / invalid)</label>
                           <select value={newTask.failure_action} onChange={(e) => setNewTask({ ...newTask, failure_action: e.target.value })} className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white font-bold text-red-600">
                             <option value="none">Keep in Engine 1</option>
                             <option value="e2_eject">Eject to Engine 2 (Nurture)</option>
                             <option value="update_lead">Flag Lead as Invalid</option>
                           </select>
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-indigo-700 transition shadow-md">
                      Save Protocol
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