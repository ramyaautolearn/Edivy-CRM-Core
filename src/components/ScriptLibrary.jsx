import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Filter,
  Upload,
  Edit,
  Trash2,
  Zap,
  X,
  Save,
  Wand2,
  Paperclip,
  Loader2
} from 'lucide-react';
import { mockApi } from '../data/mockDb';

export default function ScriptLibrary() {
  const [scripts, setScripts] = useState([]);
  const [filterEngine, setFilterEngine] = useState('all');
  const [filterPC1, setFilterPC1] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Single Script Edit Modal States
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState(null);
  
  // AI Generation States
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    const data = await mockApi.getScripts();
    setScripts(data);
  };

  const openScriptModal = (script = null) => {
    setIsAiMode(false);
    setAiPrompt('');
    if (script) {
      setEditingScript({ ...script });
    } else {
      setEditingScript({
        id: null,
        engine: 1,
        stage_id: 's1',
        message_type: 'Objection Handler',
        pc1: 'Any',
        pc2: 'Any',
        pc3: 'Any',
        tone: 'Professional',
        priority: 1,
        content: '',
        media_url: '', // NEW: Media Attachment Field
      });
    }
    setIsScriptModalOpen(true);
  };

  const handleSaveScript = async (e) => {
    e.preventDefault();
    await mockApi.saveScript(editingScript);
    setIsScriptModalOpen(false);
    loadScripts();
  };

  const handleImport = async (e) => {
    e.preventDefault();
    try {
      const parsedData = JSON.parse(importJsonText);
      const scriptArray = Array.isArray(parsedData) ? parsedData : [parsedData];
      const result = await mockApi.importScripts(scriptArray);
      alert(`Successfully imported ${result.count} structured scripts!`);
      setIsImportModalOpen(false);
      setImportJsonText('');
      loadScripts();
    } catch (err) {
      alert('Invalid JSON format. Please ensure the input is a valid JSON array.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this script?')) {
      await mockApi.deleteScript(id);
      loadScripts();
    }
  };

  // --- NEW: AI GENERATOR FUNCTION (MOCK FOR NOW) ---
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return alert("Please enter a scenario for the AI to draft.");
    setIsGenerating(true);
    
    // Simulate API Call Delay
    setTimeout(() => {
      let generatedText = `Hi {contact_name},\n\nI understand your concern about ${aiPrompt.toLowerCase()}.\n\nInterestingly, schools we work with in the ${editingScript.pc1} space using ${editingScript.pc2} found that once they centralized this process, their teachers actually saved roughly 3 hours a week.\n\nHappy to show you exactly how they mapped that workflow if it's helpful?`;
      
      setEditingScript({
        ...editingScript,
        content: generatedText
      });
      setIsGenerating(false);
      setIsAiMode(false); // Close AI panel to show generated text
    }, 1500);
  };

  const filteredScripts = scripts.filter((s) => {
    if (filterEngine !== 'all' && s.engine.toString() !== filterEngine) return false;
    if (filterPC1 !== 'all' && s.pc1 !== filterPC1) return false;
    if (filterType !== 'all' && s.message_type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-indigo-600" /> Script & Content Library
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage PC-based reactive responses and nurture automation scripts.
          </p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center shadow-sm">
            <Upload className="w-4 h-4 mr-1.5" /> Bulk JSON Import
          </button>
          <button onClick={() => openScriptModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition flex items-center shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Single Script
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-3 flex-wrap gap-y-2">
        <div className="flex items-center text-sm font-medium text-gray-600">
          <Filter className="w-4 h-4 mr-2" /> Filters:
        </div>
        <select value={filterEngine} onChange={(e) => setFilterEngine(e.target.value)} className="bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none font-medium">
          <option value="all">All Engines</option>
          <option value="1">Engine 1 (Execution)</option>
          <option value="2">Engine 2 (Nurture)</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none font-medium">
          <option value="all">All Types</option>
          <option value="Objection Handler">Objection Handler</option>
          <option value="FAQ / Tech Proof">FAQ / Tech Proof</option>
          <option value="Social Proof">Social Proof / Case Study</option>
          <option value="Compelling Close">Compelling Close</option>
          <option value="Opening">Opening</option>
          <option value="Insight">Insight Hook</option>
        </select>
        <select value={filterPC1} onChange={(e) => setFilterPC1(e.target.value)} className="bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none font-medium">
          <option value="all">All PC1 Tiers</option>
          <option value="Elite/Professional">Elite/Professional</option>
          <option value="Middle-Income">Middle-Income</option>
          <option value="Mass-Market">Mass-Market</option>
          <option value="Any">Any Tier</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredScripts.map((script) => (
          <div key={script.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1.5 bottom-0 ${script.engine === 1 ? 'bg-indigo-500' : 'bg-blue-400'}`}></div>
            <div className="flex justify-between items-start mb-3 pl-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${script.engine === 1 ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                  Engine {script.engine}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-purple-100 text-purple-700 border border-purple-200">
                  {script.message_type}
                </span>
                {script.media_url && (
                   <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-orange-100 text-orange-700 border border-orange-200 flex items-center">
                     <Paperclip className="w-3 h-3 mr-1"/> Media Attached
                   </span>
                )}
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openScriptModal(script)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded hover:text-indigo-600"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(script.id)} className="p-1.5 text-gray-400 hover:bg-red-50 rounded hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="pl-2 flex-1">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed font-medium mb-4 whitespace-pre-wrap">
                {script.content}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-auto">
                <div className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center" title="Target PC1 Tier">
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">PC1: Tier</div>
                  <div className="text-xs font-semibold text-gray-800 truncate">{script.pc1}</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center" title="Target PC2 Tech">
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">PC2: Tech</div>
                  <div className="text-xs font-semibold text-gray-800 truncate">{script.pc2}</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center" title="Target PC3 Vision">
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">PC3: Vision</div>
                  <div className="text-xs font-semibold text-gray-800 truncate">{script.pc3}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isScriptModalOpen && editingScript && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-xl font-bold flex items-center">
                <Edit className="w-5 h-5 mr-2 text-indigo-600" />
                {editingScript.id ? 'Edit Smart Script' : 'Create New Script'}
              </h3>
              <div className="flex items-center gap-4">
                 {!editingScript.id && (
                    <button onClick={() => setIsAiMode(!isAiMode)} className={`flex items-center text-sm font-bold px-3 py-1.5 rounded-lg border transition ${isAiMode ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                      <Wand2 className="w-4 h-4 mr-1.5" /> {isAiMode ? 'Manual Mode' : 'Draft with AI'}
                    </button>
                 )}
                 <button onClick={() => setIsScriptModalOpen(false)}>
                   <X className="h-5 w-5 text-gray-500" />
                 </button>
              </div>
            </div>

            <form id="script-form" onSubmit={handleSaveScript} className="p-6 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Target Engine</label>
                  <select value={editingScript.engine} onChange={(e) => setEditingScript({ ...editingScript, engine: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2 outline-none">
                    <option value={1}>Engine 1 (Execution)</option>
                    <option value={2}>Engine 2 (Nurture)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Message Intent / Type</label>
                  <select value={editingScript.message_type} onChange={(e) => setEditingScript({ ...editingScript, message_type: e.target.value })} className="w-full border rounded-lg px-3 py-2 outline-none">
                    <option value="Objection Handler">Objection Handler</option>
                    <option value="FAQ / Tech Proof">FAQ / Tech Proof</option>
                    <option value="Social Proof">Social Proof / Case Study</option>
                    <option value="Compelling Close">Compelling Close</option>
                    <option value="Opening">Opening</option>
                    <option value="Insight">Insight Hook</option>
                    <option value="Reality">Reality Drop</option>
                    <option value="Invite">Soft Invite / CTA</option>
                    <option value="Any">Any Type</option>
                  </select>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-4">
                <h4 className="font-bold text-indigo-900 text-sm flex items-center">
                  <Zap className="w-4 h-4 mr-1.5 text-indigo-600" /> Persona Targeting (PC Rules)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-indigo-800">PC1: Tier</label>
                    <select value={editingScript.pc1} onChange={(e) => setEditingScript({ ...editingScript, pc1: e.target.value })} className="w-full border rounded-lg px-2 py-1.5 text-sm">
                      <option value="Any">Any Tier</option>
                      <option value="Elite/Professional">Elite/Professional</option>
                      <option value="Middle-Income">Middle-Income</option>
                      <option value="Mass-Market">Mass-Market</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-indigo-800">PC2: Current Tech</label>
                    <select value={editingScript.pc2} onChange={(e) => setEditingScript({ ...editingScript, pc2: e.target.value })} className="w-full border rounded-lg px-2 py-1.5 text-sm">
                      <option value="Any">Any Tech</option>
                      <option value="Premium Portal">Premium Portal</option>
                      <option value="Clunky ERP">Clunky ERP</option>
                      <option value="Manual WhatsApp">Manual WhatsApp</option>
                      <option value="No System">No System</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-indigo-800">PC3: Vision</label>
                    <select value={editingScript.pc3} onChange={(e) => setEditingScript({ ...editingScript, pc3: e.target.value })} className="w-full border rounded-lg px-2 py-1.5 text-sm">
                      <option value="Any">Any Vision</option>
                      <option value="Tech-Forward">Tech-Forward</option>
                      <option value="Holistic/Life-Skills">Holistic/Life-Skills</option>
                      <option value="Marks-Only">Marks-Only</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* --- NEW: MEDIA ATTACHMENT FIELD --- */}
              <div>
                 <label className="block text-sm font-bold mb-1 text-gray-700 flex items-center">
                   <Paperclip className="w-4 h-4 mr-1 text-gray-400" /> Resource URL / Media Link (Optional)
                 </label>
                 <input 
                   type="text" 
                   value={editingScript.media_url || ''} 
                   onChange={(e) => setEditingScript({ ...editingScript, media_url: e.target.value })} 
                   placeholder="https://drive.google.com/file/d/..." 
                   className="w-full border rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                 />
                 <p className="text-[10px] text-gray-400 mt-1">Paste a link to a 1-pager, screenshot, or case study for the agent to attach.</p>
              </div>

              {/* --- AI GENERATOR VS MANUAL TEXT AREA --- */}
              {isAiMode ? (
                 <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
                    <label className="block text-sm font-bold text-purple-900 mb-2 flex items-center">
                      <Wand2 className="w-4 h-4 mr-1.5" /> AI Draft Prompt
                    </label>
                    <textarea 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., School says their teachers are too busy to learn another app. Frame it around our Swadhyaya movement of reducing manual workload..."
                      className="w-full border border-purple-200 rounded-lg p-3 min-h-[100px] outline-none focus:border-purple-500 text-sm bg-white"
                    />
                    <button 
                      type="button" 
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                      className="mt-3 bg-purple-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center justify-center w-full shadow-sm disabled:opacity-50"
                    >
                      {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Strategic Script...</> : 'Generate Smart Script'}
                    </button>
                 </div>
              ) : (
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-bold text-gray-700">Script Content (WhatsApp Format)</label>
                    <span className="text-xs text-gray-400">Use {'{contact_name}'} for variables</span>
                  </div>
                  <textarea
                    required
                    value={editingScript.content}
                    onChange={(e) => setEditingScript({ ...editingScript, content: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-4 min-h-[150px] outline-none focus:border-indigo-500 bg-slate-50"
                    placeholder="Hi {contact_name}, noticed you..."
                  />
                </div>
              )}
              
            </form>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end shrink-0">
              <button type="button" onClick={() => setIsScriptModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg mr-2">
                Cancel
              </button>
              <button type="submit" form="script-form" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm flex items-center">
                <Save className="w-4 h-4 mr-2" /> Save Script Target
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}