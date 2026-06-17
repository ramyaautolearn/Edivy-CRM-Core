import React, { useState, useEffect } from 'react';
import { 
  Building2, MapPin, Users, BookOpen, 
  BrainCircuit, Activity, Target, CheckCircle2, 
  XOctagon, Clock, Zap, ArrowRight, Search, Map, Network
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

export default function ProspectingDesk() {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // Scouting Engine States
  const [isScouting, setIsScouting] = useState(false);
  const [scoutStatus, setScoutStatus] = useState('');

  // Single Sniper States
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualArea, setManualArea] = useState('');
  const [manualSource, setManualSource] = useState('Cold Outreach'); // Default Lead Source

  const vaultPath = ['artifacts', 'edivy-crm-vault', 'public', 'data', 'leads'];

  const tier1Corridors = [
    'Kompally', 'Bachupally', 'Nizampet', 'Miyapur', 
    'Tellapur', 'Narsingi', 'Manikonda', 'Patancheru'
  ];

  useEffect(() => {
    const q = query(
      collection(db, ...vaultPath),
      where('status', '==', 'e0_prospect')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const qualified = fetched.filter(p => p.ai_score >= 10);
      qualified.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
      setProspects(qualified);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDecision = async (prospect, decision) => {
    setProcessingId(prospect.id);
    const leadRef = doc(db, ...vaultPath, prospect.id);

    try {
      if (decision === 'APPROVE') {
        await updateDoc(leadRef, { status: 'e1_action_queue', stage_name: 'Stage 1: Discovered', approved_at: serverTimestamp(), is_new_lead: true });
      } else if (decision === 'NURTURE') {
        await updateDoc(leadRef, { status: 'e2_nurture', nurture_reason: 'Not ready for E1, auto-drip engaged', moved_to_e2_at: serverTimestamp() });
      } else if (decision === 'REJECT') {
        await updateDoc(leadRef, { status: 'archived', archive_reason: 'Failed Human Qualification', archived_at: serverTimestamp() });
      }
    } catch (error) {
      console.error("Error updating prospect:", error);
    }
    setProcessingId(null);
  };

  // --- AUTOMATED OFFLINE CORRIDOR SCOUT ---
  const runLiveScout = async (targetArea) => {
    setIsScouting(true);

    try {
      setScoutStatus(`Deploying offline scout to ${targetArea}...`);
      
      const localSchoolVault = {
        'Kompally': [{ name: 'DRS International School', rating: '4.2', students: '1200', board: 'IB/CBSE' }, { name: 'Unicent School', rating: '4.1', students: '900', board: 'CBSE' }],
        'Bachupally': [{ name: 'Oakridge International School', rating: '4.5', students: '1500', board: 'IB/CBSE' }, { name: 'Kennedy High The Global School', rating: '4.3', students: '2000', board: 'CBSE' }],
        'Nizampet': [{ name: 'Sanghamitra School', rating: '4.4', students: '1800', board: 'CBSE' }],
        'Miyapur': [{ name: 'Sentia The Global School', rating: '4.3', students: '1100', board: 'CBSE' }],
        'Tellapur': [{ name: 'Manthan International School', rating: '4.6', students: '1400', board: 'CAIE/CBSE' }],
        'Narsingi': [{ name: 'Global Edge School', rating: '4.2', students: '1000', board: 'CBSE' }],
        'Manikonda': [{ name: 'Mount Litera Zee School', rating: '4.1', students: '1300', board: 'CBSE' }],
        'Patancheru': [{ name: 'Delhi Public School', rating: '4.5', students: '2200', board: 'CBSE' }]
      };

      const schoolsToProcess = localSchoolVault[targetArea];

      if (!schoolsToProcess) {
        setScoutStatus(`No simulation targets programmed for ${targetArea} yet.`);
        setTimeout(() => setIsScouting(false), 3000);
        return;
      }

      await new Promise(r => setTimeout(r, 1000));

      for (const school of schoolsToProcess) {
        setScoutStatus(`Interrogating: ${school.name}...`);
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        const generatedScore = Math.floor(Math.random() * 7) + 16;
        const assignedTier = generatedScore >= 20 ? "Tier 1" : "Tier 2";

        const aiData = {
          ai_score: generatedScore,
          tier: assignedTier,
          growth_probability: "High",
          ai_brief: `Growth tension detected in ${targetArea}. Active admissions campaign visible. A prime candidate for Parent Pulse to increase conversion rates in this highly competitive corridor.`,
          student_count: school.students,
          board: school.board,
          decision_maker: "Correspondent / Chairman"
        };

        setScoutStatus(`Delivering: ${school.name}...`);
        await addDoc(collection(db, ...vaultPath), {
          ...aiData,
          school_name: school.name,
          area: targetArea,
          status: "e0_prospect",
          admissions_active: true,
          lead_source: "AI Scout (Automated)", // Auto-tagging automated leads
          created_at: serverTimestamp()
        });
      }
      setScoutStatus('Intake Complete. Desk Populated.');
    } catch (e) {
      console.error(e);
      setScoutStatus('Scout Failed. Check Console.');
    }
    setTimeout(() => setIsScouting(false), 2000);
  };

  // --- MANUAL OVERRIDE: SINGLE SNIPER ---
  const runManualScout = async (e) => {
    e.preventDefault();
    if (!manualName || !manualArea) return;

    setIsScouting(true);
    setScoutStatus(`Interrogating manual target: ${manualName}...`);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const generatedScore = Math.floor(Math.random() * 7) + 16;
      const assignedTier = generatedScore >= 20 ? "Tier 1" : "Tier 2";

      const aiData = {
        ai_score: generatedScore,
        tier: assignedTier,
        growth_probability: "High",
        ai_brief: `Manual target injected for ${manualArea}. Assuming high growth tension based on user override. Parent Pulse integration recommended to capture local market share.`,
        student_count: "Unknown",
        board: "Unknown",
        decision_maker: "Correspondent / Principal"
      };

      setScoutStatus(`Delivering: ${manualName}...`);

      await addDoc(collection(db, ...vaultPath), {
        ...aiData,
        school_name: manualName,
        area: manualArea,
        status: "e0_prospect",
        admissions_active: true,
        lead_source: manualSource, // Pulling from your new dropdown
        created_at: serverTimestamp()
      });

      setManualName('');
      setManualArea('');
      setManualSource('Cold Outreach');
      setShowManualEntry(false);
      setScoutStatus('Manual Intake Complete.');
    } catch (err) {
      console.error(err);
      setScoutStatus('Manual Intake Failed. Check Console.');
    }

    setTimeout(() => setIsScouting(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        <BrainCircuit className="w-8 h-8 animate-pulse mr-3" /> Processing AI Intakes...
      </div>
    );
  }

  // --- COMMAND CENTER (Empty Desk) ---
  if (prospects.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-950 text-slate-300 space-y-6 overflow-y-auto py-12">
        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 shadow-xl shrink-0">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="text-center shrink-0">
          <h2 className="text-2xl font-black tracking-tight text-white mb-2">Prospecting Desk Cleared</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Your pipeline is clear. Deploy the AI Scout to high-growth corridors or inject a manual target.
          </p>
        </div>
        
        <div className="flex flex-col items-center space-y-5 mt-4 bg-slate-900/50 p-8 rounded-3xl border border-slate-800 w-full max-w-2xl shadow-2xl shrink-0">
          
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-4 w-full justify-center">
            <Map className="w-5 h-5 text-indigo-400" />
            <h3 className="text-slate-300 text-sm font-black tracking-widest uppercase">
              Automated Deployment
            </h3>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 w-full pb-4">
            {tier1Corridors.map((area) => (
              <button
                key={area}
                onClick={() => runLiveScout(area)}
                disabled={isScouting}
                className="px-5 py-2.5 bg-slate-950 border border-slate-700 hover:border-indigo-500 hover:bg-indigo-900/30 hover:text-white hover:scale-105 text-slate-400 transition-all rounded-xl text-sm font-bold disabled:opacity-50 shadow-lg flex items-center"
              >
                <Search className="w-3.5 h-3.5 mr-2 opacity-50" />
                {area}
              </button>
            ))}
          </div>

          {/* Manual Deployment Dropzone with Lead Source */}
          <div className="w-full pt-4 border-t border-slate-800">
            {!showManualEntry ? (
              <button
                onClick={() => setShowManualEntry(true)}
                disabled={isScouting}
                className="w-full py-4 bg-slate-950/50 border-2 border-slate-800 border-dashed hover:border-indigo-500/50 hover:bg-indigo-900/10 text-slate-500 hover:text-indigo-400 transition-all rounded-2xl text-sm font-bold flex items-center justify-center disabled:opacity-50 group"
              >
                <Target className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Manual Override: Single Sniper
              </button>
            ) : (
              <form onSubmit={runManualScout} className="bg-slate-950 p-6 rounded-2xl border border-indigo-500/30 w-full shadow-inner animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-5">
                   <h4 className="text-indigo-400 text-xs font-black tracking-widest uppercase flex items-center">
                     <Target className="w-4 h-4 mr-2" /> Sniper Coordinates
                   </h4>
                   <button type="button" onClick={() => setShowManualEntry(false)} className="text-slate-500 hover:text-red-400 transition-colors">
                     <XOctagon className="w-5 h-5" />
                   </button>
                </div>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Exact School Name (e.g., St. Andrews School)"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    disabled={isScouting}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Micro-Market / Area (e.g., Bowenpally)"
                    value={manualArea}
                    onChange={(e) => setManualArea(e.target.value)}
                    disabled={isScouting}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    required
                  />
                  
                  {/* NEW LEAD SOURCE DROPDOWN */}
                  <select
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value)}
                    disabled={isScouting}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50 appearance-none"
                  >
                    <option value="Cold Outreach">Lead Source: Cold Outreach</option>
                    <option value="Referral">Lead Source: Referral</option>
                    <option value="Existing Relationship">Lead Source: Existing Relationship</option>
                    <option value="Event">Lead Source: Event</option>
                    <option value="Website Inquiry">Lead Source: Website Inquiry</option>
                    <option value="Other">Lead Source: Other</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isScouting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white transition-all rounded-xl text-sm font-black tracking-wide shadow-lg flex items-center justify-center disabled:opacity-50"
                  >
                    {isScouting ? <BrainCircuit className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Score & Add to Desk
                  </button>
                </div>
              </form>
            )}
          </div>

          {isScouting && (
            <div className="flex items-center text-emerald-400 text-sm mt-4 font-medium tracking-wide bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 w-full justify-center">
              <BrainCircuit className="w-4 h-4 mr-2 animate-pulse" /> {scoutStatus}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- ACTIVE DESK (When Leads Exist) ---
  const activeProspect = prospects[0];

  return (
    <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-3xl relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-indigo-400" />
            <h1 className="text-indigo-400 font-bold tracking-widest uppercase text-sm">Human Approval Desk</h1>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full text-xs font-bold text-slate-400 shadow-inner">
            <span className="text-white">{prospects.length}</span> Qualified Leads Pending
          </div>
        </div>

        <div className={`bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${processingId === activeProspect.id ? 'scale-95 opacity-50 blur-sm' : 'scale-100 opacity-100'}`}>
          <div className={`px-8 py-4 flex items-center justify-between ${activeProspect.tier === 'Tier 1' ? 'bg-indigo-950/40 border-b border-indigo-900/50' : 'bg-slate-900 border-b border-slate-800'}`}>
            <div className="flex items-center space-x-3">
              <Zap className={`w-5 h-5 ${activeProspect.tier === 'Tier 1' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="font-black text-white tracking-wide">{activeProspect.tier || 'Tier 2'}</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Parent Pulse Score</span>
              <span className="text-white font-black text-lg">{activeProspect.ai_score || 'N/A'}/22</span>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-white tracking-tight">{activeProspect.school_name || 'Unknown School'}</h2>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 text-sm">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>{activeProspect.area || 'Unknown Area'}</span>
                </div>
                <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 text-sm">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>{activeProspect.student_count || '0'} Students</span>
                </div>
                <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 text-sm">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>{activeProspect.board || 'CBSE'}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 space-y-5 shadow-inner">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/50">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <BrainCircuit className="w-5 h-5" />
                  <span className="font-bold text-sm tracking-widest uppercase">AI Growth Brief</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center space-x-1 ${activeProspect.growth_probability === 'High' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                  <Activity className="w-3 h-3 mr-1" />
                  Probability: {activeProspect.growth_probability || 'Medium'}
                </div>
              </div>
              <div className="text-slate-300 text-lg leading-relaxed font-light">
                {activeProspect.ai_brief || "The AI detected strong admissions activity. Competitors are scaling in this corridor. Needs human review."}
              </div>

              {/* UPGRADED GRID: Now showing Decision Maker, Status, AND Lead Source */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest block mb-1">Decision Maker</span>
                  <span className="text-white font-medium flex items-center text-sm">
                    <Building2 className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                    <span className="truncate">{activeProspect.decision_maker || 'Owner'}</span>
                  </span>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest block mb-1">Admissions</span>
                  <span className="text-white font-medium flex items-center text-sm">
                    {activeProspect.admissions_active ? <><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse shrink-0" /> Active</> : <><span className="w-2 h-2 rounded-full bg-slate-500 mr-2 shrink-0" /> Passive</>}
                  </span>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest block mb-1">Lead Source</span>
                  <span className="text-white font-medium flex items-center text-sm">
                    <Network className="w-4 h-4 mr-2 text-indigo-400 shrink-0" />
                    <span className="truncate">{activeProspect.lead_source || 'AI Scout'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-0 border-t border-slate-800 bg-slate-950">
            <button onClick={() => handleDecision(activeProspect, 'REJECT')} className="group py-6 flex flex-col items-center justify-center border-r border-slate-800 hover:bg-red-500/10 transition-colors">
              <XOctagon className="w-8 h-8 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-red-500 text-xs font-bold tracking-widest uppercase">Reject / Kill</span>
            </button>
            <button onClick={() => handleDecision(activeProspect, 'NURTURE')} className="group py-6 flex flex-col items-center justify-center border-r border-slate-800 hover:bg-amber-500/10 transition-colors">
              <Clock className="w-8 h-8 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-amber-500 text-xs font-bold tracking-widest uppercase">E2 Nurture</span>
            </button>
            <button onClick={() => handleDecision(activeProspect, 'APPROVE')} className="group py-6 flex flex-col items-center justify-center bg-indigo-600 hover:bg-indigo-500 transition-colors relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <CheckCircle2 className="w-8 h-8 text-white mb-2 relative z-10 group-hover:scale-110 transition-transform" />
              <span className="text-white text-xs font-black tracking-widest uppercase relative z-10 flex items-center">
                Approve to E1 <ArrowRight className="w-3 h-3 ml-1" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}