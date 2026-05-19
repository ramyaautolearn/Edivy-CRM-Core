import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
  Droplet,
  Edit,
  Trash2,
  ShieldAlert,
  Power,
  Copy,
  Lock,
  ChevronUp,
  ChevronDown,
  Check,
  Settings,
} from 'lucide-react';
import { mockApi } from '../data/mockDb';

export default function AdminNurtureBuilder() {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);

  // --- GLOBAL SETTINGS STATE ---
  const [globalSettings, setGlobalSettings] = useState({
    min_gap_hours: 48,
    max_msgs_per_week: 3,
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [stages, setStages] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
  const [actions, setActions] = useState([]);
  const [isActionFormOpen, setIsActionFormOpen] = useState(false);

  const [isEditingStage, setIsEditingStage] = useState(null);
  const [stageNameInput, setStageNameInput] = useState('');
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newAction, setNewAction] = useState({
    id: null,
    title: '',
    action_type: 'whatsapp',
    content_type: 'Reality',
    delay_value: 0,
    delay_unit: 'days',
  });

  useEffect(() => {
    loadVersions();
    mockApi.getNurtureSettings().then(setGlobalSettings);
  }, []);

  const loadVersions = async () => {
    const vData = await mockApi.getNurtureVersions();
    setVersions(vData);
    if (vData.length > 0 && !selectedVersion)
      setSelectedVersion(vData.find((v) => v.status === 'active') || vData[0]);
  };
  useEffect(() => {
    if (selectedVersion) loadStages(selectedVersion.id);
  }, [selectedVersion]);
  const loadStages = async (vId = selectedVersion?.id) => {
    if (!vId) return;
    const data = await mockApi.getNurtureStages(vId);
    setStages(data);
    if (data.length > 0) setSelectedStage(data[0]);
    else {
      setSelectedStage(null);
      setActions([]);
    }
  };
  useEffect(() => {
    if (selectedStage)
      mockApi.getNurtureActions(selectedStage.id).then(setActions);
  }, [selectedStage]);

  const handleCreateVersion = async () => {
    const newName = prompt('Enter a name for the new Draft nurture sequence:');
    if (!newName) return;
    const updatedVersions = await mockApi.duplicateNurtureVersion(
      selectedVersion.id,
      newName
    );
    setVersions(updatedVersions);
    setSelectedVersion(updatedVersions[updatedVersions.length - 1]);
  };
  const handleMakeActive = async () => {
    if (
      window.confirm(
        `Publish ${selectedVersion.name} as the LIVE Engine 2 Nurture flow?`
      )
    ) {
      const updatedVersions = await mockApi.setActiveNurtureVersion(
        selectedVersion.id
      );
      setVersions([...updatedVersions]);
      alert('Nurture Pipeline is now live!');
    }
  };

  // Save global settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    await mockApi.saveNurtureSettings(globalSettings);
    setIsSettingsModalOpen(false);
  };

  const handleSaveNewStage = async () => {
    if (!newStageName.trim()) return;
    await mockApi.saveNurtureStage({
      name: newStageName,
      version_id: selectedVersion.id,
    });
    setNewStageName('');
    setIsAddingStage(false);
    loadStages();
  };
  const handleDeleteStage = async (id) => {
    if (
      window.confirm(
        'Delete this Nurture Stage? All actions inside will be lost.'
      )
    ) {
      await mockApi.deleteNurtureStage(id);
      if (selectedStage?.id === id) setSelectedStage(null);
      loadStages();
    }
  };
  const handleSaveStageEdit = async (id) => {
    if (!stageNameInput.trim()) return;
    await mockApi.updateNurtureStage(id, stageNameInput);
    setIsEditingStage(null);
    loadStages();
  };
  const moveStage = async (e, index, direction) => {
    e.stopPropagation();
    if (
      (direction === -1 && index === 0) ||
      (direction === 1 && index === stages.length - 1)
    )
      return;
    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[index + direction];
    newStages[index + direction] = temp;
    setStages(newStages);
    if (mockApi.reorderNurtureStages)
      await mockApi.reorderNurtureStages(newStages.map((s) => s.id));
  };

  const parseOffset = (days) => {
    if (days === 0) return { val: 0, unit: 'days' };
    if (days < 1 / 24)
      return { val: Math.round(days * 24 * 60), unit: 'minutes' };
    if (days < 1) return { val: Math.round(days * 24), unit: 'hours' };
    if (days % 30 === 0) return { val: days / 30, unit: 'months' };
    if (days % 7 === 0) return { val: days / 7, unit: 'weeks' };
    return { val: days, unit: 'days' };
  };
  const openActionForm = (action = null) => {
    if (action) {
      const { val, unit } = parseOffset(action.offset_days || 0);
      setNewAction({ ...action, delay_value: val, delay_unit: unit });
    } else {
      setNewAction({
        id: null,
        title: '',
        action_type: 'whatsapp',
        content_type: 'Reality',
        delay_value: 0,
        delay_unit: 'days',
      });
    }
    setIsActionFormOpen(true);
  };

  const handleSaveAction = async (e) => {
    e.preventDefault();
    let multiplier = 1;
    if (newAction.delay_unit === 'minutes') multiplier = 1 / (24 * 60);
    else if (newAction.delay_unit === 'hours') multiplier = 1 / 24;
    else if (newAction.delay_unit === 'weeks') multiplier = 7;
    else if (newAction.delay_unit === 'months') multiplier = 30;
    const newOffsetDays = newAction.delay_value * multiplier;

    // GUARDRAIL 1: Dynamic Minimum Gap
    const minDays = globalSettings.min_gap_hours / 24;
    const conflict = actions.find(
      (a) =>
        a.id !== newAction.id &&
        Math.abs(a.offset_days - newOffsetDays) < minDays
    );
    if (conflict) {
      alert(
        `🛑 SPAM GUARDRAIL ACTIVATED:\n\nActions must be spaced at least ${globalSettings.min_gap_hours} hours apart based on your Global Settings. Please adjust the delay.`
      );
      return;
    }

    // GUARDRAIL 2: Dynamic Max Messages Per Week
    const maxAllowed = globalSettings.max_msgs_per_week;
    const allOffsets = actions
      .filter((a) => a.id !== newAction.id)
      .map((a) => a.offset_days)
      .concat(newOffsetDays)
      .sort((a, b) => a - b);
    for (let i = 0; i <= allOffsets.length - (maxAllowed + 1); i++) {
      if (allOffsets[i + maxAllowed] - allOffsets[i] <= 7) {
        alert(
          `🛑 SPAM GUARDRAIL ACTIVATED:\n\nMaximum ${maxAllowed} messages allowed per 7-day rolling window to prevent lead burnout.`
        );
        return;
      }
    }

    const finalPayload = {
      ...newAction,
      stage_id: selectedStage.id,
      offset_days: newOffsetDays,
    };
    await mockApi.saveNurtureAction(finalPayload);
    setActions(await mockApi.getNurtureActions(selectedStage.id));
    setIsActionFormOpen(false);
  };

  const handleDeleteAction = async (id) => {
    if (window.confirm('Delete this Nurture Action?')) {
      await mockApi.deleteNurtureAction(id);
      setActions(await mockApi.getNurtureActions(selectedStage.id));
    }
  };

  if (!selectedVersion)
    return (
      <div className="p-10 text-center text-gray-500">
        Loading Engine 2 Architecture...
      </div>
    );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] pb-6 relative">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-black text-blue-900 flex items-center">
            <Droplet className="w-5 h-5 mr-2 text-blue-500" />
            Engine 2: Delayed Conversion
            <span
              className={`ml-3 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                selectedVersion.status === 'active'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-orange-100 text-orange-700 border border-orange-200'
              }`}
            >
              {selectedVersion.status === 'active'
                ? 'LIVE - Auto Nurturing'
                : 'DRAFT MODE'}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedVersion.id}
            onChange={(e) =>
              setSelectedVersion(versions.find((v) => v.id === e.target.value))
            }
            className="bg-slate-50 border border-gray-200 rounded-lg px-4 py-2 font-bold text-blue-800 outline-none"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {selectedVersion.status === 'draft' && (
            <button
              onClick={handleMakeActive}
              className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-600 transition flex items-center shadow-sm"
            >
              <Power className="w-4 h-4 mr-1.5" /> Publish
            </button>
          )}
          <button
            onClick={handleCreateVersion}
            className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-100 transition flex items-center"
          >
            <Copy className="w-4 h-4 mr-1.5" /> Duplicate
          </button>

          {/* THE NEW GLOBAL SETTINGS BUTTON */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center"
          >
            <Settings className="w-4 h-4 mr-1.5" /> Settings
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h3 className="font-bold text-gray-800">Engine 2 Flow</h3>
            <button
              onClick={() => setIsAddingStage(true)}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium text-sm transition flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Stage
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {isAddingStage && (
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 flex mb-2">
                <input
                  autoFocus
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNewStage()}
                  placeholder="New Stage Name"
                  className="border rounded px-2 py-1 text-sm flex-1 outline-none"
                />
                <button
                  onClick={handleSaveNewStage}
                  className="ml-2 text-green-600"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsAddingStage(false);
                    setNewStageName('');
                  }}
                  className="ml-1 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {stages.map((stage, idx) => (
              <div
                key={stage.id}
                className={`p-3 rounded-xl border flex transition ${
                  selectedStage?.id === stage.id
                    ? 'bg-blue-50/50 border-blue-400 shadow-sm'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex flex-col border-r border-gray-200 pr-2 mr-3 justify-center text-gray-300">
                  <button
                    onClick={(e) => moveStage(e, idx, -1)}
                    disabled={idx === 0}
                    className="hover:text-blue-600 disabled:opacity-20"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => moveStage(e, idx, 1)}
                    disabled={idx === stages.length - 1}
                    className="hover:text-blue-600 disabled:opacity-20"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div
                    onClick={() => setSelectedStage(stage)}
                    className="flex-1 flex items-center cursor-pointer"
                  >
                    {isEditingStage === stage.id ? (
                      <div
                        className="flex w-full pr-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={stageNameInput}
                          onChange={(e) => setStageNameInput(e.target.value)}
                          className="border rounded px-2 py-1 text-sm outline-none w-full"
                        />
                        <button
                          onClick={() => handleSaveStageEdit(stage.id)}
                          className="ml-2 text-green-600"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsEditingStage(null)}
                          className="ml-1 text-gray-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-gray-800 text-sm">
                        {stage.name}
                      </span>
                    )}
                  </div>
                  {isEditingStage !== stage.id && (
                    <div className="flex items-center space-x-1 opacity-60 hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStageNameInput(stage.name);
                          setIsEditingStage(stage.id);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {stage.is_core ? (
                        <div
                          title="Core Stage: Cannot be deleted"
                          className="p-1.5 rounded text-gray-300 cursor-not-allowed"
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStage(stage.id);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
          {!selectedStage ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a Nurture Stage
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-gray-200 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg flex items-center">
                    Auto-Actions for "{selectedStage.name}"
                  </h3>
                </div>
                <button
                  onClick={() => openActionForm()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center shadow-sm hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Schedule Action
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                {actions.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    No automations configured for this stage.
                  </div>
                ) : (
                  actions.map((act) => {
                    return (
                      <div
                        key={act.id}
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4 relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-400"></div>
                        <div className="flex-1 pl-2">
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-gray-800">
                              {act.title}
                            </h4>
                            <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded border border-purple-200 uppercase tracking-wide">
                              {act.content_type} INTENT
                            </span>
                            <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded border border-gray-200">
                              Execution: Day {act.offset_days}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openActionForm(act)}
                            className="p-2 text-gray-400 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAction(act.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {isActionFormOpen && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col border-t-4 border-blue-500">
                  <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h3 className="font-bold text-xl">
                      {newAction.id ? 'Edit Automation' : 'Schedule Automation'}
                    </h3>
                    <button onClick={() => setIsActionFormOpen(false)}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form
                    onSubmit={handleSaveAction}
                    className="flex-1 p-6 space-y-6 overflow-y-auto"
                  >
                    <div>
                      <label className="block text-sm font-bold mb-1.5">
                        Action Title (Internal Use)
                      </label>
                      <input
                        type="text"
                        value={newAction.title}
                        onChange={(e) =>
                          setNewAction({ ...newAction, title: e.target.value })
                        }
                        className="w-full border rounded-xl px-4 py-2 bg-slate-50"
                        placeholder="e.g. Day 3 Reality Drop"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex gap-2 col-span-2">
                        <div className="flex-1">
                          <label className="block text-sm font-bold mb-1.5 text-blue-800">
                            Target Execution Time (Value)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={newAction.delay_value}
                            onChange={(e) =>
                              setNewAction({
                                ...newAction,
                                delay_value: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full border border-blue-300 rounded-xl px-4 py-2 bg-blue-50"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-bold mb-1.5 text-blue-800">
                            Time Unit
                          </label>
                          <select
                            value={newAction.delay_unit}
                            onChange={(e) =>
                              setNewAction({
                                ...newAction,
                                delay_unit: e.target.value,
                              })
                            }
                            className="w-full border border-blue-300 rounded-xl px-4 py-2 bg-blue-50 text-blue-800 font-bold"
                          >
                            <option value="minutes">Minutes</option>
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                      <h4 className="font-bold text-slate-800 flex items-center text-sm mb-4">
                        <Zap className="w-4 h-4 mr-2 text-indigo-500" /> Smart
                        Script Integration
                      </h4>
                      <label className="block text-sm font-bold mb-1.5">
                        Select Message Intent
                      </label>
                      <select
                        value={newAction.content_type}
                        onChange={(e) =>
                          setNewAction({
                            ...newAction,
                            content_type: e.target.value,
                          })
                        }
                        className="w-1/2 border border-slate-300 rounded-xl px-4 py-2 font-bold text-indigo-700"
                      >
                        <option value="Reality">Reality Drop</option>
                        <option value="Insight">Insight Hook</option>
                        <option value="Proof">Micro Proof / Case Study</option>
                        <option value="Soft Question">Soft Question</option>
                        <option value="Invite">Soft Invite / CTA</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-blue-700 transition shadow-sm"
                    >
                      Enforce & Schedule Action
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* --- GLOBAL SETTINGS MODAL --- */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-gray-800 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-indigo-600" /> Global
                Nurture Settings
              </h3>
              <button onClick={() => setIsSettingsModalOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                  <label className="block text-sm font-bold mb-2 text-blue-900">
                    Minimum Message Gap (Hours)
                  </label>
                  <p className="text-xs text-blue-700 mb-3">
                    Enforces a mandatory quiet period between any two automated
                    messages to prevent spamming.
                  </p>
                  <input
                    type="number"
                    value={globalSettings.min_gap_hours}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        min_gap_hours: parseInt(e.target.value),
                      })
                    }
                    className="w-full border border-blue-200 rounded-lg px-4 py-2 font-bold"
                    min="1"
                    required
                  />
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                  <label className="block text-sm font-bold mb-2 text-indigo-900">
                    Max Messages Per 7 Days
                  </label>
                  <p className="text-xs text-indigo-700 mb-3">
                    Caps the maximum allowable touchpoints within any rolling
                    1-week window.
                  </p>
                  <input
                    type="number"
                    value={globalSettings.max_msgs_per_week}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        max_msgs_per_week: parseInt(e.target.value),
                      })
                    }
                    className="w-full border border-indigo-200 rounded-lg px-4 py-2 font-bold"
                    min="1"
                    max="10"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-sm"
              >
                Save Global Rules
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
