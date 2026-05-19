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

  // NEW: Single Script Edit Modal States
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState(null);

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    const data = await mockApi.getScripts();
    setScripts(data);
  };

  // --- NEW: EDIT & CREATE HANDLERS ---
  const openScriptModal = (script = null) => {
    if (script) {
      setEditingScript({ ...script }); // Edit existing
    } else {
      // Create new template
      setEditingScript({
        id: null,
        engine: 1,
        stage_id: 's1',
        message_type: 'Opening',
        pc1: 'Any',
        pc2: 'Any',
        pc3: 'Any',
        tone: 'Professional',
        priority: 1,
        content: '',
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
      alert(
        'Invalid JSON format. Please ensure the input is a valid JSON array.'
      );
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this script?')) {
      await mockApi.deleteScript(id);
      loadScripts();
    }
  };

  const filteredScripts = scripts.filter((s) => {
    if (filterEngine !== 'all' && s.engine.toString() !== filterEngine)
      return false;
    if (filterPC1 !== 'all' && s.pc1 !== filterPC1) return false;
    if (filterType !== 'all' && s.message_type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-indigo-600" /> Script &
            Content Library
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage PC-based scripts for Engine 1 execution and Engine 2
            automation.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center shadow-sm"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Bulk JSON Import
          </button>

          {/* WIRED UP THE CREATE BUTTON */}
          <button
            onClick={() => openScriptModal()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition flex items-center shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Single Script
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-3 flex-wrap gap-y-2">
        <div className="flex items-center text-sm font-medium text-gray-600">
          <Filter className="w-4 h-4 mr-2" /> Filters:
        </div>
        <select
          value={filterEngine}
          onChange={(e) => setFilterEngine(e.target.value)}
          className="bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none font-medium"
        >
          <option value="all">All Engines</option>
          <option value="1">Engine 1 (Execution)</option>
          <option value="2">Engine 2 (Nurture)</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none font-medium"
        >
          <option value="all">All Types</option>
          <option value="Opening">Opening</option>
          <option value="Engagement">Engagement</option>
          <option value="Insight">Insight</option>
          <option value="Reality">Reality Drop</option>
          <option value="Invite">Invite</option>
        </select>
        <select
          value={filterPC1}
          onChange={(e) => setFilterPC1(e.target.value)}
          className="bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none font-medium"
        >
          <option value="all">All PC1 Tiers</option>
          <option value="Elite/Professional">Elite/Professional</option>
          <option value="Middle-Income">Middle-Income</option>
          <option value="Mass-Market">Mass-Market</option>
          <option value="Any">Any Tier</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredScripts.map((script) => (
          <div
            key={script.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col relative overflow-hidden group"
          >
            <div
              className={`absolute top-0 left-0 w-1.5 bottom-0 ${
                script.engine === 1 ? 'bg-indigo-500' : 'bg-blue-400'
              }`}
            ></div>
            <div className="flex justify-between items-start mb-3 pl-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    script.engine === 1
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  Engine {script.engine}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-purple-100 text-purple-700 border border-purple-200">
                  {script.message_type}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                  {script.tone} Tone
                </span>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* WIRED UP THE EDIT BUTTON */}
                <button
                  onClick={() => openScriptModal(script)}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded hover:text-indigo-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(script.id)}
                  className="p-1.5 text-gray-400 hover:bg-red-50 rounded hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pl-2 flex-1">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed font-medium mb-4 whitespace-pre-wrap">
                {script.content}
              </div>

              {/* NOTE: These are informational badges, not clickable tabs */}
              <div className="grid grid-cols-3 gap-2 mt-auto">
                <div
                  className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center"
                  title="Target PC1 Tier"
                >
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                    PC1: Tier
                  </div>
                  <div className="text-xs font-semibold text-gray-800 truncate">
                    {script.pc1}
                  </div>
                </div>
                <div
                  className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center"
                  title="Target PC2 Tech"
                >
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                    PC2: Tech
                  </div>
                  <div className="text-xs font-semibold text-gray-800 truncate">
                    {script.pc2}
                  </div>
                </div>
                <div
                  className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center"
                  title="Target PC3 Vision"
                >
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">
                    PC3: Vision
                  </div>
                  <div className="text-xs font-semibold text-gray-800 truncate">
                    {script.pc3}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- BULK IMPORT MODAL --- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold flex items-center">
                <Upload className="w-5 h-5 mr-2 text-indigo-600" /> Bulk Script
                Import (JSON)
              </h3>
              <button onClick={() => setIsImportModalOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleImport} className="p-6 flex-1 flex flex-col">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-800 mb-4 leading-relaxed font-medium">
                Paste an array of JSON objects. Required fields:{' '}
                <code className="font-bold bg-white px-1 py-0.5 rounded border">
                  content
                </code>
                ,{' '}
                <code className="font-bold bg-white px-1 py-0.5 rounded border">
                  stage_id
                </code>
                ,{' '}
                <code className="font-bold bg-white px-1 py-0.5 rounded border">
                  message_type
                </code>
                . Optional PC fields:{' '}
                <code className="font-bold bg-white px-1 py-0.5 rounded border">
                  pc1, pc2, pc3
                </code>
                .
              </div>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full flex-1 min-h-[300px] border border-gray-300 rounded-xl p-4 font-mono text-sm bg-slate-50 outline-none focus:border-indigo-500"
                placeholder="[{ 'content': 'Hi...', 'stage_id': 's1', 'message_type': 'Opening', 'pc1': 'Elite/Professional' }]"
                required
              ></textarea>
              <button
                type="submit"
                className="w-full mt-4 bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-sm"
              >
                Execute Import Pipeline
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- NEW: SINGLE SCRIPT EDIT/CREATE MODAL --- */}
      {isScriptModalOpen && editingScript && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-xl font-bold flex items-center">
                <Edit className="w-5 h-5 mr-2 text-indigo-600" />
                {editingScript.id ? 'Edit Smart Script' : 'Create New Script'}
              </h3>
              <button onClick={() => setIsScriptModalOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form
              id="script-form"
              onSubmit={handleSaveScript}
              className="p-6 overflow-y-auto space-y-6"
            >
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">
                    Target Engine
                  </label>
                  <select
                    value={editingScript.engine}
                    onChange={(e) =>
                      setEditingScript({
                        ...editingScript,
                        engine: parseInt(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 outline-none"
                  >
                    <option value={1}>Engine 1 (Execution)</option>
                    <option value={2}>Engine 2 (Nurture)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">
                    Message Intent / Type
                  </label>
                  <select
                    value={editingScript.message_type}
                    onChange={(e) =>
                      setEditingScript({
                        ...editingScript,
                        message_type: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="Opening">Opening</option>
                    <option value="Engagement">Engagement</option>
                    <option value="Insight">Insight Hook</option>
                    <option value="Reality">Reality Drop</option>
                    <option value="Proof">Micro Proof</option>
                    <option value="Invite">Soft Invite / CTA</option>
                    <option value="Any">Any Type</option>
                  </select>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-4">
                <h4 className="font-bold text-indigo-900 text-sm flex items-center">
                  <Zap className="w-4 h-4 mr-1.5 text-indigo-600" /> Persona
                  Targeting (PC Rules)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-indigo-800">
                      PC1: Tier
                    </label>
                    <select
                      value={editingScript.pc1}
                      onChange={(e) =>
                        setEditingScript({
                          ...editingScript,
                          pc1: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    >
                      <option value="Any">Any Tier</option>
                      <option value="Elite/Professional">
                        Elite/Professional
                      </option>
                      <option value="Middle-Income">Middle-Income</option>
                      <option value="Mass-Market">Mass-Market</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-indigo-800">
                      PC2: Current Tech
                    </label>
                    <select
                      value={editingScript.pc2}
                      onChange={(e) =>
                        setEditingScript({
                          ...editingScript,
                          pc2: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    >
                      <option value="Any">Any Tech</option>
                      <option value="Premium Portal">Premium Portal</option>
                      <option value="Clunky ERP">Clunky ERP</option>
                      <option value="Manual WhatsApp">Manual WhatsApp</option>
                      <option value="No System">No System</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-indigo-800">
                      PC3: Vision
                    </label>
                    <select
                      value={editingScript.pc3}
                      onChange={(e) =>
                        setEditingScript({
                          ...editingScript,
                          pc3: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                    >
                      <option value="Any">Any Vision</option>
                      <option value="Tech-Forward">Tech-Forward</option>
                      <option value="Holistic/Life-Skills">
                        Holistic/Life-Skills
                      </option>
                      <option value="Marks-Only">Marks-Only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-bold text-gray-700">
                    Script Content (WhatsApp Format)
                  </label>
                  <span className="text-xs text-gray-400">
                    Use {'{contact_name}'} for variables
                  </span>
                </div>
                <textarea
                  required
                  value={editingScript.content}
                  onChange={(e) =>
                    setEditingScript({
                      ...editingScript,
                      content: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-xl p-4 min-h-[150px] outline-none focus:border-indigo-500 bg-slate-50"
                  placeholder="Hi {contact_name}, noticed you..."
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsScriptModalOpen(false)}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg mr-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="script-form"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm flex items-center"
              >
                <Save className="w-4 h-4 mr-2" /> Save Script Target
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
