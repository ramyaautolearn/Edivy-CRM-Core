import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Filter, Copy, CheckCircle, MessageSquare, Zap, Target, FilterX, ShieldAlert, Star, Paperclip, Link as LinkIcon
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function AgentVaultTab() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterEngine, setFilterEngine] = useState('all');
  
  // UX State
  const [copiedId, setCopiedId] = useState(null);

  const appId = 'edivy-crm-vault';

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'scripts'), (snap) => {
      const fetchedScripts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setScripts(fetchedScripts);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCopy = (id, content) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000); 
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterTier('all');
    setFilterEngine('all');
  };

  const uniqueTypes = [...new Set(scripts.map(s => s.message_type).filter(Boolean))];

  const displayedScripts = scripts.filter(script => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchContent = (script.content || '').toLowerCase().includes(q);
      const matchType = (script.message_type || '').toLowerCase().includes(q);
      if (!matchContent && !matchType) return false;
    }
    if (filterType !== 'all' && script.message_type !== filterType) return false;
    if (filterTier !== 'all' && script.pc1 !== filterTier && script.pc1 !== 'Any') return false;
    if (filterEngine !== 'all' && script.engine?.toString() !== filterEngine) return false;
    return true;
  });

  const isFilterActive = searchQuery || filterType !== 'all' || filterTier !== 'all' || filterEngine !== 'all';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="animate-pulse flex items-center text-indigo-500 font-black tracking-widest uppercase text-sm">
          <Zap className="w-5 h-5 mr-2 animate-bounce" /> Unlocking Vault...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
              <BookOpen className="w-8 h-8 mr-3 text-indigo-600" /> Tactical Vault
            </h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-1 text-amber-500" /> Approved Playbooks & Objection Handlers
            </p>
          </div>
          <div className="text-left sm:text-right bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-3xl font-black text-indigo-600 tabular-nums leading-none">{scripts.length}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Active Scripts</div>
          </div>
        </div>

        {/* Filter & Search Dashboard */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search scripts by keyword (e.g., 'busy', 'price')..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 transition-colors" 
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <select 
              value={filterEngine} 
              onChange={(e) => setFilterEngine(e.target.value)} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-black text-slate-600 outline-none uppercase tracking-widest cursor-pointer w-full sm:w-auto"
            >
              <option value="all">All Engines</option>
              <option value="1">Engine 1 (Active)</option>
              <option value="2">Engine 2 (Nurture)</option>
            </select>

            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-black text-slate-600 outline-none uppercase tracking-widest cursor-pointer w-full sm:w-auto"
            >
              <option value="all">Any Category</option>
              {uniqueTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            
            <select 
              value={filterTier} 
              onChange={(e) => setFilterTier(e.target.value)} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-black text-slate-600 outline-none uppercase tracking-widest cursor-pointer w-full sm:w-auto"
            >
              <option value="all">Any Tier</option>
              <option value="Any">Global (Any Tier)</option>
              <option value="Elite/Professional">Elite/Professional</option>
              <option value="Middle-Income">Middle-Income</option>
              <option value="Mass-Market">Mass-Market</option>
            </select>

            {isFilterActive && (
              <button onClick={clearFilters} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 rounded-xl flex items-center justify-center transition-colors shadow-sm" title="Clear Filters">
                <FilterX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scripts Grid */}
        {displayedScripts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm">
            <Filter className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-black text-slate-700 mb-2">No Scripts Found</h3>
            <p className="text-sm font-medium text-slate-500">Try adjusting your filters or search terms.</p>
            {isFilterActive && (
               <button onClick={clearFilters} className="mt-6 bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Clear All Filters</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedScripts.map(script => {
              const isCopied = copiedId === script.id;
              const isGlobal = script.pc1 === 'Any';
              
              let badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
              const typeLower = (script.message_type || '').toLowerCase();
              if (typeLower.includes('objection')) badgeColor = "bg-red-50 text-red-700 border-red-200";
              else if (typeLower.includes('follow') || typeLower.includes('nurture') || typeLower.includes('recovery')) badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
              else if (typeLower.includes('cold') || typeLower.includes('outreach') || typeLower.includes('opening')) badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
              else if (typeLower.includes('demo') || typeLower.includes('book') || typeLower.includes('closing')) badgeColor = "bg-purple-50 text-purple-700 border-purple-200";

              return (
                <div key={script.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group relative">
                  
                  {/* Engine Indicator Bar */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${script.engine === 1 ? 'bg-indigo-500' : 'bg-blue-400'}`}></div>

                  {/* BUG FIX: Card Header Layout (Flex-wrap added to prevent clipping) */}
                  <div className="pl-6 pr-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                        <div className="flex flex-wrap gap-2 min-w-0">
                           <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border w-max truncate max-w-full ${badgeColor}`} title={script.message_type || 'Uncategorized'}>
                             {script.message_type || 'Uncategorized'}
                           </span>
                           <span className={`text-[9px] font-black uppercase tracking-widest w-max flex items-center ${script.engine === 1 ? 'text-indigo-500' : 'text-blue-500'}`}>
                             Engine {script.engine} Script
                           </span>
                        </div>
                        {isGlobal && (
                          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center bg-amber-50 px-2 py-1 rounded-md border border-amber-200 shrink-0">
                            <Star className="w-3 h-3 mr-1 fill-current" /> Global
                          </span>
                        )}
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="pl-6 pr-5 py-5 flex-1 bg-white relative">
                    <MessageSquare className="w-8 h-8 absolute top-4 right-4 text-slate-100 z-0" />
                    <div className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed relative z-10">
                      {script.content || 'No content available.'}
                    </div>
                  </div>
                  
                  {/* Card Footer */}
                  <div className="pl-6 pr-5 py-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-4 mt-auto">
                    
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Target className="w-3 h-3 mr-1" /> Target Profile</span>
                      <div className="flex flex-wrap gap-2 text-[9px] font-bold text-slate-600">
                        <span className="bg-white px-2 py-1 rounded border border-slate-200 shadow-sm truncate max-w-full">Tier: {script.pc1 || 'Any'}</span>
                        {script.pc2 && script.pc2 !== 'Any' && <span className="bg-white px-2 py-1 rounded border border-slate-200 shadow-sm truncate max-w-full">Tech: {script.pc2}</span>}
                        {script.pc3 && script.pc3 !== 'Any' && <span className="bg-white px-2 py-1 rounded border border-slate-200 shadow-sm truncate max-w-full">Vision: {script.pc3}</span>}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full pt-2 border-t border-slate-200 border-dashed">
                        {script.media_url && (
                          <button 
                            onClick={() => window.open(script.media_url, '_blank')}
                            className="flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 shadow-sm"
                          >
                            <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> View Asset
                          </button>
                        )}
                        <button 
                          onClick={() => handleCopy(script.id, script.content)}
                          className={`flex-[2] px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center shadow-sm ${
                            isCopied 
                              ? 'bg-emerald-500 text-white border-transparent' 
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          {isCopied ? (
                            <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Copied!</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Script</>
                          )}
                        </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}