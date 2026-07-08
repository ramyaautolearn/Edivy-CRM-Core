import React, { useState } from 'react';
import {
  Target,
  GitMerge,
  Droplet,
  Droplets,
  BookOpen,
  LogOut,
  Shield,
  UserCog,
  Lock,
  LayoutDashboard,
  Users,
  Activity,
  FolderOpen,
  Calendar,
  Briefcase,
  Settings,
  Radar // <-- NEW: Added Radar icon for E0 Prospecting
} from 'lucide-react';

// ==========================================
// 1. YOUR REAL COMPONENTS RECONNECTED!
// ==========================================
import E2CommandCenter from './components/E2CommandCenter';
import ControlTower from './components/ControlTower';
import AgentDashboard from './components/AgentDashboard';
import LeadEngine from './components/LeadEngine';
import PipelineBuilder from './components/PipelineBuilder';
import NurtureBuilder from './components/NurtureBuilder';
import ScriptLibrary from './components/ScriptLibrary';
import AdminAgents from './components/AdminAgents';
import AgentAnalytics from './components/AgentAnalytics'; 
import MediaVault from './components/MediaVault'; 
import MeetingCalendar from './components/MeetingCalendar';
import OnboardingDesk from './components/OnboardingDesk';
import E3OnboardingBuilder from './components/E3OnboardingBuilder';
import ProspectingDesk from './components/ProspectingDesk'; // <-- NEW: E0 Prospecting Desk

// ==========================================
// 2. YOUR REAL FIREBASE RECONNECTED!
// ==========================================
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase'; 

// --- LOGIN SCREEN ---
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      // 1. Authenticate with Firebase Secure Vault
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // 2. Look up their real profile in the CRM Database
      const q = query(
        collection(db, 'artifacts', 'edivy-crm-vault', 'public', 'data', 'users'), 
        where('email', '==', firebaseUser.email.toLowerCase())
      );
      
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // 3. Match Found! Use their real name and role
        const userData = querySnapshot.docs[0].data();
        onLogin({
          id: querySnapshot.docs[0].id,
          name: userData.name,
          role: userData.role,
          email: firebaseUser.email,
        });
      } else {
        // Fallback just in case the profile isn't fully set up yet
        const isAdmin = firebaseUser.email.toLowerCase().includes('admin');
        onLogin({
          id: firebaseUser.uid,
          name: firebaseUser.email.split('@')[0], 
          role: isAdmin ? 'admin' : 'staff',
          email: firebaseUser.email,
        });
      }
    } catch (err) {
      console.error('Firebase Login Error:', err);
      setError(
        'Access Denied: Invalid email or password. Check Firebase credentials.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Edivy Core
          </h1>
          <p className="text-indigo-200 mt-2 font-medium">Secure CRM Access</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start text-red-700 text-sm font-medium">
              <Lock className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your corporate email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center disabled:opacity-70"
            >
              {isLoggingIn ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-400">
            <span className="hover:text-indigo-600 transition-colors">
              Protected by Edivy Security
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('control-tower');

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  if (user.role === 'staff' && activeTab !== 'agent-workspace') {
    setActiveTab('agent-workspace');
  }

  // YOUR REAL COMPONENTS ARE PLUGGED BACK IN HERE
  const renderContent = () => {
    switch (activeTab) {
      case 'e0-prospecting': // <-- NEW ROUTE
        return <ProspectingDesk user={user} />;
      case 'e2-command-center':
        return <E2CommandCenter user={user} />; 
      case 'onboarding-desk':
        return <OnboardingDesk user={user} />;
      case 'control-tower':
        return <ControlTower />;
      case 'meeting-calendar': 
        return <MeetingCalendar />;
      case 'agent-workspace':
        return <AgentDashboard user={user} />;
      case 'lead-engine':
        return <LeadEngine />;
      case 'pipeline-builder':
        return <PipelineBuilder />;
      case 'nurture-builder':
        return <NurtureBuilder />;
      case 'e3-builder':
        return <E3OnboardingBuilder />;
      case 'script-library':
        return <ScriptLibrary />;
      case 'media-vault': 
        return <MediaVault />;
      case 'admin-agents':
        return <AdminAgents />;
      case 'agent-analytics':
        return <AgentAnalytics />;
      default:
        return <ControlTower />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* SIDEBAR */}
      <aside className="w-[260px] bg-[#0f172a] flex flex-col border-r border-[#1e293b] shrink-0">
        <div className="px-5 py-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#3b82f6] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-semibold text-white tracking-tight">Edivy</h1>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                user.role === 'admin' ? 'bg-[#22c55e]' : 'bg-[#3b82f6]'
              }`}
            />
            <p className="text-xs text-[#94a3b8] truncate">{user.name}</p>
          </div>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {user.role === 'admin' && (
            <>
              <p className="text-[10px] font-medium text-[#475569] uppercase tracking-wider px-2 py-2">
                Executive
              </p>

              <SidebarItem
                icon={<Radar />}
                label="Prospecting Desk"
                id="e0-prospecting"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />

              <SidebarItem
                icon={<Droplets />}
                label="E2 Command Center"
                id="e2-command-center"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<Briefcase />}
                label="Onboarding"
                id="onboarding-desk"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<LayoutDashboard />}
                label="Control Tower"
                id="control-tower"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<Calendar />}
                label="Calendar"
                id="meeting-calendar"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />

              <p className="text-[10px] font-medium text-[#475569] uppercase tracking-wider px-2 py-2 mt-4">
                Execution
              </p>
            </>
          )}

          <SidebarItem
            icon={<Users />}
            label="Workspace"
            id="agent-workspace"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {user.role === 'admin' && (
            <>
              <p className="text-[10px] font-medium text-[#475569] uppercase tracking-wider px-2 py-2 mt-4">
                Builders
              </p>
              <SidebarItem
                icon={<Target />}
                label="Lead Engine"
                id="lead-engine"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<GitMerge />}
                label="Pipeline"
                id="pipeline-builder"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<Droplet />}
                label="Nurture"
                id="nurture-builder"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<Settings />}
                label="Onboarding Flow"
                id="e3-builder"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<BookOpen />}
                label="Scripts"
                id="script-library"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<FolderOpen />}
                label="Media"
                id="media-vault"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<UserCog />}
                label="Agents"
                id="admin-agents"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<Activity />}
                label="Activity"
                id="agent-analytics"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-[#1e293b]">
          <button
            onClick={() => setUser(null)}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-[#64748b] hover:text-white hover:bg-[#1e293b] rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" /> Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA - Full width, no max-width restriction */}
      <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
        {renderContent()}
      </main>
    </div>
  );
}

// --- HELPER COMPONENT ---
function SidebarItem({ icon, label, id, activeTab, setActiveTab }) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[#3b82f6] text-white'
          : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1e293b]'
      }`}
    >
      <span className={`mr-2.5 ${isActive ? 'text-white' : 'text-[#64748b]'}`}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon, { size: 16 })
          : null}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}