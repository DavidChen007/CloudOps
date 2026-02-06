
import React, { useState, useEffect } from 'react';
import { MOCK_DEPLOYMENTS, MOCK_PODS, MOCK_INGRESS, MOCK_SERVICES } from '../constants';
import { Search, Filter, RefreshCw, Layers, Box, Globe, Share2 } from 'lucide-react';
import { k8sApi } from '../services/api';
import { Deployment, Pod, Service, Ingress } from '../types';

const K8sExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deployments' | 'pods' | 'services' | 'ingress'>('deployments');
  const [deployments, setDeployments] = useState<Deployment[]>(MOCK_DEPLOYMENTS);
  const [pods, setPods] = useState<Pod[]>(MOCK_PODS);
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [ingresses, setIngresses] = useState<Ingress[]>(MOCK_INGRESS);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadK8sResources();
  }, []);

  const loadK8sResources = async (name?: string) => {
    try {
      setIsLoading(true);
      const [deploymentsData, podsData, servicesData, ingressesData] = await Promise.all([
        k8sApi.getDeployments(name).catch(() => MOCK_DEPLOYMENTS),
        k8sApi.getPods(name).catch(() => MOCK_PODS),
        k8sApi.getServices(name).catch(() => MOCK_SERVICES),
        k8sApi.getIngresses(name).catch(() => MOCK_INGRESS),
      ]);

      // 转换后端数据格式为前端期望的格式
      setDeployments(transformDeployments(deploymentsData));
      setPods(transformPods(podsData));
      setServices(transformServices(servicesData));
      setIngresses(transformIngresses(ingressesData));
    } catch (error) {
      console.error('Failed to load K8s resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // 实时搜索
    loadK8sResources(query || undefined);
  };

  // 转换 Deployments 数据
  const transformDeployments = (data: any[]): Deployment[] => {
    return data.map((item, index) => ({
      id: item.id || `d-${index}`,
      name: item.name || 'Unknown',
      namespace: item.namespace || 'default',
      replicas: item.replicas || 0,
      status: item.status || 'Unknown',
      age: item.age || 'Unknown',
      image: item.image || 'N/A'
    }));
  };

  // 转换 Pods 数据
  const transformPods = (data: any[]): Pod[] => {
    return data.map((item, index) => ({
      id: item.id || `p-${index}`,
      name: item.name || 'Unknown',
      status: item.status || 'Unknown',
      restarts: item.restartCount || item.restarts || 0,
      ip: item.podIp || item.ip || 'N/A',
      age: item.age || 'Unknown'
    }));
  };

  // 转换 Services 数据
  const transformServices = (data: any[]): Service[] => {
    return data.map((item, index) => ({
      id: item.id || `s-${index}`,
      name: item.name || 'Unknown',
      type: item.type || 'ClusterIP',
      clusterIP: item.clusterIp || item.clusterIP || 'N/A',
      ports: item.ports || 'N/A',
      status: item.status || 'Active',
      age: item.age || 'Unknown'
    }));
  };

  // 转换 Ingresses 数据
  const transformIngresses = (data: any[]): Ingress[] => {
    return data.map((item, index) => ({
      id: item.id || `i-${index}`,
      name: item.name || 'Unknown',
      hosts: item.hosts || 'N/A',
      address: item.addresses || item.address || 'N/A',
      ports: item.ports || '80, 443',
      age: item.age || 'Unknown'
    }));
  };

  const renderDeployments = () => (
    <div className="overflow-hidden bg-white border border-slate-200 rounded-2xl">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Namespace</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Replicas</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Age</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Image</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {deployments.map(d => (
            <tr key={d.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900">{d.name}</td>
              <td className="px-6 py-4 text-slate-600">{d.namespace}</td>
              <td className="px-6 py-4 text-slate-600">{d.replicas}</td>
              <td className="px-6 py-4 text-slate-600">{d.age}</td>
              <td className="px-6 py-4 text-xs text-slate-500 font-mono truncate max-w-xs">{d.image}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPods = () => (
    <div className="overflow-hidden bg-white border border-slate-200 rounded-2xl">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Restarts</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pods.map(p => (
            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
              <td className="px-6 py-4">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${p.status === 'Running' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                  <span className="text-sm text-slate-700 font-medium">{p.status}</span>
                </span>
              </td>
              <td className="px-6 py-4 text-slate-600">{p.restarts}</td>
              <td className="px-6 py-4 text-slate-600 font-mono text-xs">{p.ip}</td>
              <td className="px-6 py-4 text-slate-600">{p.age}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderServices = () => (
    <div className="overflow-hidden bg-white border border-slate-200 rounded-2xl">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cluster IP</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ports</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {services.map(s => (
            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
              <td className="px-6 py-4 text-slate-600">{s.type}</td>
              <td className="px-6 py-4 text-slate-600 font-mono text-xs">{s.clusterIP}</td>
              <td className="px-6 py-4 text-slate-600">{s.ports}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">{s.status}</span>
              </td>
              <td className="px-6 py-4 text-slate-600">{s.age}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderIngress = () => (
    <div className="overflow-hidden bg-white border border-slate-200 rounded-2xl">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hosts</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Address</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ports</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ingresses.map(i => (
            <tr key={i.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900">{i.name}</td>
              <td className="px-6 py-4 text-indigo-600 font-medium">{i.hosts}</td>
              <td className="px-6 py-4 text-slate-600 font-mono text-xs">{i.address}</td>
              <td className="px-6 py-4 text-slate-600">{i.ports}</td>
              <td className="px-6 py-4 text-slate-600">{i.age}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-white p-1 border border-slate-200 rounded-xl overflow-x-auto">
          <button 
            onClick={() => setActiveTab('deployments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'deployments' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Layers size={18} /> Deployments
          </button>
          <button 
            onClick={() => setActiveTab('pods')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'pods' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Box size={18} /> Pods
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'services' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Share2 size={18} /> Services
          </button>
          <button 
            onClick={() => setActiveTab('ingress')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'ingress' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Globe size={18} /> Ingress
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search resources..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">
            <Filter size={18} />
          </button>
          <button
            onClick={loadK8sResources}
            disabled={isLoading}
            className={`p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all ${isLoading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="transition-all duration-300">
        {activeTab === 'deployments' && renderDeployments()}
        {activeTab === 'pods' && renderPods()}
        {activeTab === 'services' && renderServices()}
        {activeTab === 'ingress' && renderIngress()}
      </div>
    </div>
  );
};

export default K8sExplorer;
