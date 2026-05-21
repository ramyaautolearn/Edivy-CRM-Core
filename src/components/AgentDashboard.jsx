import React, { useState } from 'react';
import { LayoutDashboard, Swords, BookOpen, Clock } from 'lucide-react';

// We will build these separate components next!
import AgentDashboardTab from './AgentDashboardTab';
import DealRoomTab from './DealRoomTab';
import AgentVaultTab from './AgentVaultTab';
import AgentTimesheetTab from './AgentTimesheetTab';

export default function AgentOS({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeLeadId, setActiveLeadId] = useState(null); // Used to pass a lead to the Deal Room

  // Function to jump straight from the Dashboard to a specific lead in the Deal Room
  const openDealRoom = (leadId) => {
    setActiveLeadId(leadId);
    setActiveTab('deal_room');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 font-sans text-slate-800 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      
      {/* OS Navigation Header */}
      <header className="bg-[#0B0F19] text-white p-2 flex items-center justify-between shrink-0">
        <div className="flex gap-1 ml-4">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Command Center" 
          />
          <NavButton 
            active={activeTab === 'deal_room'} 
            onClick={() => setActiveTab('deal_room')} 
            icon={<Swords className="w-4 h-4" />} 
            label="Deal Room" 
          />
          <NavButton 
            active={activeTab === 'vault'} 
            onClick={() => setActiveTab('vault')} 
            icon={<BookOpen className="w-4 h-4" />} 
            label="Script Vault" 
          />
          <NavButton 
            active={activeTab === 'timesheet'} 
            onClick={() => setActiveTab('timesheet')} 
            icon={<Clock className="w-4 h-4" />} 
            label="Timesheet" 
          />
        </div>
        <div className="mr-6 text-[10px] font-black uppercase tracking-widest text-indigo-400">
          Agent OS v2.0
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-slate-100">
        {activeTab === 'dashboard' && <AgentDashboardTab user={user} openDealRoom={openDealRoom} />}
        {activeTab === 'deal_room' && <DealRoomTab user={user} initialLeadId={activeLeadId} />}
        {activeTab === 'vault' && <AgentVaultTab user={user} />}
        {activeTab === 'timesheet' && <AgentTimesheetTab user={user} />}
      </main>
      
    </div>
  );
}

// Helper Component for the Top Nav Buttons
function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 rounded-t-lg text-xs font-black uppercase tracking-widest transition-colors ${
        active 
          ? 'bg-slate-100 text-indigo-700' 
          : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon} {label}
    </button>
  );
}