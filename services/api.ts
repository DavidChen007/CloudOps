// API 基础配置
const API_BASE_URL = 'http://localhost:8082';

// 通用请求函数
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Dashboard API
export const dashboardApi = {
  getStats: () => request('/api/dashboard/stats'),
};

// Jenkins API
export const jenkinsApi = {
  getAllJobs: () => request('/api/jenkins/jobs'),
  getJob: (id: string) => request(`/api/jenkins/jobs/${id}`),
  buildJob: (id: string) => request(`/api/jenkins/jobs/${id}/build`, { method: 'POST' }),
  syncJobs: () => request('/api/jenkins/sync', { method: 'POST' }),
};

// K8s API
export const k8sApi = {
  getDeployments: () => request('/api/k8s/deployments'),
  getPods: () => request('/api/k8s/pods'),
  getServices: () => request('/api/k8s/services'),
  getIngresses: () => request('/api/k8s/ingresses'),
};

// Pipeline API
export const pipelineApi = {
  create: (config: any) => request('/api/pipeline/create', {
    method: 'POST',
    body: JSON.stringify(config),
  }),
  getAll: () => request('/api/pipeline/all'),
};
