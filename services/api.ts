// API 基础配置
// 直接请求后端接口，不使用代理
const API_BASE_URL = 'https://saas.btitib.com';

// RestResponse 接口定义
interface RestResponse<T> {
  code: number;
  msg: string;  // 后端使用的是 msg，不是 message
  data: T;
}

// 通用请求函数
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // 将 /api 路径转换为 /api/basic-ai（与之前的代理规则保持一致）
  const finalEndpoint = endpoint.replace(/^\/api/, '/api/basic-ai');

  const response = await fetch(`${API_BASE_URL}${finalEndpoint}`, {
    ...options,
    credentials: 'include', // 重要：允许携带cookie
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  // 解析 RestResponse 格式
  const result: RestResponse<T> = await response.json();

  // 检查业务状态码（后端成功状态码是 0）
  if (result.code !== 0) {
    throw new Error(result.msg || 'Request failed');
  }

  // 返回实际数据
  return result.data;
}

// Dashboard API
export const dashboardApi = {
  getStats: () => request('/api/cloudops/dashboard/stats'),
  getChartData: () => request('/api/cloudops/dashboard/chart-data'),
  getRecentDeployments: () => request('/api/cloudops/dashboard/recent-deployments'),
};

// Jenkins API
export const jenkinsApi = {
  getAllJobs: (jobName?: string) => {
    const params = jobName ? `?jobName=${encodeURIComponent(jobName)}` : '';
    return request(`/api/cloudops/jenkins/jobs${params}`);
  },
  getJob: (id: string) => request(`/api/cloudops/jenkins/jobs/${id}`),
  getJobConfig: (id: string) => request(`/api/cloudops/jenkins/job/${id}`),  // 获取Job配置详情
  buildJob: (id: string) => request(`/api/cloudops/jenkins/job/${id}/build`, { method: 'POST' }),
  getBuilds: (id: string) => request(`/api/cloudops/jenkins/job/${id}/builds`),
  getBuildLog: (id: string, buildNumber: number) => request(`/api/cloudops/jenkins/job/${id}/build/${buildNumber}/log`),
  getBuildInfo: (id: string, buildNumber: number) => request(`/api/cloudops/jenkins/job/${id}/build/${buildNumber}/info`),
  getConfigXmlTemplate: (stack: string, jobName?: string, gitRepoUrl?: string, gitBranch?: string) => {
    const params = new URLSearchParams({ stack });
    if (jobName) params.append('jobName', jobName);
    if (gitRepoUrl) params.append('gitRepoUrl', gitRepoUrl);
    if (gitBranch) params.append('gitBranch', gitBranch);
    return request(`/api/cloudops/jenkins/template/config-xml?${params.toString()}`);
  },
  generateJenkinsfilePreview: (data: {
    name: string;
    stack: string;
    gitRepoUrl: string;
    gitBranch: string;
    gitCredentialsId: string;
    dockerImageName: string;
    dockerfilePath: string;
    dockerBuildContext?: string;
    buildDirectory?: string;  // 构建工作目录
    replicas?: number;
    containerPort?: number;
    servicePort?: number;
  }) => request('/api/cloudops/jenkins/template/jenkinsfile', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  syncJobs: () => request('/api/cloudops/jenkins/sync', { method: 'POST' }),
  createJobWithK8s: (data: {
    jobName: string;
    configXml: string;
    stack: string;
    gitRepoUrl?: string;
    gitBranch?: string;
    gitCredentialsId?: string;
    dockerImageName: string;
    dockerfilePath?: string;
    dockerBuildContext?: string;
    pathPrefix?: string;
    buildDirectory?: string;
    port?: number;
    replicas?: number;
  }) => request('/api/cloudops/jenkins/job/deploy-with-xml', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteJob: (id: string) => request(`/api/cloudops/jenkins/job/${id}`, { method: 'DELETE' }),
};

// K8s API
export const k8sApi = {
  getDeployments: (name?: string) => {
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    return request(`/api/cloudops/k8s/deployments${params}`);
  },
  getPods: (name?: string) => {
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    return request(`/api/cloudops/k8s/pods${params}`);
  },
  getServices: (name?: string) => {
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    return request(`/api/cloudops/k8s/services${params}`);
  },
  getIngresses: (name?: string) => {
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    return request(`/api/cloudops/k8s/ingresses${params}`);
  },
};

// Pipeline API
export const pipelineApi = {
  create: (config: any) => request('/api/cloudops/pipeline/create', {
    method: 'POST',
    body: JSON.stringify(config),
  }),
  getAll: () => request('/api/cloudops/pipeline/all'),
};

// Git Credential API
export const gitCredentialApi = {
  list: () => request('/api/cloudops/git-credential/list'),
  create: (data: {
    credentialName: string;
    gitUsername: string;
    gitPassword: string;
    description?: string;
  }) => request('/api/cloudops/git-credential/create', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: {
    credentialName: string;
    gitUsername: string;
    gitPassword: string;
    description?: string;
  }) => request(`/api/cloudops/git-credential/update/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => request(`/api/cloudops/git-credential/delete/${id}`, {
    method: 'DELETE',
  }),
};
