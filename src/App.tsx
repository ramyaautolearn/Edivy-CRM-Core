import React, { useState } from 'react';
import {
  Target,
  GitMerge,
  Droplet,
  BookOpen,
  LogOut,
  Shield,
  UserCog,
  Lock,
  LayoutDashboard,
  Users,
} from 'lucide-react';

// ==========================================
// 1. YOUR REAL COMPONENTS RECONNECTED!
// ==========================================
import ControlTower from './components/ControlTower';
import AgentDashboard from './components/AgentDashboard';
import LeadEngine from './components/LeadEngine';
import PipelineBuilder from './components/PipelineBuilder';
import NurtureBuilder from './components/NurtureBuilder';
import ScriptLibrary from './components/ScriptLibrary';
import AdminAgents from './components/AdminAgents';

// ==========================================
// 2. YOUR REAL FIREBASE RECONNECTED!
// ==========================================
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

// --- LOGIN SCREEN ---
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('admin@edivy.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
      // Using YOUR exact Firebase Auth method
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      if (firebaseUser.email.toLowerCase().includes('admin')) {
        onLogin({
          id: 1,
          name: 'System Admin',
          role: 'admin',
          email: firebaseUser.email,
        });
      } else {
        onLogin({
          id: 2,
          name: 'John Doe',
          role: 'staff',
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
            <span className="cursor-pointer hover:text-indigo-600">
              Admin: admin@edivy.com
            </span>
            <span className="cursor-pointer hover:text-indigo-600">
              Staff: staff@edivy.com
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
      case 'control-tower':
        return <ControlTower />;
      case 'agent-workspace':
        return <AgentDashboard />;
      case 'lead-engine':
        return <LeadEngine />;
      case 'pipeline-builder':
        return <PipelineBuilder />;
      case 'nurture-builder':
        return <NurtureBuilder />;
      case 'script-library':
        return <ScriptLibrary />;
      case 'admin-agents':
        return <AdminAgents />;
      default:
        return <ControlTower />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* SIDEBAR */}
      <div className="w-64 bg-[#0B0F19] flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-white flex items-center tracking-tight">
            <Shield className="w-5 h-5 text-indigo-500 mr-2" /> CRM Core
          </h1>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Logged in as
          </p>
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                user.role === 'admin' ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
            ></div>
            <p className="text-sm font-bold text-white">{user.name}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {user.role === 'admin' && (
            <>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2 px-3">
                Executive
              </p>
              <SidebarItem
                icon={<LayoutDashboard />}
                label="Control Tower"
                id="control-tower"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />

              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-3">
                Execution
              </p>
            </>
          )}

          <SidebarItem
            icon={<Users />}
            label="Agent Workspace"
            id="agent-workspace"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {user.role === 'admin' && (
            <>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6 px-3">
                System Builders
              </p>
              <SidebarItem
                icon={<Target />}
                label="Lead Scoring Engine"
                id="lead-engine"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<GitMerge />}
                label="E1: Pipeline Builder"
                id="pipeline-builder"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<Droplet />}
                label="E2: Nurture Drops"
                id="nurture-builder"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<BookOpen />}
                label="Smart Scripts"
                id="script-library"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
              <SidebarItem
                icon={<UserCog />}
                label="Agent Management"
                id="admin-agents"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setUser(null)}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" /> Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50">
        <div className="p-8 max-w-7xl mx-auto">
          {/* This renders your real components! */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENT ---
function SidebarItem({ icon, label, id, activeTab, setActiveTab }) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
        isActive
          ? 'bg-indigo-600 text-white shadow-md'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <div className={`mr-3 ${isActive ? 'text-white' : 'text-slate-500'}`}>
        {React.isValidElement(icon)
          ? React.cloneElement(icon, { size: 18 })
          : null}
      </div>
      {label}
    </button>
  );
}
