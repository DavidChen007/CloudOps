
import React, { useState, useEffect } from 'react';
import { PipelineParams, StackType, Deployment, Pod, Service, Ingress } from '../types';
import { Clipboard, Check, Wand2, PlayCircle, Code2, Coffee, Box, FileCode, X, Eye, ChevronDown, Settings2, ArrowLeft } from 'lucide-react';
import { generateSmartPipelineExplanation } from '../services/geminiService';
import { jenkinsApi, gitCredentialApi } from '../services/api';
import { MOCK_DEPLOYMENTS, MOCK_PODS, MOCK_SERVICES, MOCK_INGRESS } from '../constants';

interface PipelineWizardProps {
  editingJobId?: string | null;
  onBack?: () => void;
  readOnly?: boolean; // 新增：只读模式
}

interface GitCredential {
  id: number;
  credentialId: string;
  credentialName: string;
  gitUsername: string;
}

const PipelineWizard: React.FC<PipelineWizardProps> = ({ editingJobId, onBack, readOnly = false }) => {
  const [activeStack, setActiveStack] = useState<StackType>('node');
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [configXml, setConfigXml] = useState<string>('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [gitCredentials, setGitCredentials] = useState<GitCredential[]>([]);
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
    setShowConfigEditor(false);
    setShowAdvanced(false);
    setActiveStack('node');
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
        // 用户可以手动点击"Advanced Config"查看
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
      setShowConfigEditor(true);
    } catch (error) {
      console.error('Failed to load template:', error);
      alert(`Failed to load template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingTemplate(false);
    }
  };

  // 生成Jenkins Job的config.xml
  const generateJobConfigXml = (jenkinsfile: string) => {
    const escapedJenkinsfile = jenkinsfile
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `<?xml version='1.0' encoding='UTF-8'?>
<flow-definition plugin="workflow-job@1540.v295eccc9778f">
  <description>${params.dockerImageName} Pipeline</description>
  <keepDependencies>false</keepDependencies>
  <properties/>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps@4183.v94b_6fd39da_c1">
    <script>${escapedJenkinsfile}</script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>`;
  };

  const handleCommit = async () => {
    try {
      // 前端验证Job名称
      const jobName = params.dockerImageName.trim();

      if (!jobName) {
        alert('Job名称不能为空！');
        return;
      }

      // 验证Job名称格式（只允许字母、数字、连字符和下划线）
      const invalidCharsPattern = /[/\\:*?"<>|%!@#$^&()+={}[\];',~]/;
      if (invalidCharsPattern.test(jobName)) {
        alert('Job名称包含非法字符！\n只能使用字母、数字、连字符(-)和下划线(_)');
        return;
      }

      // 如果没有加载模板，先生成一个
      let finalConfigXml = configXml;
      if (!finalConfigXml) {
        // 如果没有预览过，先生成Jenkinsfile
        if (!previewJenkinsfile) {
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
          finalConfigXml = generateJobConfigXml(jenkinsfile);
        } else {
          finalConfigXml = generateJobConfigXml(previewJenkinsfile);
        }
      } else {
        // 如果是编辑过的模板，直接使用（已经是有效的XML）
        finalConfigXml = configXml;
      }

      // 映射前端stack到后端格式
      const stackMapping: Record<StackType, string> = {
        'node': 'nodejs',
        'java': 'java',
        'python': 'python'
      };

      // 调用后端API创建Jenkins Job和K8s资源
      await jenkinsApi.createJobWithK8s({
        jobName: jobName,
        configXml: finalConfigXml,
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
      });

      alert(`Pipeline "${jobName}" committed successfully! Jenkins Job and Kubernetes resources have been created.`);

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
                {readOnly ? 'View Job Configuration' : editingJobId ? 'Edit Job Configuration' : 'Create New Job'}
              </h2>
              {loadingConfig && (
                <p className="text-xs text-slate-500">Loading configuration...</p>
              )}
              {readOnly && !loadingConfig && (
                <p className="text-xs text-amber-600 font-medium">Read-only mode - Configuration cannot be modified</p>
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
          <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl self-start shadow-sm">
            {stacks.map(stack => (
              <button
                key={stack.id}
                onClick={() => !readOnly && setActiveStack(stack.id)}
                disabled={readOnly}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeStack === stack.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50'
                } ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {stack.icon}
                {stack.label}
              </button>
            ))}
          </div>

          {/* Configuration Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">
            {readOnly ? 'Pipeline Configuration (Read-Only)' : 'Pipeline Config Wizard'}
          </h3>
          <div className="flex gap-3">
            <button
              onClick={handlePreviewPipeline}
              disabled={loadingPreview}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-sm font-bold hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              <Eye size={16} />
              {loadingPreview ? 'Loading...' : 'Preview Pipeline'}
            </button>
            <button
              onClick={handleLoadTemplate}
              disabled={loadingTemplate}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-sm font-bold hover:bg-indigo-100 disabled:opacity-50 transition-colors"
            >
              <Settings2 size={16} />
              {loadingTemplate ? 'Loading...' : 'Advanced Config'}
            </button>
            {!readOnly && (
              <button
                onClick={handleAnalyze}
                disabled={loadingAI}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-sm font-bold hover:bg-green-100 disabled:opacity-50 transition-colors"
              >
                <Wand2 size={16} />
                {loadingAI ? 'Analyzing...' : 'AI Advisor'}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Image Base Name</label>
              <input
                name="dockerImageName"
                value={params.dockerImageName}
                onChange={handleInputChange}
                readOnly={readOnly}
                disabled={readOnly}
                placeholder="e.g., my-app, api-service"
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
              />
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
        </div>

        {explanation && (
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-2 text-indigo-900 font-bold text-sm">
              <Wand2 size={16} /> AI Summary
            </div>
            <div className="text-xs text-indigo-800 leading-relaxed font-medium whitespace-pre-wrap">{explanation}</div>
          </div>
        )}

        {!readOnly && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center gap-4">
            <div className="text-sm text-slate-500">
              <span className="font-bold">💡 Tip:</span> Click "Preview Pipeline" to see the generated Jenkinsfile before committing.
            </div>
            <button
              onClick={handleCommit}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 group"
            >
              <PlayCircle size={20} className="group-hover:rotate-[360deg] transition-transform duration-700" />
              Commit & Deploy
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

      {/* Config.xml Editor Modal */}
      {showConfigEditor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="flex flex-col h-[85vh] w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <FileCode size={20} className="text-indigo-600" />
                <h3 className="text-slate-800 font-bold">
                  {readOnly ? 'Advanced Config - View Jenkins Job XML' : 'Advanced Config - Edit Jenkins Job XML'}
                </h3>
              </div>
              <button
                onClick={() => setShowConfigEditor(false)}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <textarea
                value={configXml}
                onChange={(e) => setConfigXml(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
                className={`w-full h-full font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none ${readOnly ? 'cursor-not-allowed opacity-80' : ''}`}
                placeholder="Config.xml will appear here..."
                spellCheck={false}
              />
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-4">
              <div className="text-xs text-slate-500">
                <span className="font-bold">Tip:</span> {readOnly ? 'This is a read-only view of the Jenkins Job XML configuration.' : 'You can edit the XML to add custom build commands or modify pipeline stages.'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfigEditor(false)}
                  className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  {readOnly ? 'Close' : 'Cancel'}
                </button>
                {!readOnly && (
                  <button
                    onClick={handleCommit}
                    className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 group"
                  >
                    <PlayCircle size={20} className="group-hover:rotate-[360deg] transition-transform duration-700" />
                    Commit & Deploy
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineWizard;
