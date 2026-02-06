
import React from 'react';
import { LayoutDashboard, Rocket, Network, Terminal, Key } from 'lucide-react';
import { Deployment, Pod, Ingress, Service, JenkinsJob } from './types';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'jenkins', label: 'Jenkins Jobs', icon: <Terminal size={20} /> },
  { id: 'k8s', label: 'K8s Explorer', icon: <Network size={20} /> },
  { id: 'credentials', label: 'Git Credentials', icon: <Key size={20} /> },
];

export const MOCK_DEPLOYMENTS: Deployment[] = [
  // { id: '1', name: 'mfx-admin-deploy', namespace: 'production', replicas: '3/3', status: 'Ready', age: '12d', image: 'heitasoft/mfx-admin:2024-05-20' },
  // { id: '2', name: 'auth-service', namespace: 'production', replicas: '2/2', status: 'Ready', age: '5d', image: 'heitasoft/auth:v1.2.3' },
  // { id: '3', name: 'api-gateway', namespace: 'staging', replicas: '1/1', status: 'Ready', age: '2h', image: 'heitasoft/gateway:latest' },
];

export const MOCK_PODS: Pod[] = [
  // { id: 'p1', name: 'mfx-admin-6d5f-abc1', namespace: 'production', restarts: 0, ip: '10.244.1.12', status: 'Running', age: '12d' },
  // { id: 'p2', name: 'mfx-admin-6d5f-abc2', namespace: 'production', restarts: 2, ip: '10.244.1.13', status: 'Running', age: '12d' },
  // { id: 'p3', name: 'auth-service-7f8a-xyz1', namespace: 'production', restarts: 0, ip: '10.244.2.45', status: 'Running', age: '5d' },
];

export const MOCK_SERVICES: Service[] = [
  // { id: 's1', name: 'mfx-admin-svc', namespace: 'production', type: 'ClusterIP', clusterIP: '10.96.0.12', ports: '80/TCP', status: 'Active', age: '12d' },
  // { id: 's2', name: 'auth-service', namespace: 'production', type: 'ClusterIP', clusterIP: '10.96.0.45', ports: '8080/TCP', status: 'Active', age: '5d' },
];

export const MOCK_INGRESS: Ingress[] = [
  // { id: 'i1', name: 'mfx-main-ingress', namespace: 'production', hosts: 'admin.heitasoft.com', address: '34.120.5.10', ports: '80, 443', status: 'Ready', age: '30d' },
];

export const MOCK_JENKINS_JOBS: JenkinsJob[] = [
  // { id: 'j1', name: 'mfx-admin-pipeline', status: 'SUCCESS', lastDuration: '4m 32s', lastBuild: '#128', lastTime: '2h ago', branch: 'master' },
  // { id: 'j2', name: 'auth-service-ci', status: 'SUCCESS', lastDuration: '2m 15s', lastBuild: '#45', lastTime: '5h ago', branch: 'develop' },
  // { id: 'j3', name: 'api-gateway-deploy', status: 'FAILURE', lastDuration: '1m 10s', lastBuild: '#89', lastTime: '1d ago', branch: 'master' },
  // { id: 'j4', name: 'data-worker-python', status: 'IN_PROGRESS', lastDuration: 'Running...', lastBuild: '#12', lastTime: 'Just now', branch: 'feature/data-sync' },
  // { id: 'j5', name: 'mfx-mobile-react', status: 'ABORTED', lastDuration: '55s', lastBuild: '#34', lastTime: '3d ago', branch: 'master' },
];
