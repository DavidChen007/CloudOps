
import React, { useState } from 'react';
import { PipelineParams, StackType, Deployment, Pod, Service, Ingress } from '../types';
import { Clipboard, Check, Wand2, PlayCircle, Code2, Coffee, Box, FileCode, X, Eye, ChevronDown, Settings2 } from 'lucide-react';
import { generateSmartPipelineExplanation } from '../services/geminiService';
import { MOCK_DEPLOYMENTS, MOCK_PODS, MOCK_SERVICES, MOCK_INGRESS } from '../constants';

const PipelineWizard: React.FC = () => {
  const [activeStack, setActiveStack] = useState<StackType>('node');
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [params, setParams] = useState<PipelineParams & { registry: string, sshTarget: string }>({
    gitRepoUrl: 'https://codeup.aliyun.com/689be5de5ca26351a77c26a9/AICode/mfx_admin.git',
    gitBuildRef: 'master',
    credentialsId: 'chenwei83425',
    credentialsPassword: 'mfx@123',
    dockerUsername: 'heita_0911',
    dockerPassword: 'ckRV43hST6DMRg9p',
    nodeOptions: '--max_old_space_size=8192',
    dockerImageName: 'mfx-admin',
    dockerImageDirectory: 'heitasoft',
    dockerfilePath: './Dockerfile',
    registry: 'registry.cn-shenzhen.aliyuncs.com',
    sshTarget: '119.23.244.152'
  });

  const [copied, setCopied] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [explanation, setExplanation] = useState<string>('');

  const getStackSpecificConfig = () => {
    switch(activeStack) {
      case 'java':
        return {
          tool: "maven '3.9.5'",
          installCmd: "sh 'mvn clean package -DskipTests'"
        };
      case 'python':
        return {
          tool: "python '3.11'",
          installCmd: "sh 'pip install -r requirements.txt'"
        };
      case 'node':
      default:
        return {
          tool: "nodejs '22.18.0'",
          installCmd: `sh '''
        npm config set registry https://registry.npmmirror.com/
        npm install
        npm run build
        '''`
        };
    }
  };

  const generateScript = () => {
    const config = getStackSpecificConfig();
    
    return `pipeline {
  agent any
  tools {
      ${config.tool}
  }
  environment {
     GIT_REPO_URL = '${params.gitRepoUrl}'
     GIT_BUILD_REF = '${params.gitBuildRef}'
     CREDENTIALS_ID = '${params.credentialsId}'
     CREDENTIALS_PASSWORD = '${params.credentialsPassword}'
     DOCKER_USERNAME = '${params.dockerUsername}'
     DOCKER_PASSWORD = '${params.dockerPassword}'
     NODE_OPTIONS = '${params.nodeOptions}'
     DOCKER_IMAGE_NAME = "${params.dockerImageName}"
     DOCKER_IMAGE_VERSION = sh(returnStdout: true, script: 'date +"%Y-%m-%d-%H-%M-%S"').trim()
     DOCKER_IMAHE_DIRECTORY = "${params.dockerImageDirectory}"
     DOCKERFILE_PATH = "${params.dockerfilePath}"
  }
  stages {
    stage('检出') {
      steps {
         deleteDir()
         checkout([$class: 'GitSCM',
         branches: [[name: GIT_BUILD_REF]],
         userRemoteConfigs: [[
           url: GIT_REPO_URL,
           credentialsId: CREDENTIALS_ID
         ]]])
         sh 'ls -l' 
      }
    }
    stage('安装依赖') {
      steps {
        ${config.installCmd}
      }
    }
    stage('构建镜像并推送到本地 Harbor 制品库') {
      steps {
        sh "docker build -t ${params.registry}/\${DOCKER_IMAHE_DIRECTORY}/\${DOCKER_IMAGE_NAME}-\${GIT_BUILD_REF}:\${DOCKER_IMAGE_VERSION} -f \${DOCKERFILE_PATH} ."
        sh "echo \${DOCKER_PASSWORD} | docker login --username \${DOCKER_USERNAME} --password-stdin ${params.registry}"
        sh "docker push ${params.registry}/\${DOCKER_IMAHE_DIRECTORY}/\${DOCKER_IMAGE_NAME}-\${GIT_BUILD_REF}:\${DOCKER_IMAGE_VERSION}"
      }
    }
    stage('删除构建节点缓存的Docker镜像') {
      steps {
        sh "docker rmi -f ${params.registry}/\${DOCKER_IMAHE_DIRECTORY}/\${DOCKER_IMAGE_NAME}-\${GIT_BUILD_REF}:\${DOCKER_IMAGE_VERSION}"
      }
    }
    stage('k8s镜像版本更新') {
      steps {
          sh """
           ssh ${params.sshTarget} "kubectl set image deployment/\${DOCKER_IMAGE_NAME} \${DOCKER_IMAGE_NAME}=registry-vpc.cn-shenzhen.aliyuncs.com/\${DOCKER_IMAHE_DIRECTORY}/\${DOCKER_IMAGE_NAME}-\${GIT_BUILD_REF}:\${DOCKER_IMAGE_VERSION} -n ai-code"
            """
      }
    }
  }
}`;
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
    navigator.clipboard.writeText(generateScript());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnalyze = async () => {
    setLoadingAI(true);
    const result = await generateSmartPipelineExplanation(params);
    setExplanation(result || '');
    setLoadingAI(false);
  };

  const handleCommit = () => {
    // Generate timestamps and tags
    const imageTag = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);

    // Create Deployment
    const newDeployment: Deployment = {
      id: `d-${Date.now()}`,
      name: params.dockerImageName,
      namespace: 'ai-code',
      replicas: '1/1',
      status: 'Pending', // Initially pending
      age: 'Just now',
      image: `${params.registry}/${params.dockerImageDirectory}/${params.dockerImageName}:${imageTag}`
    };

    // Create Pod
    const newPod: Pod = {
      id: `p-${Date.now()}`,
      name: `${params.dockerImageName}-${Math.random().toString(36).substring(7)}`,
      namespace: 'ai-code',
      restarts: 0,
      ip: '10.244.0.' + Math.floor(Math.random() * 255),
      status: 'Pending',
      age: 'Just now'
    };
    
    // Create Service
    const newService: Service = {
        id: `s-${Date.now()}`,
        name: `${params.dockerImageName}-svc`,
        namespace: 'ai-code',
        type: 'ClusterIP',
        clusterIP: '10.96.0.' + Math.floor(Math.random() * 255),
        ports: '80/TCP',
        age: 'Just now',
        status: 'Active'
    };

    // Create Ingress
    const newIngress: Ingress = {
        id: `i-${Date.now()}`,
        name: `${params.dockerImageName}-ingress`,
        namespace: 'ai-code',
        hosts: `${params.dockerImageName}.heitasoft.com`,
        address: '34.120.5.10',
        ports: '80',
        status: 'Active',
        age: 'Just now'
    };

    // Update Global Mock State
    MOCK_DEPLOYMENTS.unshift(newDeployment);
    MOCK_PODS.unshift(newPod);
    MOCK_SERVICES.unshift(newService);
    MOCK_INGRESS.unshift(newIngress);

    console.log("Committed Pipeline & Created Resources:", { newDeployment, newPod, newService, newIngress });
    alert("Pipeline committed! Auto-provisioned Kubernetes Deployment, Pod, Service, and Ingress resources.");
    setShowScriptModal(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Stack Selector */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl self-start shadow-sm">
        {stacks.map(stack => (
          <button
            key={stack.id}
            onClick={() => setActiveStack(stack.id)}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeStack === stack.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {stack.icon}
            {stack.label}
          </button>
        ))}
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Pipeline Config Wizard</h3>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowScriptModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-sm font-bold hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Code2 size={16} />
              View Code
            </button>
            <button 
              onClick={handleAnalyze}
              disabled={loadingAI}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-sm font-bold hover:bg-indigo-100 disabled:opacity-50 transition-colors"
            >
              <Wand2 size={16} />
              {loadingAI ? 'Analyzing...' : 'AI Advisor'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Git Repository URL</label>
              <input name="gitRepoUrl" value={params.gitRepoUrl} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Build Ref (Branch)</label>
              <input name="gitBuildRef" value={params.gitBuildRef} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <FileCode size={12} className="text-indigo-500" /> Dockerfile Path
              </label>
              <input name="dockerfilePath" value={params.dockerfilePath} onChange={handleInputChange} placeholder="./Dockerfile" className="w-full px-4 py-3 bg-slate-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm font-bold text-indigo-700 transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Credentials ID</label>
              <input name="credentialsId" value={params.credentialsId} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Credentials Password</label>
              <input type="password" name="credentialsPassword" value={params.credentialsPassword} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Image Base Name</label>
              <input name="dockerImageName" value={params.dockerImageName} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Registry Directory</label>
                <input name="dockerImageDirectory" value={params.dockerImageDirectory} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Docker Username</label>
                <input name="dockerUsername" value={params.dockerUsername} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Docker Password</label>
                <input type="password" name="dockerPassword" value={params.dockerPassword} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Deploy Host (SSH)</label>
                <input name="sshTarget" value={params.sshTarget} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
              </div>

              {activeStack === 'node' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Node Options</label>
                  <input name="nodeOptions" value={params.nodeOptions} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all" />
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

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-4">
             <button 
                onClick={() => setShowScriptModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-95"
             >
                <Eye size={20} />
                Preview Script
             </button>
             <button 
                onClick={handleCommit}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 group"
             >
                <PlayCircle size={20} className="group-hover:rotate-[360deg] transition-transform duration-700" />
                Commit Changes
             </button>
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
                  {activeStack} Jenkinsfile
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
              <pre className="whitespace-pre-wrap"><code>{generateScript()}</code></pre>
            </div>
            <div className="p-5 bg-slate-900/90 border-t border-slate-800 flex justify-end items-center gap-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ready to deploy?</span>
              <button 
                onClick={handleCommit}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 active:scale-95 group"
              >
                <PlayCircle size={20} className="group-hover:rotate-[360deg] transition-transform duration-700" />
                Commit Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineWizard;
