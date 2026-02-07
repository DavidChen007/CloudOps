
import React, { useState, useEffect } from 'react';
import { PipelineParams, StackType, Deployment, Pod, Service, Ingress } from '../types';
import { Clipboard, Check, Wand2, PlayCircle, Code2, Coffee, Box, FileCode, X, Eye, ChevronDown, Settings2, ArrowLeft } from 'lucide-react';
import { generateSmartPipelineExplanation } from '../services/geminiService';
import { jenkinsApi, gitCredentialApi } from '../services/api';
import { MOCK_DEPLOYMENTS, MOCK_PODS, MOCK_SERVICES, MOCK_INGRESS } from '../constants';

interface PipelineWizardProps {
  editingJobId?: string | null;
  onBack?: () => void;
  readOnly?: boolean; // 只读模式（查看）
  isEditMode?: boolean; // 编辑模式（某些字段不可修改）
}

interface GitCredential {
  id: number;
  credentialId: string;
  credentialName: string;
  gitUsername: string;
}

const PipelineWizard: React.FC<PipelineWizardProps> = ({ editingJobId, onBack, readOnly = false, isEditMode = false }) => {
  const [activeStack, setActiveStack] = useState<StackType>('node');
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [configMode, setConfigMode] = useState<'STANDARD' | 'CUSTOM'>('STANDARD'); // 明确的配置模式
  const [configXml, setConfigXml] = useState<string>('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [gitCredentials, setGitCredentials] = useState<GitCredential[]>([]);
  const [jobNameError, setJobNameError] = useState<string>(''); // Job名称校验错误信息
  const [params, setParams] = useState<PipelineParams & { registry: string, sshTarget: string, pathPrefix: string, buildDirectory: string, containerPort: number }>({
    gitRepoUrl: '',
    gitBuildRef: 'master',
    credentialsId: '',
    credentialsPassword: '',
    dockerUsername: '',
    dockerPassword: '',
    nodeOptions: '--max_old_space_size=8192',
    dockerImageName: '',
    dockerImageDirectory: '',
    dockerfilePath: './Dockerfile',
    registry: 'registry.cn-shenzhen.aliyuncs.com',
    sshTarget: '',
    pathPrefix: '',  // Ingress路径前缀，默认为空（使用dockerImageName）
    buildDirectory: '',  // 构建工作目录，默认为空（在Git根目录构建）
    containerPort: 80  // 容器端口，默认80（Node.js）
  });

  const [copied, setCopied] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [previewJenkinsfile, setPreviewJenkinsfile] = useState<string>('');

  // 加载Git凭证列表
  useEffect(() => {
    loadGitCredentials();
  }, []);

  const loadGitCredentials = async () => {
    try {
      const data = await gitCredentialApi.list();
      setGitCredentials(data);
    } catch (error) {
      console.error('Failed to load git credentials:', error);
    }
  };

  // 重置表单状态
  const resetForm = () => {
    setParams({
      gitRepoUrl: '',
      gitBuildRef: 'master',
      credentialsId: '',
      credentialsPassword: '',
      dockerUsername: '',
      dockerPassword: '',
      nodeOptions: '--max_old_space_size=8192',
      dockerImageName: '',
      dockerImageDirectory: '',
      dockerfilePath: './Dockerfile',
      registry: 'registry.cn-shenzhen.aliyuncs.com',
      sshTarget: '',
      pathPrefix: '',
      buildDirectory: '',
      containerPort: 80
    });
    setPreviewJenkinsfile('');
    setConfigXml('');
    setExplanation('');
    setShowScriptModal(false);
    setShowAdvanced(false);
    setActiveStack('node');
    setConfigMode('STANDARD'); // 重置为标准模式
  };

  // 加载Job配置（编辑模式）
  useEffect(() => {
    if (editingJobId) {
      loadJobConfig(editingJobId);
    }
  }, [editingJobId]);

  const loadJobConfig = async (jobId: string) => {
    try {
      setLoadingConfig(true);
      const config: any = await jenkinsApi.getJobConfig(jobId);

      // 设置技术栈（后端是nodejs，前端是node，需要映射）
      if (config.stack) {
        const stackMapping: Record<string, StackType> = {
          'nodejs': 'node',
          'node': 'node',
          'java': 'java',
          'python': 'python'
        };
        const mappedStack = stackMapping[config.stack] || 'node';
        setActiveStack(mappedStack);
      }

      // 设置config.xml到编辑器（不自动打开）
      if (config.configXml) {
        setConfigXml(config.configXml);
      }

      // 设置配置模式
      if (config.configMode) {
        setConfigMode(config.configMode);
      }

      // 设置所有参数（用于回显）
      setParams(prev => ({
        ...prev,
        gitRepoUrl: config.gitRepoUrl || prev.gitRepoUrl,
        gitBuildRef: config.gitBranch || prev.gitBuildRef,
        credentialsId: config.gitCredentialsId || prev.credentialsId,
        dockerImageName: config.dockerImageName || config.name || prev.dockerImageName,
        dockerfilePath: config.dockerfilePath || prev.dockerfilePath,
        registry: config.dockerRegistry || prev.registry,
        dockerUsername: config.dockerUsername || prev.dockerUsername,
        dockerBuildContext: config.dockerBuildContext || prev.dockerBuildContext,
        pathPrefix: config.pathPrefix || '',
        buildDirectory: config.buildDirectory || '',
        containerPort: config.containerPort || prev.containerPort,
        sshTarget: config.k8sServer || prev.sshTarget,
      }));
    } catch (error) {
      console.error('Failed to load job config:', error);
      alert(`Failed to load job configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingConfig(false);
    }
  };

  // 根据技术栈自动设置默认端口
  React.useEffect(() => {
    if (activeStack === 'node') {
      setParams(prev => ({ ...prev, containerPort: 80 }));
    } else if (activeStack === 'java' || activeStack === 'python') {
      setParams(prev => ({ ...prev, containerPort: 8080 }));
    }
  }, [activeStack]);

  // 从后端生成Jenkinsfile预览
  const handlePreviewPipeline = async () => {
    try {
      setLoadingPreview(true);
      const stackMapping: Record<StackType, string> = {
        'node': 'nodejs',
        'java': 'java',
        'python': 'python'
      };

      const jenkinsfile = await jenkinsApi.generateJenkinsfilePreview({
        name: params.dockerImageName,
        stack: stackMapping[activeStack],
        gitRepoUrl: params.gitRepoUrl,
        gitBranch: params.gitBuildRef,
        gitCredentialsId: params.credentialsId,
        dockerImageName: params.dockerImageName,
        dockerfilePath: params.dockerfilePath,
        dockerBuildContext: params.dockerBuildContext || '.',
        buildDirectory: params.buildDirectory || undefined,
        replicas: 1,
        containerPort: params.containerPort || 80,  // 使用用户配置的端口
        servicePort: params.containerPort || 80,    // 使用用户配置的端口
      });

      setPreviewJenkinsfile(jenkinsfile);
      setShowScriptModal(true);
    } catch (error) {
      console.error('Failed to generate Jenkinsfile preview:', error);
      alert(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const stacks: { id: StackType; label: string; icon: React.ReactNode }[] = [
    { id: 'node', label: 'Node.js', icon: <Code2 size={18} /> },
    { id: 'java', label: 'Java', icon: <Coffee size={18} /> },
    { id: 'python', label: 'Python', icon: <Box size={18} /> },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));

    // 实时校验Job名称
    if (name === 'dockerImageName') {
      validateJobName(value);
    }
  };

  // Job名称实时校验
  const validateJobName = (jobName: string) => {
    const trimmedName = jobName.trim();

    // 空值不显示错误(允许用户清空输入)
    if (!trimmedName) {
      setJobNameError('');
      return false;
    }

    // 长度检查
    if (trimmedName.length > 63) {
      setJobNameError('❌ 名称过长(最多63个字符)');
      return false;
    }

    // Kubernetes命名规范检查
    const k8sNamePattern = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!k8sNamePattern.test(trimmedName)) {
      // 具体的错误提示
      if (/[A-Z]/.test(trimmedName)) {
        setJobNameError('❌ 不能包含大写字母');
      } else if (trimmedName.startsWith('-')) {
        setJobNameError('❌ 不能以短划线(-)开头');
      } else if (trimmedName.endsWith('-')) {
        setJobNameError('❌ 不能以短划线(-)结尾');
      } else if (/[_]/.test(trimmedName)) {
        setJobNameError('❌ 不能包含下划线(_)，请使用短划线(-)');
      } else if (/[^a-z0-9-]/.test(trimmedName)) {
        setJobNameError('❌ 只能包含小写字母、数字、短划线(-)');
      } else {
        setJobNameError('❌ 名称格式不符合规范');
      }
      return false;
    }

    // 校验通过
    setJobNameError('✅ 名称格式正确');
    return true;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(previewJenkinsfile);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnalyze = async () => {
    setLoadingAI(true);
    const result = await generateSmartPipelineExplanation(params);
    setExplanation(result || '');
    setLoadingAI(false);
  };

  // 加载配置模板
  const handleLoadTemplate = async () => {
    try {
      setLoadingTemplate(true);
      const stackMapping: Record<StackType, string> = {
        'node': 'nodejs',
        'java': 'java',
        'python': 'python'
      };

      const template = await jenkinsApi.getConfigXmlTemplate(
        stackMapping[activeStack],
        params.dockerImageName,
        params.gitRepoUrl,
        params.gitBuildRef
      );

      // 解码XML实体，提高可读性
      const decodedTemplate = template
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

      setConfigXml(decodedTemplate);
    } catch (error) {
      console.error('Failed to load template:', error);
      alert(`Failed to load template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleCommit = async () => {
    try {
      // 前端验证Job名称
      const jobName = params.dockerImageName.trim();

      if (!jobName) {
        alert('Job名称不能为空！');
        return;
      }

      // 使用实时校验函数进行最终校验
      if (!validateJobName(jobName)) {
        alert('Job名称格式不正确！\n\n请根据输入框下方的提示修正名称格式。');
        return;
      }

      // 自定义模式下，验证config.xml不能为空
      if (configMode === 'CUSTOM' && !configXml.trim()) {
        alert('自定义模式下，配置XML不能为空！');
        return;
      }

      // 映射前端stack到后端格式
      const stackMapping: Record<StackType, string> = {
        'node': 'nodejs',
        'java': 'java',
        'python': 'python'
      };

      // 根据模式调用不同的API
      if (isEditMode && editingJobId) {
        // 编辑模式：调用更新API
        await jenkinsApi.updateJobWithDeployment(editingJobId, {
          name: jobName,
          stack: stackMapping[activeStack],
          gitRepoUrl: params.gitRepoUrl,
          gitBranch: params.gitBuildRef,
          gitCredentialsId: params.credentialsId,
          dockerImageName: jobName,
          dockerfilePath: params.dockerfilePath,
          dockerBuildContext: params.dockerBuildContext || '.',
          buildDirectory: params.buildDirectory || undefined,
          replicas: 1,
          containerPort: params.containerPort || 80,
          servicePort: params.containerPort || 80,
          pathPrefix: params.pathPrefix || undefined,
        });

        alert(`Pipeline "${jobName}" updated successfully! Jenkins Job and Kubernetes resources have been updated.`);
      } else {
        // 创建模式：根据configMode决定传递的参数
        await jenkinsApi.createJob({
          jobName: jobName,
          configXml: configMode === 'CUSTOM' ? configXml : '',  // 自定义模式传XML，标准模式传空
          stack: stackMapping[activeStack],
          gitRepoUrl: params.gitRepoUrl || undefined,
          gitBranch: params.gitBuildRef || undefined,
          gitCredentialsId: params.credentialsId || undefined,
          dockerImageName: jobName,
          dockerfilePath: params.dockerfilePath || undefined,
          dockerBuildContext: params.dockerBuildContext || '.',
          pathPrefix: params.pathPrefix || undefined,
          buildDirectory: params.buildDirectory || undefined,
          port: params.containerPort,
          replicas: 1,
          configMode: configMode,  // 使用configMode状态
        });

        alert(`Pipeline "${jobName}" committed successfully! Jenkins Job and Kubernetes resources have been created.`);
      }

      // 重置表单，准备创建下一个job
      resetForm();

      // 如果有返回回调，返回到job列表
      if (onBack) {
        onBack();
      }
    } catch (error) {
      console.error('Failed to commit pipeline:', error);
      alert(`Failed to commit pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Close Button */}
      {onBack && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <Settings2 size={20} className="text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {readOnly ? 'View Job Configuration' : isEditMode ? 'Edit Job Configuration' : 'Create New Job'}
              </h2>
              {loadingConfig && (
                <p className="text-xs text-slate-500">Loading configuration...</p>
              )}
              {readOnly && !loadingConfig && (
                <p className="text-xs text-amber-600 font-medium">Read-only mode - Configuration cannot be modified</p>
              )}
              {isEditMode && !readOnly && !loadingConfig && (
                <p className="text-xs text-blue-600 font-medium">Edit mode - Some fields cannot be modified</p>
              )}
            </div>
          </div>
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600 transition-all"
            title="关闭"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          {/* Stack Selector */}
          <div>
            {isEditMode && (
              <p className="text-xs text-red-500 font-medium mb-2">
                ⚠️ Technology stack cannot be modified in edit mode
              </p>
            )}
            <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl self-start shadow-sm">
              {stacks.map(stack => (
                <button
                  key={stack.id}
                  onClick={() => !readOnly && !isEditMode && setActiveStack(stack.id)}
                  disabled={readOnly || isEditMode}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                    activeStack === stack.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50'
                  } ${(readOnly || isEditMode) ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  {stack.icon}
                  {stack.label}
                </button>
              ))}
            </div>
          </div>

          {/* 配置模式选择器 */}
          {!isEditMode && !readOnly && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <h4 className="text-sm font-bold text-slate-700 mb-3">选择配置模式</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setConfigMode('STANDARD')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    configMode === 'STANDARD'
                      ? 'border-indigo-500 bg-white shadow-lg'
                      : 'border-slate-200 bg-white/50 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      configMode === 'STANDARD' ? 'border-indigo-500' : 'border-slate-300'
                    }`}>
                      {configMode === 'STANDARD' && (
                        <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      )}
                    </div>
                    <span className="font-bold text-slate-800">标准模式</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">推荐</span>
                  </div>
                  <p className="text-xs text-slate-600 ml-8">
                    使用表单填写配置参数，系统自动生成Jenkins Job配置
                  </p>
                </button>

                <button
                  onClick={() => setConfigMode('CUSTOM')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    configMode === 'CUSTOM'
                      ? 'border-purple-500 bg-white shadow-lg'
                      : 'border-slate-200 bg-white/50 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      configMode === 'CUSTOM' ? 'border-purple-500' : 'border-slate-300'
                    }`}>
                      {configMode === 'CUSTOM' && (
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      )}
                    </div>
                    <span className="font-bold text-slate-800">自定义模式</span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">高级</span>
                  </div>
                  <p className="text-xs text-slate-600 ml-8">
                    直接编辑Jenkins Job XML配置，适合有特殊需求的场景
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Configuration Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">
            {readOnly ? '流水线配置 (只读)' : configMode === 'STANDARD' ? '标准模式配置' : '自定义模式配置'}
          </h3>
          <div className="flex gap-3">
            {configMode === 'STANDARD' && (
              <>
                <button
                  onClick={handlePreviewPipeline}
                  disabled={loadingPreview || readOnly}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-sm font-bold hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  <Eye size={16} />
                  {loadingPreview ? '加载中...' : '预览流水线'}
                </button>
                {!readOnly && (
                  <button
                    onClick={handleAnalyze}
                    disabled={loadingAI}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-sm font-bold hover:bg-green-100 disabled:opacity-50 transition-colors"
                  >
                    <Wand2 size={16} />
                    {loadingAI ? '分析中...' : 'AI 建议'}
                  </button>
                )}
              </>
            )}
            {configMode === 'CUSTOM' && !readOnly && (
              <button
                onClick={handleLoadTemplate}
                disabled={loadingTemplate}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 text-sm font-bold hover:bg-purple-100 disabled:opacity-50 transition-colors"
              >
                <FileCode size={16} />
                {loadingTemplate ? '加载中...' : '加载模板'}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* 自定义模式：显示XML编辑器 */}
          {configMode === 'CUSTOM' && (
            <div className="space-y-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Job名称 <span className="text-red-500">*</span>
                </label>
                <input
                  name="dockerImageName"
                  value={params.dockerImageName}
                  onChange={handleInputChange}
                  readOnly={readOnly || isEditMode}
                  disabled={readOnly || isEditMode}
                  placeholder="例如: my-app, api-service, web-01"
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 outline-none font-medium transition-all ${
                    (readOnly || isEditMode)
                      ? 'cursor-not-allowed opacity-60 border-slate-200'
                      : jobNameError.startsWith('❌')
                      ? 'border-red-300 focus:ring-red-500'
                      : jobNameError.startsWith('✅')
                      ? 'border-green-300 focus:ring-green-500'
                      : 'border-slate-200 focus:ring-indigo-500'
                  }`}
                />
                {!isEditMode && (
                  <div className="mt-2 space-y-1">
                    {jobNameError && (
                      <p className={`text-xs font-medium ${
                        jobNameError.startsWith('❌')
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {jobNameError}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      <span className="font-medium">规则:</span> 1-63个字符，小写字母、数字、短划线(-)，不能以短划线开头或结尾
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Jenkins Job XML配置 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={configXml}
                  onChange={(e) => setConfigXml(e.target.value)}
                  readOnly={readOnly}
                  disabled={readOnly}
                  className={`w-full h-96 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-purple-500 outline-none resize-none ${readOnly ? 'cursor-not-allowed opacity-80' : ''}`}
                  placeholder="点击上方'加载模板'按钮加载XML模板，或直接粘贴您的config.xml内容..."
                  spellCheck={false}
                />
                <p className="mt-2 text-xs text-slate-500">
                  💡 提示: 您可以点击'加载模板'按钮生成基础模板，然后根据需要修改
                </p>
              </div>
            </div>
          )}

          {/* 标准模式：显示表单字段 */}
          {configMode === 'STANDARD' && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Git Repository URL</label>
              <input
                name="gitRepoUrl"
                value={params.gitRepoUrl}
                onChange={handleInputChange}
                readOnly={readOnly}
                disabled={readOnly}
                placeholder="e.g., https://github.com/username/repo.git"
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Build Ref (Branch)</label>
              <input
                name="gitBuildRef"
                value={params.gitBuildRef}
                onChange={handleInputChange}
                readOnly={readOnly}
                disabled={readOnly}
                placeholder="e.g., master, develop"
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <FileCode size={12} className="text-indigo-500" /> Dockerfile Path
              </label>
              <input
                name="dockerfilePath"
                value={params.dockerfilePath}
                onChange={handleInputChange}
                readOnly={readOnly}
                disabled={readOnly}
                placeholder="./Dockerfile"
                className={`w-full px-4 py-3 bg-slate-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm font-bold text-indigo-700 transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Git Credentials</label>
              <select
                name="credentialsId"
                value={params.credentialsId}
                onChange={handleInputChange}
                disabled={readOnly}
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                required
              >
                <option value="">Select a credential</option>
                {gitCredentials.map((cred) => (
                  <option key={cred.id} value={cred.credentialId}>
                    {cred.credentialName} ({cred.gitUsername})
                  </option>
                ))}
              </select>
              {gitCredentials.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No credentials found. Please create one in Git Credentials page.
                </p>
              )}
            </div>

            {/* Credentials Password 暂时隐藏
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Credentials Password</label>
              <input
                type="password"
                name="credentialsPassword"
                value={params.credentialsPassword}
                onChange={handleInputChange}
                placeholder="Enter password or token"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all"
              />
            </div>
            */}

            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                Image Base Name
                {isEditMode && <span className="ml-2 text-red-500">(Cannot be modified)</span>}
              </label>
              <input
                name="dockerImageName"
                value={params.dockerImageName}
                onChange={handleInputChange}
                readOnly={readOnly || isEditMode}
                disabled={readOnly || isEditMode}
                placeholder="e.g., my-app, api-service, web-01"
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 outline-none font-medium transition-all ${
                  (readOnly || isEditMode)
                    ? 'cursor-not-allowed opacity-60 border-slate-200'
                    : jobNameError.startsWith('❌')
                    ? 'border-red-300 focus:ring-red-500'
                    : jobNameError.startsWith('✅')
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-slate-200 focus:ring-indigo-500'
                }`}
              />
              {!isEditMode && (
                <div className="mt-2 space-y-1">
                  {/* 实时校验结果 */}
                  {jobNameError && (
                    <p className={`text-xs font-medium ${
                      jobNameError.startsWith('❌')
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}>
                      {jobNameError}
                    </p>
                  )}
                  {/* 命名规则提示 */}
                  <p className="text-xs text-slate-500">
                    <span className="font-medium">规则:</span> 1-63个字符，小写字母、数字、短划线(-)，不能以短划线开头或结尾
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-indigo-600 transition-colors group"
            >
              <div className={`p-1 rounded bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600 transition-all duration-200 ${showAdvanced ? 'rotate-180' : ''}`}>
                <ChevronDown size={16} />
              </div>
              <Settings2 size={16} />
              Advanced Configuration
            </button>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-300 border-t border-slate-100 pt-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Container Port
                </label>
                <input
                  type="number"
                  name="containerPort"
                  value={params.containerPort}
                  onChange={handleInputChange}
                  readOnly={readOnly}
                  disabled={readOnly}
                  placeholder="80"
                  className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                />
                <p className="mt-1 text-xs text-slate-500">
                  默认: Node.js=80, Java/Python=8080
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Build Directory (Optional)
                </label>
                <input
                  name="buildDirectory"
                  value={params.buildDirectory}
                  onChange={handleInputChange}
                  readOnly={readOnly}
                  disabled={readOnly}
                  placeholder="e.g., backend, frontend, services/api"
                  className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                />
                <p className="mt-1 text-xs text-slate-500">
                  子目录构建（如monorepo），留空则在根目录构建
                </p>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                  Ingress Path Prefix (Optional)
                </label>
                <input
                  name="pathPrefix"
                  value={params.pathPrefix}
                  onChange={handleInputChange}
                  readOnly={readOnly}
                  disabled={readOnly}
                  placeholder="e.g., api, admin, web (leave empty to use image name)"
                  className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                />
                <p className="mt-1 text-xs text-slate-500">
                  访问路径将是: https://saas.btitib.com/<span className="font-bold text-indigo-600">{params.pathPrefix || params.dockerImageName || 'your-prefix'}</span>/...
                </p>
              </div>

              {activeStack === 'node' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Node Options</label>
                  <input
                    name="nodeOptions"
                    value={params.nodeOptions}
                    onChange={handleInputChange}
                    readOnly={readOnly}
                    disabled={readOnly}
                    placeholder="e.g., --max_old_space_size=8192"
                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                  />
                </div>
              )}
            </div>
          )}
          </>
        )}

        {/* AI建议和提交按钮 */}
        {explanation && (
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-2 text-indigo-900 font-bold text-sm">
              <Wand2 size={16} /> AI 建议
            </div>
            <div className="text-xs text-indigo-800 leading-relaxed font-medium whitespace-pre-wrap">{explanation}</div>
          </div>
        )}

        {!readOnly && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center gap-4">
            <div className="text-sm text-slate-500">
              <span className="font-bold">💡 提示:</span> {configMode === 'STANDARD' ? '点击预览流水线按钮查看生成的Jenkinsfile' : '确保XML配置正确后再提交'}
            </div>
            <button
              onClick={handleCommit}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 group"
            >
              <PlayCircle size={20} className="group-hover:rotate-[360deg] transition-transform duration-700" />
              提交并部署
            </button>
          </div>
        )}
        </div>
      </div>
    </div>

      {/* Script Preview Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="flex flex-col h-[85vh] w-full max-w-5xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-[10px] font-mono font-bold tracking-[0.3em] text-slate-500 uppercase">
                  Pipeline Preview - {activeStack} Jenkinsfile
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={copyToClipboard}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 active:scale-95"
                >
                  {copied ? <><Check size={14} className="text-green-400" /> Copied</> : <><Clipboard size={14} /> Copy Code</>}
                </button>
                <button 
                  onClick={() => setShowScriptModal(false)}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 font-mono text-[12px] overflow-auto bg-slate-950 text-indigo-300 custom-scrollbar leading-relaxed">
              <pre className="whitespace-pre-wrap"><code>{previewJenkinsfile}</code></pre>
            </div>
            <div className="p-5 bg-slate-900/90 border-t border-slate-800 flex justify-end items-center gap-4">
              {!readOnly && (
                <>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ready to deploy?</span>
                  <button
                    onClick={handleCommit}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 group"
                  >
                    <PlayCircle size={20} className="group-hover:rotate-[360deg] transition-transform duration-700" />
                    Commit & Deploy
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PipelineWizard;
