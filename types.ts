
export type StackType = 'node' | 'java' | 'python';

export interface PipelineParams {
  gitRepoUrl: string;
  gitBuildRef: string;
  credentialsId: string;
  credentialsPassword: string;
  dockerUsername: string;
  dockerPassword: string;
  nodeOptions: string;
  dockerImageName: string;
  dockerImageDirectory: string;
  dockerfilePath: string;
}

export interface K8sResource {
  id: string;
  name: string;
  namespace: string;
  status: 'Running' | 'Pending' | 'Failed' | 'Ready' | 'Active';
  age: string;
  info?: string;
}

export interface Pod extends K8sResource {
  restarts: number;
  ip: string;
}

export interface Deployment extends K8sResource {
  replicas: string;
  image: string;
}

export interface Service extends K8sResource {
  type: string;
  clusterIP: string;
  ports: string;
}

export interface Ingress extends K8sResource {
  hosts: string;
  address: string;
  ports: string;
}

export interface JenkinsJob {
  id: string;
  name: string;
  status: string;
  lastDuration: string;
  lastBuild: string;
  lastTime: string;
  branch: string;
}

export enum ViewMode {
  Dashboard = 'dashboard',
  Wizard = 'wizard',
  K8sExplorer = 'k8s',
  JenkinsJobs = 'jenkins',
  GitCredentials = 'credentials'
}
