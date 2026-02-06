
import React, { useState, useEffect } from 'react';
import { Activity, Server, Clock, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { dashboardApi } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<{
    activePipelines?: number;
    healthyPods?: number;
    avgBuildTime?: string;
    successRate?: string;
  }>({});

  const [chartData, setChartData] = useState<Array<{ name: string; builds: number; success: number }>>([]);
  const [recentDeployments, setRecentDeployments] = useState<Array<{
    app: string;
    env: string;
    time: string;
    status: string;
  }>>([]);

  useEffect(() => {
    loadStats();
    loadChartData();
    loadRecentDeployments();
  }, []);

  const loadStats = async () => {
    try {
      const data = await dashboardApi.getStats();

      // 格式化平均构建时间
      let avgBuildTimeStr = 'N/A';
      if (data.avgBuildTime !== undefined && data.avgBuildTime !== null) {
        const minutes = Math.floor(data.avgBuildTime);
        const seconds = Math.round((data.avgBuildTime - minutes) * 60);
        avgBuildTimeStr = `${minutes}m ${seconds}s`;
      }

      // 格式化成功率
      let successRateStr = 'N/A';
      if (data.successRate !== undefined && data.successRate !== null) {
        successRateStr = `${data.successRate.toFixed(1)}%`;
      }

      setStats({
        activePipelines: data.activePipelines,
        healthyPods: data.healthyPods,
        avgBuildTime: avgBuildTimeStr,
        successRate: successRateStr
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  const loadChartData = async () => {
    try {
      const data = await dashboardApi.getChartData();
      setChartData(data);
    } catch (error) {
      console.error('Failed to load chart data:', error);
    }
  };

  const loadRecentDeployments = async () => {
    try {
      const data = await dashboardApi.getRecentDeployments();
      setRecentDeployments(data);
    } catch (error) {
      console.error('Failed to load recent deployments:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Pipelines', value: stats.activePipelines, icon: <Activity className="text-indigo-500" /> },
          { label: 'Healthy Pods', value: stats.healthyPods, icon: <Server className="text-green-500" /> },
          { label: 'Avg Build Time', value: stats.avgBuildTime, icon: <Clock className="text-orange-500" /> },
          { label: 'Success Rate', value: stats.successRate, icon: <CheckCircle2 className="text-emerald-500" /> },
        ].filter(stat => stat.value !== undefined).map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-50 rounded-xl">{stat.icon}</div>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">{String(stat.value)}</h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Build Frequency (Last 7 Days)</h3>
          {chartData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  />
                  <Bar dataKey="builds" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="success" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 w-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-slate-300 mb-3">
                  <Activity size={48} className="mx-auto" />
                </div>
                <p className="text-slate-500 font-medium">暂无构建数据</p>
                <p className="text-slate-400 text-sm mt-1">构建数据将在这里显示</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Deployments</h3>
          {recentDeployments.length > 0 ? (
            <>
              <div className="space-y-6">
                {recentDeployments.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${item.status === 'Success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.app}</p>
                        <p className="text-xs text-slate-500">{item.env} • {item.time}</p>
                      </div>
                    </div>
                    <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Logs</button>
                  </div>
                ))}
              </div>
              <button className="w-full mt-8 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
                View All Activity
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="text-slate-300 mb-3">
                  <CheckCircle2 size={48} className="mx-auto" />
                </div>
                <p className="text-slate-500 font-medium">暂无部署记录</p>
                <p className="text-slate-400 text-sm mt-1">最近的部署将在这里显示</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
