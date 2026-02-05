
import React from 'react';
import { Activity, Server, Clock, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const data = [
  { name: 'Mon', builds: 12, success: 10 },
  { name: 'Tue', builds: 18, success: 15 },
  { name: 'Wed', builds: 15, success: 14 },
  { name: 'Thu', builds: 22, success: 20 },
  { name: 'Fri', builds: 30, success: 28 },
  { name: 'Sat', builds: 8, success: 7 },
  { name: 'Sun', builds: 5, success: 5 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Pipelines', value: '24', icon: <Activity className="text-indigo-500" />, trend: '+12%', trendUp: true },
          { label: 'Healthy Pods', value: '142', icon: <Server className="text-green-500" />, trend: '98%', trendUp: true },
          { label: 'Avg Build Time', value: '4m 12s', icon: <Clock className="text-orange-500" />, trend: '-20s', trendUp: false },
          { label: 'Success Rate', value: '94.2%', icon: <CheckCircle2 className="text-emerald-500" />, trend: '+2.1%', trendUp: true },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-50 rounded-xl">{stat.icon}</div>
              <span className={`text-xs font-bold px-2 py-1 rounded ${stat.trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <h4 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Build Frequency (Last 7 Days)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
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
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Deployments</h3>
          <div className="space-y-6">
            {[
              { app: 'mfx-admin', env: 'production', time: '2 mins ago', status: 'Success' },
              { app: 'auth-service', env: 'staging', time: '15 mins ago', status: 'Success' },
              { app: 'api-gateway', env: 'production', time: '1 hour ago', status: 'Success' },
              { app: 'payment-api', env: 'staging', time: '3 hours ago', status: 'Failed' },
              { app: 'mfx-admin', env: 'staging', time: '5 hours ago', status: 'Success' },
            ].map((item, i) => (
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
