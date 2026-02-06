import React, { useState, useEffect } from 'react';
import { Key, Plus, Edit2, Trash2, X } from 'lucide-react';
import { gitCredentialApi } from '../services/api';

interface GitCredential {
  id: number;
  credentialId: string;
  credentialName: string;
  gitUsername: string;
  description?: string;
  createTime: string;
}

const GitCredentials: React.FC = () => {
  const [credentials, setCredentials] = useState<GitCredential[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<GitCredential | null>(null);
  const [formData, setFormData] = useState({
    credentialName: '',
    gitUsername: '',
    gitPassword: '',
    description: '',
  });

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const data = await gitCredentialApi.list();
      setCredentials(data);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  const handleCreate = () => {
    setEditingCredential(null);
    setFormData({
      credentialName: '',
      gitUsername: '',
      gitPassword: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (credential: GitCredential) => {
    setEditingCredential(credential);
    setFormData({
      credentialName: credential.credentialName,
      gitUsername: credential.gitUsername,
      gitPassword: '', // 不显示原密码
      description: credential.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个凭证吗？')) return;

    try {
      await gitCredentialApi.delete(id);
      loadCredentials();
    } catch (error) {
      console.error('Failed to delete credential:', error);
      alert('删除失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCredential) {
        await gitCredentialApi.update(editingCredential.id, formData);
      } else {
        await gitCredentialApi.create(formData);
      }
      setIsModalOpen(false);
      loadCredentials();
    } catch (error) {
      console.error('Failed to save credential:', error);
      alert('保存失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Git凭证管理</h2>
          <p className="text-slate-600 mt-1">管理用于访问Git仓库的凭证</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          新建凭证
        </button>
      </div>

      {/* Credentials List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                凭证名称
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                凭证ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                Git用户名
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                描述
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                创建时间
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {credentials.map((cred) => (
              <tr key={cred.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{cred.credentialName}</td>
                <td className="px-6 py-4 text-slate-600 font-mono text-sm">{cred.credentialId}</td>
                <td className="px-6 py-4 text-slate-600">{cred.gitUsername}</td>
                <td className="px-6 py-4 text-slate-600">{cred.description || '-'}</td>
                <td className="px-6 py-4 text-slate-600">{new Date(cred.createTime).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(cred)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cred.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {credentials.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  暂无凭证，点击"新建凭证"开始创建
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                {editingCredential ? '编辑凭证' : '新建凭证'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  凭证名称 *
                </label>
                <input
                  type="text"
                  value={formData.credentialName}
                  onChange={(e) => setFormData({ ...formData, credentialName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="例如：GitHub主账号"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Git用户名 *
                </label>
                <input
                  type="text"
                  value={formData.gitUsername}
                  onChange={(e) => setFormData({ ...formData, gitUsername: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Git用户名"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Git密码/Token *
                </label>
                <input
                  type="password"
                  value={formData.gitPassword}
                  onChange={(e) => setFormData({ ...formData, gitPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Git密码或Personal Access Token"
                  required={!editingCredential}
                />
                {editingCredential && (
                  <p className="text-xs text-slate-500 mt-1">留空则不修改密码</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="凭证描述（可选）"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  {editingCredential ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitCredentials;
