
import React, { useState, useEffect } from 'react';
import { MOCK_JENKINS_JOBS } from '../constants';
import { ViewMode } from '../types';
import { Play, FileText, Settings, Search, RefreshCw, CheckCircle2, XCircle, Clock, Ban, X, Terminal, Plus, FolderGit2 } from 'lucide-react';
import { jenkinsApi } from '../services/api';

interface JenkinsJobsProps {
  onViewChange: (view: ViewMode) => void;
}

const JenkinsJobs: React.FC<JenkinsJobsProps> = ({ onViewChange }) => {
  const [jobs, setJobs] = useState(MOCK_JENKINS_JOBS);
  const [consoleJob, setConsoleJob] = useState<{name: string, logs: string[]} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 加载 Jenkins 任务
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const data = await jenkinsApi.getAllJobs();
      setJobs(data);
    } catch (error) {
      console.error('Failed to load Jenkins jobs:', error);
      // 失败时使用模拟数据
      setJobs(MOCK_JENKINS_JOBS);
    } finally {
      setIsLoading(false);
    }
  };
  
  // New Item State
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 size={18} className="text-green-500" />;
      case 'FAILURE':
        return <XCircle size={18} className="text-red-500" />;
      case 'IN_PROGRESS':
        return <Clock size={18} className="text-blue-500 animate-spin" />;
      case 'ABORTED':
        return <Ban size={18} className="text-slate-400" />;
      default:
        return <Clock size={18} className="text-slate-400" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-50 text-green-700 border-green-100';
      case 'FAILURE': return 'bg-red-50 text-red-700 border-red-100';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const handleBuild = (id: string) => {
    setJobs(currentJobs => 
      currentJobs.map(job => 
        job.id === id 
          ? { ...job, status: 'IN_PROGRESS', lastDuration: 'Running...', lastTime: 'Just now' }
          : job
      )
    );

    // Simulate build completion
    setTimeout(() => {
      setJobs(currentJobs => 
        currentJobs.map(job => {
          if (job.id === id) {
            const nextBuildNum = parseInt(job.lastBuild.replace('#', '')) + 1;
            return { 
              ...job, 
              status: 'SUCCESS', 
              lastDuration: '45s', 
              lastBuild: `#${nextBuildNum}`,
              lastTime: 'Just now' 
            };
          }
          return job;
        })
      );
    }, 3000);
  };

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      await jenkinsApi.syncJobs();
      await loadJobs();
    } catch (error) {
      console.error('Failed to sync Jenkins jobs:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateJob = () => {
    if (!newItemName.trim()) return;

    const newJob = {
      id: `j-${Date.now()}`,
      name: newItemName,
      status: 'PENDING',
      lastDuration: 'N/A',
      lastBuild: '#0',
      lastTime: 'Never',
      branch: 'master'
    };

    setJobs([newJob, ...jobs]);
    setNewItemName('');
    setShowNewItemModal(false);
  };

  const generateMockLogs = (jobName: string) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    return [
      `[${timestamp}] Started by user Admin`,
      `[${timestamp}] Running in Durability level: MAX_SURVIVABILITY`,
      `[${timestamp}] [Pipeline] Start of Pipeline`,
      `[${timestamp}] [Pipeline] node {`,
      `[${timestamp}] [Pipeline] stage: Checkout`,
      `[${timestamp}] [Pipeline] checkout: git ${jobName}.git`,
      `[${timestamp}] [Pipeline] stage: Build`,
      `[${timestamp}] [Pipeline] sh: docker build -t ${jobName}:latest .`,
      `[${timestamp}] [INFO] Building image...`,
      `[${timestamp}] [INFO] Step 1/5 : FROM node:18-alpine`,
      `[${timestamp}] [INFO] Step 2/5 : WORKDIR /app`,
      `[${timestamp}] [INFO] Step 3/5 : COPY package*.json ./`,
      `[${timestamp}] [INFO] Step 4/5 : RUN npm install`,
      `[${timestamp}] [INFO] Step 5/5 : COPY . .`,
      `[${timestamp}] [Pipeline] stage: Test`,
      `[${timestamp}] [Pipeline] sh: npm test`,
      `[${timestamp}] [SUCCESS] Tests passed`,
      `[${timestamp}] [Pipeline] } // node`,
      `[${timestamp}] [Pipeline] End of Pipeline`,
      `[${timestamp}] Finished: SUCCESS`
    ];
  };

  const openConsole = (jobName: string) => {
    setConsoleJob({
      name: jobName,
      logs: generateMockLogs(jobName)
    });
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            placeholder="Search jobs..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium disabled:bg-slate-50 disabled:text-slate-400 transition-all"
          >
            <RefreshCw size={18} className={isSyncing ? "animate-spin text-indigo-500" : ""} /> 
            {isSyncing ? 'Syncing...' : 'Sync Jenkins'}
          </button>
          <button 
            onClick={() => setShowNewItemModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md active:scale-95 transition-all"
          >
            <Plus size={18} /> New Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow group">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                  {getStatusIcon(job.status)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800">{job.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusClass(job.status)}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><span className="text-slate-400">Build:</span> {job.lastBuild}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="flex items-center gap-1"><span className="text-slate-400">Branch:</span> {job.branch}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="flex items-center gap-1"><span className="text-slate-400">Updated:</span> {job.lastTime}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                  <p className="text-sm font-bold text-slate-700">{job.lastDuration}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleBuild(job.id)}
                    title="Build Now" 
                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                    disabled={job.status === 'IN_PROGRESS'}
                  >
                    <Play size={20} className={job.status === 'IN_PROGRESS' ? 'opacity-50' : ''} />
                  </button>
                  <button 
                    onClick={() => openConsole(job.name)}
                    title="Console Output" 
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <FileText size={20} />
                  </button>
                  <button 
                    onClick={() => onViewChange(ViewMode.Wizard)}
                    title="Configuration" 
                    className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <Settings size={20} />
                  </button>
                </div>
              </div>
            </div>
            
            {job.status === 'IN_PROGRESS' && (
              <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-2/3 animate-pulse"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Item Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Create New Job</h3>
              <button 
                onClick={() => setShowNewItemModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Job Name</label>
                <input 
                  autoFocus
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. my-awesome-service"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
                />
              </div>
              
              <div className="p-4 border border-indigo-100 bg-indigo-50 rounded-xl flex items-start gap-3">
                <FolderGit2 className="text-indigo-600 shrink-0 mt-1" size={20} />
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">Multibranch Pipeline</h4>
                  <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                    Creates a set of Pipeline projects according to detected branches in a SCM repository.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button 
                  onClick={() => setShowNewItemModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateJob}
                  disabled={!newItemName.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                >
                  Create Job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Console Output Modal */}
      {consoleJob && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col border border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <Terminal size={20} className="text-indigo-400" />
                <h3 className="text-slate-200 font-mono font-bold text-sm">
                  Console Output: <span className="text-indigo-400">{consoleJob.name}</span>
                </h3>
              </div>
              <button 
                onClick={() => setConsoleJob(null)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto font-mono text-xs md:text-sm text-slate-300 space-y-1 custom-scrollbar">
              {consoleJob.logs.map((log, index) => (
                <div key={index} className="flex gap-3 hover:bg-slate-900/50 px-2 py-0.5 rounded">
                  <span className="text-slate-600 select-none w-6 text-right">{index + 1}</span>
                  <span className={log.includes('SUCCESS') ? 'text-green-400' : log.includes('FAILURE') ? 'text-red-400' : log.includes('[INFO]') ? 'text-blue-400' : ''}>
                    {log}
                  </span>
                </div>
              ))}
              <div className="h-4 w-2 bg-slate-500 animate-pulse mt-2"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JenkinsJobs;
