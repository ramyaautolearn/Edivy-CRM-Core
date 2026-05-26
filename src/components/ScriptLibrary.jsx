import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Filter, Upload, Edit, Trash2, Zap, X, 
  Wand2, Paperclip, Loader2, MessageSquare, Lightbulb, CheckCircle2 
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; 
import OpenAI from 'openai'; // Groq uses the exact same package!

export default function ScriptLibrary() {
  const [scripts, setScripts] = useState([]);
  const [filterEngine, setFilterEngine] = useState('all');
  const [filterPC1, setFilterPC1] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState(null);
  
  // AI Generation States
  const [isAiMode, setIsAiMode] = useState(false);
  const [incomingContext, setIncomingContext] = useState('');
  const [aiPromptInstruction, setAiPromptInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReasoning, setAiReasoning] = useState('');

  const appId = 'edivy-crm-vault';

  // --- ACCESS GROQ AI (100% FREE) ---
  const apiKey = "gsk_6f1UGMhBzg2fSBsLtKtWWGdyb3FY3USx1emIT8xOaTlszn";
  const groq = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1", // Points to Groq instead of OpenAI
    dangerouslyAllowBrowser: true 
  });

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'scripts'), (snap) => {
      const fetchedScripts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedScripts.sort((a, b) => b.id.localeCompare(a.id));
      setScripts(fetchedScripts);
    });
    return () => unsub();
  }, []);

  const openScriptModal = (script = null) => {
    setIsAiMode(false);
    setIncomingContext('');
    setAiPromptInstruction('');
    setAiReasoning('');
    if (script) {
      setEditingScript({ ...script });
    } else {
      setEditingScript({
        id: null, engine: 1, stage_id: 's1', message_type: 'Objection Handler',
        pc1: 'Any', pc2: 'Any', pc3: 'Any', tone: 'Professional', priority: 1,
        content: '', media_url: '', 
      });
    }
    setIsScriptModalOpen(true);
  };

  const handleSaveScript = async (e) => {
    e.preventDefault();
    const finalScript = { ...editingScript };
    if (!finalScript.id) {
      finalScript.id = 'script_' + Date.now(); 
      finalScript.created_at = serverTimestamp();
    }
    finalScript.updated_at = serverTimestamp();
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scripts', finalScript.id), finalScript);
      setIsScriptModalOpen(false);
    } catch (error) {
      console.error("Firebase save failed", error);
      alert("Failed to save script.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete script?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scripts', id));
      setIsScriptModalOpen(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    try {
      const parsedData = JSON.parse(importJsonText);
      const scriptArray = Array.isArray(parsedData) ? parsedData : [parsedData];
      
      let count = 0;
      for (const script of scriptArray) {
        const id = script.id || 'script_' + Date.now() + Math.random().toString(36).substr(2, 5);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scripts', id), {
            ...script,
            id: id,
            created_at: serverTimestamp(),
        });
        count++;
      }
      
      alert(`Successfully imported ${count} structured scripts to Live Firebase!`);
      setIsImportModalOpen(false);
      setImportJsonText('');
    } catch (err) {
      alert('Invalid JSON format or DB Error. Please ensure the input is a valid JSON array.');
    }
  };

  // --- LIVE GROQ AI GENERATOR ---
  const handleGenerateAI = async () => {
    if (!aiPromptInstruction.trim() && !incomingContext.trim()) {
      return alert("Please enter the context or school's message.");
    }
    if (!apiKey) {
      return alert("Missing Groq API Key! Please add VITE_GROQ_API_KEY to your .env file.");
    }

    setIsGenerating(true);
    
    try {
      const prompt = `
        You are an elite B2B SaaS sales copywriter for Edivy (a premium CRM and communication platform for schools).
        
        Context/Objection from the prospect: "${incomingContext}"
        Desired Strategic Angle: "${aiPromptInstruction}"
        Target Audience: ${editingScript.pc1 !== 'Any' ? editingScript.pc1 : 'General'} Schools.
        Message Type: ${editingScript.message_type}

        Please provide your output EXACTLY in this format:
        REASONING: [Write exactly 1 sentence explaining why this psychological angle works].
        SCRIPT: [Write the highly-converting WhatsApp script here. Use {contact_name} for the name. No fluff, no aggressive corporate jargon. Be consultative.]
      `;

      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant", 
        messages: [{"role": "system", "content": prompt}],
        temperature: 0.7,
      });

      const responseText = response.choices[0].message.content;

      let finalScript = responseText;
      let finalReasoning = "Generated by Groq AI.";

      if (responseText.includes('SCRIPT:')) {
        const parts = responseText.split('SCRIPT:');
        finalReasoning = parts[0].replace('REASONING:', '').trim();
        finalScript = parts[1].trim();
      }

      setEditingScript({ ...editingScript, content: finalScript });
      setAiReasoning(finalReasoning);
      
    } catch (error) {
      console.error("Groq AI Error:", error);
      alert("Failed to generate AI script. Please check the terminal logs or your API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredScripts = scripts.filter((s) => {
    if (filterEngine !== 'all' && s.engine?.toString() !== filterEngine) return false;
    if (filterPC1 !== 'all' && s.pc1 !== filterPC1) return false;
    if (filterType !== 'all' && s.message_type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center tracking-tight">
            <BookOpen className="w-6 h-6 mr-2 text-indigo-600" /> Contextual Persuasion Engine
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium flex items-center">
            <Zap className="w-4 h-4 mr-1 text-emerald-500" /> Live Synced with Agent Vault
          </p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition flex items-center shadow-sm">
            <Upload className="w-4 h-4 mr-1.5" /> Import Data
          </button>
          <button onClick={() => openScriptModal()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition flex items-center shadow-md">
            <Plus className="w-4 h-4 mr-1.5" /> New Script Target
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="flex items-center text-sm font-bold text-slate-500 uppercase tracking-widest"><Filter className="w-4 h-4 mr-2" /> Filters:</div>
        <select value={filterEngine} onChange={(e) => setFilterEngine(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none text-slate-700">
          <option value="all">Any Engine</option>
          <option value="1">Engine 1 (Execution)</option>
          <option value="2">Engine 2 (Nurture)</option>
        </select>
        <select value={filterPC1} onChange={(e) => setFilterPC1(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none text-slate-700">
          <option value="all">Any Tier</option>
          <option value="Any">Global (Any)</option>
          <option value="Elite/Professional">Elite/Professional</option>
          <option value="Middle-Income">Middle-Income</option>
          <option value="Mass-Market">Mass-Market</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none text-slate-700">
          <option value="all">Any Type</option>
          <option value="Opening">Opening</option>
          <option value="Insight Drop">Insight Drop</option>
          <option value="Gap Identification">Gap Identification</option>
          <option value="Objection Handler">Objection Handler</option>
          <option value="Rebuttal">Rebuttal</option>
          <option value="FAQ Response">FAQ Response</option>
          <option value="Demo Transition">Demo Transition</option>
          <option value="Closing">Closing</option>
          <option value="Recovery">Recovery</option>
          <option value="Re-Engagement">Re-Engagement</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredScripts.map((script) => (
          <div key={script.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1.5 bottom-0 ${script.engine === 1 ? 'bg-indigo-500' : 'bg-blue-400'}`}></div>
            <div className="flex justify-between items-start mb-3 pl-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${script.engine === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                  Engine {script.engine}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-purple-100 text-purple-700">
                  {script.message_type}
                </span>
                {script.media_url && (
                   <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-orange-100 text-orange-700 flex items-center">
                     <Paperclip className="w-3 h-3 mr-1"/> Asset Attached
                   </span>
                )}
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openScriptModal(script)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"><Edit className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="pl-2 flex-1">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed font-medium mb-4 whitespace-pre-wrap">
                {script.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isScriptModalOpen && editingScript && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="text-xl font-black text-slate-800 flex items-center tracking-tight">
                <Zap className="w-5 h-5 mr-2 text-indigo-600" />
                {editingScript.id ? 'Edit Intelligence Script' : 'Generate Intelligence Script'}
              </h3>
              <div className="flex items-center gap-4">
                 {!editingScript.id && (
                    <button onClick={() => setIsAiMode(!isAiMode)} className={`flex items-center text-sm font-bold px-4 py-2 rounded-xl transition ${isAiMode ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      <Wand2 className="w-4 h-4 mr-1.5" /> {isAiMode ? 'Switch to Manual' : 'Draft with Edivy AI'}
                    </button>
                 )}
                 <button onClick={() => setIsScriptModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="h-6 w-6" /></button>
              </div>
            </div>

            <form id="script-form" onSubmit={handleSaveScript} className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Target Engine</label>
                  <select value={editingScript.engine} onChange={(e) => setEditingScript({ ...editingScript, engine: parseInt(e.target.value) })} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer">
                    <option value={1}>Engine 1 (Execution)</option>
                    <option value={2}>Engine 2 (Nurture)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Message Intent / Type</label>
                  <select value={editingScript.message_type} onChange={(e) => setEditingScript({ ...editingScript, message_type: e.target.value })} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer">
                    <option value="Opening">Opening</option>
                    <option value="Insight Drop">Insight Drop</option>
                    <option value="Gap Identification">Gap Identification</option>
                    <option value="Objection Handler">Objection Handler</option>
                    <option value="Rebuttal">Rebuttal</option>
                    <option value="FAQ Response">FAQ Response</option>
                    <option value="Demo Transition">Demo Transition</option>
                    <option value="Closing">Closing</option>
                    <option value="Recovery">Recovery</option>
                    <option value="Re-Engagement">Re-Engagement</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-800 mb-4 flex items-center">
                  Persona Targeting
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 text-slate-500 uppercase tracking-wider">PC1: Tier</label>
                    <select value={editingScript.pc1} onChange={(e) => setEditingScript({ ...editingScript, pc1: e.target.value })} className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm font-semibold outline-none">
                      <option value="Any">Any Tier</option>
                      <option value="Elite/Professional">Elite/Professional</option>
                      <option value="Middle-Income">Middle-Income</option>
                      <option value="Mass-Market">Mass-Market</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 text-slate-500 uppercase tracking-wider">PC2: Current Tech</label>
                    <select value={editingScript.pc2} onChange={(e) => setEditingScript({ ...editingScript, pc2: e.target.value })} className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm font-semibold outline-none">
                      <option value="Any">Any Tech</option>
                      <option value="Premium Portal">Premium Portal</option>
                      <option value="Clunky ERP">Clunky ERP</option>
                      <option value="Manual WhatsApp">Manual WhatsApp</option>
                      <option value="No System">No System</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 text-slate-500 uppercase tracking-wider">PC3: Vision</label>
                    <select value={editingScript.pc3} onChange={(e) => setEditingScript({ ...editingScript, pc3: e.target.value })} className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm font-semibold outline-none">
                      <option value="Any">Any Vision</option>
                      <option value="Tech-Forward">Tech-Forward</option>
                      <option value="Holistic/Life-Skills">Holistic/Life-Skills</option>
                      <option value="Marks-Only">Marks-Only</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center">
                   <Paperclip className="w-4 h-4 mr-1" /> Resource Asset Link (Optional)
                 </label>
                 <input 
                   type="text" 
                   value={editingScript.media_url || ''} 
                   onChange={(e) => setEditingScript({ ...editingScript, media_url: e.target.value })} 
                   placeholder="e.g., Link to the Parent Pulse 1-pager or Hyderabad case study..." 
                   className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500 text-sm font-medium shadow-sm"
                 />
              </div>

              {isAiMode ? (
                 <div className="bg-purple-900 border-2 border-purple-800 rounded-2xl p-6 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-purple-300 mb-2 flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1.5" /> Incoming School Message / Context
                        </label>
                        <textarea 
                          value={incomingContext}
                          onChange={(e) => setIncomingContext(e.target.value)}
                          placeholder='e.g., "sharing our school contacts is a risk"'
                          className="w-full border-none rounded-xl p-4 min-h-[80px] outline-none text-sm bg-purple-950/50 text-white placeholder-purple-400 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-purple-300 mb-2 flex items-center">
                          <Wand2 className="w-3 h-3 mr-1.5" /> Desired Strategic Angle
                        </label>
                        <textarea 
                          value={aiPromptInstruction}
                          onChange={(e) => setAiPromptInstruction(e.target.value)}
                          placeholder="e.g., we only show you the setup we dont take your contacts"
                          className="w-full border-none rounded-xl p-4 min-h-[80px] outline-none text-sm bg-purple-950/50 text-white placeholder-purple-400 font-medium"
                        />
                      </div>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                      className="bg-purple-500 text-white font-black uppercase tracking-widest px-6 py-4 rounded-xl hover:bg-purple-400 transition flex items-center justify-center w-full shadow-lg disabled:opacity-50"
                    >
                      {isGenerating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing Intent & Drafting...</> : 'Generate Contextual Response'}
                    </button>

                    {aiReasoning && (
                      <div className="mt-6 bg-purple-950/50 border border-purple-800 rounded-xl p-4">
                        <div className="flex items-center text-purple-300 text-[10px] font-black uppercase tracking-widest mb-2">
                          <Lightbulb className="w-3 h-3 mr-1" /> Strategic Reasoning (Mirror &gt; Reframe &gt; Insight &gt; Transition)
                        </div>
                        <p className="text-purple-200 text-xs leading-relaxed font-medium">{aiReasoning}</p>
                      </div>
                    )}
                 </div>
              ) : null}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Final Script Content (WhatsApp Format)</label>
                <textarea
                  required
                  value={editingScript.content}
                  onChange={(e) => setEditingScript({ ...editingScript, content: e.target.value })}
                  className="w-full border border-slate-200 rounded-2xl p-5 min-h-[180px] outline-none focus:border-indigo-500 bg-white font-medium text-slate-700 shadow-sm leading-relaxed"
                  placeholder="Hi {contact_name}, noticed you..."
                />
              </div>
              
            </form>

            <div className="px-6 py-5 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
              <div>
                {editingScript.id && (
                  <button type="button" onClick={() => handleDelete(editingScript.id)} className="text-red-500 font-bold px-4 py-2 hover:bg-red-50 rounded-xl flex items-center transition">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Script
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsScriptModalOpen(false)} className="px-6 py-3.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition">
                  Cancel
                </button>
                <button type="submit" form="script-form" className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Save to Vault
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* IMPORT JSON MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-indigo-600" /> Import Scripts via JSON
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleImport} className="p-6 space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Paste your structured JSON array below:</p>
              <textarea
                required
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-4 min-h-[250px] text-sm font-mono bg-slate-50 outline-none focus:border-indigo-500"
                placeholder='[{"message_type": "Objection", "content": "..."}]'
              />
              <div className="flex justify-end pt-2 gap-3">
                <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition">Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-md">Run Import</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}