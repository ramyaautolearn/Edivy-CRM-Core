import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Video, Users, CheckCircle, ArrowRight, LayoutList } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function DemoSchedule() {
  const [leads, setLeads] = useState([]);
  const [crmUsers, setCrmUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming' | 'past' | 'all'

  const appId = 'edivy-crm-vault';

  useEffect(() => {
    // 1. Fetch Users (To map Agent IDs to real names)
    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      if (!snap.empty) {
        setCrmUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });

    // 2. Fetch all leads and filter for Demos
    const unsubLeads = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), (snap) => {
      const fetchedLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const demoLeads = fetchedLeads.filter(l => l.is_demo_booked);
      setLeads(demoLeads);
      setLoading(false);
    });

    return () => { unsubUsers(); unsubLeads(); };
  }, []);

  const getAgentName = (assignedTo) => {
    if (!assignedTo) return 'Unassigned';
    const user = crmUsers.find(u => u.id === assignedTo || u.email === assignedTo);
    return user ? (user.name || user.full_name || user.email.split('@')[0]) : 'Unknown Agent';
  };

  const now = new Date();

  // Sort chronologically
  const sortedLeads = [...leads].sort((a, b) => {
    if (!a.demo_date) return 1;
    if (!b.demo_date) return -1;
    return new Date(a.demo_date) - new Date(b.demo_date);
  });

  // Filter based on selected tab
  const filteredLeads = sortedLeads.filter(l => {
    if (!l.demo_date) return filter === 'all' || filter === 'upcoming'; 
    const demoDate = new Date(l.demo_date);
    if (filter === 'upcoming') return demoDate >= now;
    if (filter === 'past') return demoDate < now;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50">
      
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
            <Calendar className="w-8 h-8 mr-3 text-blue-600" /> Demo Command Center
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">
            Bird's-eye view of all scheduled pitches
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl self-start md:self-auto">
          <button onClick={() => setFilter('upcoming')} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === 'upcoming' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Upcoming ({sortedLeads.filter(l => !l.demo_date || new Date(l.demo_date) >= now).length})
          </button>
          <button onClick={() => setFilter('past')} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === 'past' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Past ({sortedLeads.filter(l => l.demo_date && new Date(l.demo_date) < now).length})
          </button>
          <button onClick={() => setFilter('all')} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            All Bookings
          </button>
        </div>
      </div>

      {/* SCHEDULE LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Loading Schedule...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center shadow-sm">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No Demos Found</h3>
            <p className="text-sm font-medium text-slate-500 mt-2">There are no {filter} demos in the pipeline right now.</p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isPast = lead.demo_date && new Date(lead.demo_date) < now;
            const dateObj = lead.demo_date ? new Date(lead.demo_date) : null;
            
            return (
              <div key={lead.id} className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col md:flex-row overflow-hidden ${isPast ? 'border-slate-200 opacity-80' : 'border-blue-200'}`}>
                
                {/* DATE / TIME COLUMN */}
                <div className={`p-6 md:w-64 flex flex-col justify-center shrink-0 border-b md:border-b-0 md:border-r ${isPast ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-blue-50/50 border-blue-100 text-blue-900'}`}>
                  {dateObj ? (
                    <>
                      <div className="text-sm font-bold uppercase tracking-widest mb-1">{dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                      <div className="text-3xl font-black tabular-nums tracking-tighter flex items-center">
                        <Clock className="w-6 h-6 mr-2 opacity-50" />
                        {dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-black uppercase tracking-widest text-amber-600 flex items-center">
                      <Clock className="w-5 h-5 mr-2" /> Time TBD (Manual)
                    </div>
                  )}
                </div>

                {/* LEAD INFO */}
                <div className="p-6 flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{lead.school_name}</h2>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                      {lead.stage_name || 'Active Pipeline'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-6 mt-3 text-sm font-bold text-slate-500">
                    <div className="flex items-center"><User className="w-4 h-4 mr-1.5 text-slate-400" /> {lead.contact_name || 'No Contact Name'}</div>
                    <div className="flex items-center"><Phone className="w-4 h-4 mr-1.5 text-slate-400" /> {lead.phone || 'No Phone'}</div>
                    <div className="flex items-center"><Users className="w-4 h-4 mr-1.5 text-indigo-400" /> Agent: <span className="text-indigo-700 ml-1">{getAgentName(lead.assigned_to)}</span></div>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}