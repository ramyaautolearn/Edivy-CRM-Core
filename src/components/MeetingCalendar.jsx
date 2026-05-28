import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Users, Video, Briefcase } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function MeetingCalendar() {
  const [meetings, setMeetings] = useState([]);
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

    // 2. Fetch all leads and extract ALL meetings (E1 Demos & E3 Setups)
    const unsubLeads = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), (snap) => {
      const fetchedLeads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      let allMeetings = [];

      fetchedLeads.forEach(l => {
        // Extract E1 Sales Demos
        if (l.is_demo_booked) {
          allMeetings.push({
            ...l,
            event_id: `${l.id}_demo`,
            event_type: 'Sales Demo',
            event_date: l.demo_date,
            engine: 1
          });
        }
        // Extract E3 Onboarding Setups
        if (l.is_setup_booked) {
          allMeetings.push({
            ...l,
            event_id: `${l.id}_setup`,
            event_type: 'Onboarding Setup',
            event_date: l.setup_date,
            engine: 3
          });
        }
      });

      setMeetings(allMeetings);
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

  // Sort chronologically by the new universal event_date
  const sortedMeetings = [...meetings].sort((a, b) => {
    if (!a.event_date) return 1;
    if (!b.event_date) return -1;
    return new Date(a.event_date) - new Date(b.event_date);
  });

  // Filter based on selected tab
  const filteredMeetings = sortedMeetings.filter(m => {
    if (!m.event_date) return filter === 'all' || filter === 'upcoming'; 
    const mDate = new Date(m.event_date);
    if (filter === 'upcoming') return mDate >= now;
    if (filter === 'past') return mDate < now;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50">
      
      {/* HEADER */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center tracking-tight">
            <Calendar className="w-8 h-8 mr-3 text-indigo-600" /> Meeting Calendar
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">
            Master view of all Sales Pitches & Onboarding Setups
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl self-start md:self-auto">
          <button onClick={() => setFilter('upcoming')} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === 'upcoming' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Upcoming ({sortedMeetings.filter(m => !m.event_date || new Date(m.event_date) >= now).length})
          </button>
          <button onClick={() => setFilter('past')} className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filter === 'past' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            Past ({sortedMeetings.filter(m => m.event_date && new Date(m.event_date) < now).length})
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
        ) : filteredMeetings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center shadow-sm">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No Meetings Found</h3>
            <p className="text-sm font-medium text-slate-500 mt-2">There are no {filter} meetings in the pipeline right now.</p>
          </div>
        ) : (
          filteredMeetings.map((meeting) => {
            const isPast = meeting.event_date && new Date(meeting.event_date) < now;
            const dateObj = meeting.event_date ? new Date(meeting.event_date) : null;
            
            // Dynamic styling based on Engine (E1 = Blue/Sales, E3 = Emerald/Onboarding)
            const isSetup = meeting.engine === 3;
            const cardTheme = isPast ? 'border-slate-200 opacity-80' : (isSetup ? 'border-emerald-200' : 'border-blue-200');
            const leftColTheme = isPast ? 'bg-slate-50 border-slate-200 text-slate-500' : (isSetup ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 'bg-blue-50/50 border-blue-100 text-blue-900');
            
            return (
              <div key={meeting.event_id} className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col md:flex-row overflow-hidden ${cardTheme}`}>
                
                {/* DATE / TIME COLUMN */}
                <div className={`p-6 md:w-64 flex flex-col justify-center shrink-0 border-b md:border-b-0 md:border-r ${leftColTheme}`}>
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

                {/* MEETING INFO */}
                <div className="p-6 flex-1 flex flex-col justify-center relative">
                  
                  {/* Dynamic Event Type Badge */}
                  <div className="absolute top-6 right-6 flex gap-2">
                     <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center ${isSetup ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                       {isSetup ? <Briefcase className="w-3.5 h-3.5 mr-1.5" /> : <Video className="w-3.5 h-3.5 mr-1.5" />}
                       {meeting.event_type}
                     </span>
                  </div>

                  <div className="flex items-center justify-between mb-2 pr-40">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{meeting.school_name}</h2>
                  </div>
                  
                  {/* Stage tag */}
                  <div className="mb-3">
                     <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                       {meeting.stage_name || 'Active Pipeline'}
                     </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-6 mt-1 text-sm font-bold text-slate-500">
                    <div className="flex items-center"><User className="w-4 h-4 mr-1.5 text-slate-400" /> {meeting.contact_name || 'No Contact Name'}</div>
                    <div className="flex items-center"><Phone className="w-4 h-4 mr-1.5 text-slate-400" /> {meeting.phone || 'No Phone'}</div>
                    <div className="flex items-center"><Users className="w-4 h-4 mr-1.5 text-indigo-400" /> Agent: <span className="text-indigo-700 ml-1">{getAgentName(meeting.assigned_to)}</span></div>
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