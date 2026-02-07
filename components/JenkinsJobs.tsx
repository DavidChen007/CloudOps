
import React, { useState, useEffect } from 'react';
import { MOCK_JENKINS_JOBS } from '../constants';
import { ViewMode } from '../types';
import { Play, FileText, Settings, Search, RefreshCw, CheckCircle2, XCircle, Clock, Ban, X, Terminal, Plus, FolderGit2, Trash2, ArrowLeft } from 'lucide-react';
import { jenkinsApi } from '../services/api';
import PipelineWizard from './PipelineWizard';

interface JenkinsJobsProps {
  onViewChange: (view: ViewMode, jobId?: string) => void;
}

const JenkinsJobs: React.FC<JenkinsJobsProps> = ({ onViewChange }) => {
  const [jobs, setJobs] = useState(MOCK_JENKINS_JOBS);
  const [consoleJob, setConsoleJob] = useState<{name: string, logs: string[]} | null>(null);
  const [buildHistory, setBuildHistory] = useState<{jobId: string, jobName: string, builds: any[]} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Console页面状态
  const [showConsolePage, setShowConsolePage] = useState(false);
  const [consolePageData, setConsolePageData] = useState<{
    jobId: string;
    jobName: string;
    builds: any[];
    selectedBuildNumber: number | null;
    logs: string[];
  } | null>(null);

  // Wizard页面状态
  const [showWizardPage, setShowWizardPage] = useState(false);
  const [wizardEditingJobId, setWizardEditingJobId] = useState<string | null>(null);

  // 加载 Jenkins 任务
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async (jobName?: string) => {
    try {
      setIsLoading(true);
      const data = await jenkinsApi.getAllJobs(jobName);

      // 转换后端数据格式为前端期望的格式
      const transformedJobs = data.map((job: any) => ({
        id: job.id?.toString() || `j-${Date.now()}`,
        name: job.name || 'Unknown',
        status: job.status || 'UNKNOWN',
        lastDuration: job.duration ? formatDuration(job.duration) : 'N/A',
        lastBuild: job.lastBuildNumber ? `#${job.lastBuildNumber}` : '#0',
        lastTime: job.lastBuildTime ? formatTime(job.lastBuildTime) : 'Never',
        branch: 'master', // 后端暂时没有branch字段，使用默认值
        stack: job.stack || 'node', // 保存技术栈类型
        configMode: job.configMode || 'STANDARD' // 保存配置模式
      }));

      setJobs(transformedJobs);
    } catch (error) {
      console.error('Failed to load Jenkins jobs:', error);
      // 失败时使用模拟数据
      setJobs(MOCK_JENKINS_JOBS);
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化持续时间（毫秒转为可读格式）
  const formatDuration = (ms: number): string => {
    if (ms === null || ms === undefined) return 'N/A';
    if (ms === 0) return '< 1s';  // 构建非常快或正在进行中

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // 格式化时间（ISO字符串转为相对时间）
  const formatTime = (dateTime: string): string => {
    try {
      const date = new Date(dateTime);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return 'Unknown';
    }
  };

  // New Item State
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{id: string, name: string} | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 size={18} className="text-green-500" />;
      case 'FAILURE':
        return <XCircle size={18} className="text-red-500" />;
      case 'QUEUED':
        return <Clock size={18} className="text-yellow-500" />;
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
      case 'QUEUED': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const handleBuild = async (id: string) => {
    // 立即更新UI状态为构建中
    setJobs(currentJobs =>
      currentJobs.map(job =>
        job.id === id
          ? { ...job, status: 'IN_PROGRESS', lastDuration: 'Running...', lastTime: 'Just now' }
          : job
      )
    );

    try {
      // 调用后端接口触发构建
      await jenkinsApi.buildJob(id);

      // 构建触发成功后，开始轮询构建状态
      pollBuildStatus(id);
    } catch (error) {
      console.error('Failed to trigger build:', error);
      alert(`Failed to trigger build: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // 恢复原状态
      loadJobs();
    }
  };

  // 轮询构建状态
  const pollBuildStatus = (jobId: string) => {
    let pollCount = 0;
    const maxPolls = 60; // 最多轮询60次（5分钟）
    const pollInterval = 5000; // 每5秒轮询一次

    const poll = setInterval(async () => {
      pollCount++;

      try {
        // 从Jenkins获取Job的实时状态
        const updatedJobData = await jenkinsApi.getJobStatus(jobId);

        if (updatedJobData) {
          // 转换数据格式（与loadJobs保持一致）
          const transformedJob = {
            id: updatedJobData.id?.toString() || jobId,
            name: updatedJobData.name || 'Unknown',
            status: updatedJobData.status || 'UNKNOWN',
            lastDuration: updatedJobData.duration ? formatDuration(updatedJobData.duration) : 'N/A',
            lastBuild: updatedJobData.lastBuildNumber ? `#${updatedJobData.lastBuildNumber}` : '#0',
            lastTime: updatedJobData.lastBuildTime ? formatTime(updatedJobData.lastBuildTime) : 'Never',
            branch: 'master',
            stack: updatedJobData.stack || 'node'
          };

          // 更新单个Job的状态
          setJobs(currentJobs =>
            currentJobs.map(job =>
              job.id === jobId ? transformedJob : job
            )
          );

          // 如果构建完成（成功或失败），停止轮询
          // 非最终状态：QUEUED（队列中）、IN_PROGRESS（构建中）、PENDING（待处理）
          const nonFinalStatuses = ['QUEUED', 'IN_PROGRESS', 'PENDING'];
          if (!nonFinalStatuses.includes(transformedJob.status)) {
            clearInterval(poll);
            console.log(`Build completed with status: ${transformedJob.status}`);
          }
        }

        // 达到最大轮询次数，停止轮询
        if (pollCount >= maxPolls) {
          clearInterval(poll);
          console.log('Max poll count reached, stopping poll');
        }
      } catch (error) {
        console.error('Failed to poll build status:', error);
        // 出错时也停止轮询
        clearInterval(poll);
      }
    }, pollInterval);
  };

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      await jenkinsApi.syncJobs();
      await loadJobs(searchQuery || undefined);
    } catch (error) {
      console.error('Failed to sync Jenkins jobs:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // 实时搜索（可以添加防抖优化）
    loadJobs(query || undefined);
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

  const openDeleteModal = (id: string, name: string) => {
    setJobToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;

    try {
      await jenkinsApi.deleteJob(jobToDelete.id);

      // 从列表中移除已删除的job
      setJobs(currentJobs => currentJobs.filter(job => job.id !== jobToDelete.id));

      setShowDeleteModal(false);
      setJobToDelete(null);
    } catch (error) {
      console.error('Failed to delete job:', error);
      alert(`删除Job失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  // 打开构建历史
  const openBuildHistory = async (jobId: string, jobName: string) => {
    try {
      const data = await jenkinsApi.getBuilds(jobId);
      setBuildHistory({
        jobId,
        jobName,
        builds: data.builds || []
      });
    } catch (error) {
      console.error('Failed to load build history:', error);
      alert(`Failed to load build history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 打开构建日志
  const openConsole = async (jobId: string, jobName: string, buildNumber?: number) => {
    try {
      setIsLoadingLogs(true);

      // 如果没有指定构建号，获取最新的构建
      if (!buildNumber) {
        const data = await jenkinsApi.getBuilds(jobId);
        if (data.builds && data.builds.length > 0) {
          buildNumber = data.builds[0].number;
        } else {
          alert('No builds found for this job');
          return;
        }
      }

      const logText = await jenkinsApi.getBuildLog(jobId, buildNumber);
      const logs = logText.split('\n').filter(line => line.trim());

      setConsoleJob({
        name: `${jobName} #${buildNumber}`,
        logs
      });
    } catch (error) {
      console.error('Failed to load build log:', error);
      alert(`Failed to load build log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // 打开Console全屏页面
  const openConsolePage = async (jobId: string, jobName: string) => {
    try {
      setIsLoadingLogs(true);

      // 获取构建历史
      const data = await jenkinsApi.getBuilds(jobId);
      const builds = data.builds || [];

      // 如果有构建记录，加载最新构建的日志
      let logs: string[] = [];
      let selectedBuildNumber: number | null = null;

      if (builds.length > 0) {
        selectedBuildNumber = builds[0].number;
        const logText = await jenkinsApi.getBuildLog(jobId, selectedBuildNumber);
        logs = logText.split('\n').filter(line => line.trim());
      }

      setConsolePageData({
        jobId,
        jobName,
        builds,
        selectedBuildNumber,
        logs
      });
      setShowConsolePage(true);
    } catch (error) {
      console.error('Failed to load console page:', error);
      alert(`Failed to load console page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // 在Console页面中选择构建
  const selectBuildInConsolePage = async (buildNumber: number) => {
    if (!consolePageData) return;

    try {
      setIsLoadingLogs(true);
      const logText = await jenkinsApi.getBuildLog(consolePageData.jobId, buildNumber);
      const logs = logText.split('\n').filter(line => line.trim());

      setConsolePageData({
        ...consolePageData,
        selectedBuildNumber: buildNumber,
        logs
      });
    } catch (error) {
      console.error('Failed to load build log:', error);
      alert(`Failed to load build log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // 格式化构建结果
  const formatBuildResult = (result: string) => {
    if (!result) return 'IN_PROGRESS';
    return result;
  };

  // 格式化构建时间戳
  const formatBuildTime = (timestamp: number): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return 'Unknown';
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideProgress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(200%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
      <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={searchQuery}
            onChange={handleSearch}
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
            onClick={() => {
              setWizardEditingJobId(null);
              setShowWizardPage(true);
            }}
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
                      {job.status === 'IN_PROGRESS' ? 'building' : job.status.replace('_', ' ')}
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
                    onClick={() => openConsolePage(job.id, job.name)}
                    title="Console Output"
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Terminal size={20} />
                  </button>
                  {/* 标准模式：显示表单编辑按钮 */}
                  {job.configMode === 'STANDARD' && (
                    <button
                      onClick={() => {
                        setWizardEditingJobId(job.id);
                        setShowWizardPage(true);
                      }}
                      title="Edit Configuration (Form)"
                      className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      <Settings size={20} />
                    </button>
                  )}
                  {/* 自定义模式：显示XML编辑按钮 */}
                  {job.configMode === 'CUSTOM' && (
                    <button
                      onClick={() => {
                        alert('XML编辑功能开发中...\n请使用 Jenkins Web UI 编辑自定义配置');
                        // TODO: 实现XML编辑器
                      }}
                      title="Edit XML Configuration"
                      className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                    >
                      <FileText size={20} />
                    </button>
                  )}
                  <button
                    onClick={() => openDeleteModal(job.id, job.name)}
                    title="Delete Job"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
            
            {job.status === 'IN_PROGRESS' && (
              <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
                <div
                  className="absolute h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                  style={{
                    width: '50%',
                    animation: 'slideProgress 2s ease-in-out infinite',
                    animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
                  }}
                />
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && jobToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">确认删除</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 border border-red-100 bg-red-50 rounded-xl">
                <p className="text-sm text-red-900">
                  确定要删除Job <span className="font-bold">{jobToDelete.name}</span> 吗？
                </p>
                <p className="text-xs text-red-700 mt-2">
                  此操作将同时删除Jenkins中的Job和数据库记录，且无法恢复。
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md shadow-red-200 transition-all active:scale-95"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Build History Modal */}
      {buildHistory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-indigo-600" />
                <h3 className="text-slate-800 font-bold">
                  Build History: <span className="text-indigo-600">{buildHistory.jobName}</span>
                </h3>
              </div>
              <button
                onClick={() => setBuildHistory(null)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {buildHistory.builds.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No builds found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {buildHistory.builds.map((build: any) => (
                    <div
                      key={build.number}
                      className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openConsole(buildHistory.jobId, buildHistory.jobName, build.number)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(formatBuildResult(build.result))}
                          <div>
                            <h4 className="font-bold text-slate-800">Build #{build.number}</h4>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatBuildTime(build.timestamp)}
                              {build.duration && ` • ${formatDuration(build.duration)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusClass(formatBuildResult(build.result))}`}>
                            {build.building ? 'BUILDING' : (build.result || 'UNKNOWN')}
                          </span>
                          <Terminal size={16} className="text-slate-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      {/* Console Modal */}
      {showConsolePage && consolePageData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConsolePage(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                  title="返回"
                >
                  <X size={20} />
                </button>
                <Terminal size={20} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Console Output: <span className="text-indigo-600">{consolePageData.jobName}</span>
                </h2>
              </div>
            </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Build History */}
            <div className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col">
              <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <h3 className="font-bold text-slate-700 text-sm">构建历史</h3>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-2">
                {consolePageData.builds.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm">暂无构建记录</p>
                  </div>
                ) : (
                  consolePageData.builds.map((build: any) => (
                    <div
                      key={build.number}
                      onClick={() => selectBuildInConsolePage(build.number)}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        consolePageData.selectedBuildNumber === build.number
                          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(formatBuildResult(build.result))}
                          <span className="font-bold text-slate-800 text-sm">#{build.number}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getStatusClass(formatBuildResult(build.result))}`}>
                          {build.building ? 'BUILDING' : (build.result || 'UNKNOWN')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatBuildTime(build.timestamp)}
                      </p>
                      {build.duration && (
                        <p className="text-xs text-slate-500 mt-1">
                          耗时: {formatDuration(build.duration)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel - Console Output */}
            <div className="flex-1 flex flex-col bg-slate-950">
              <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-200 font-mono font-bold text-sm">
                    Build #{consolePageData.selectedBuildNumber || 'N/A'}
                  </h3>
                  {isLoadingLogs && (
                    <span className="text-xs text-slate-400">加载中...</span>
                  )}
                </div>
              </div>
              <div className="flex-1 p-6 overflow-auto font-mono text-xs md:text-sm text-slate-300 space-y-1">
                {consolePageData.logs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Terminal size={48} className="mx-auto mb-4 opacity-20" />
                    <p>暂无日志</p>
                  </div>
                ) : (
                  consolePageData.logs.map((log, index) => (
                    <div key={index} className="flex gap-3 hover:bg-slate-900/50 px-2 py-0.5 rounded">
                      <span className="text-slate-600 select-none w-6 text-right">{index + 1}</span>
                      <span className={log.includes('SUCCESS') ? 'text-green-400' : log.includes('FAILURE') ? 'text-red-400' : log.includes('[INFO]') ? 'text-blue-400' : ''}>
                        {log}
                      </span>
                    </div>
                  ))
                )}
                {!isLoadingLogs && consolePageData.logs.length > 0 && (
                  <div className="h-4 w-2 bg-slate-500 animate-pulse mt-2"></div>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizardPage && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            <PipelineWizard
              editingJobId={wizardEditingJobId}
              readOnly={false} // 允许编辑
              isEditMode={wizardEditingJobId !== null} // 标记是否为编辑模式
              onBack={() => {
                setShowWizardPage(false);
                setWizardEditingJobId(null);
                loadJobs(); // 刷新job列表
              }}
            />
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default JenkinsJobs;
