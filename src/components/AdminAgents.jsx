import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { mockApi } from '../data/mockDb';

export default function AdminAgents() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);
  const fetchUsers = async () => {
    const data = await mockApi.getUsers();
    setUsers(data.filter((u) => u.status !== 'deleted'));
  };
  const handleDelete = async (id) => {
    if (window.confirm('Revoke access?')) {
      await mockApi.deleteUser(id);
      fetchUsers();
    }
  };
  const openModal = (user = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white">
        <h2 className="text-xl font-bold text-gray-800">
          User & Agent Directory
        </h2>
        <button
          onClick={() => openModal()}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4 mr-2" /> Add User
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium">{u.name}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                      u.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => openModal(u)}
                    className="p-2 text-gray-400 hover:text-indigo-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <UserModal
          user={editingUser}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSuccess }) {
  const isEditing = !!user;
  const [formData, setFormData] = useState({
    name: user?.name || '',
    user_id: user?.user_id || '',
    password: '',
    role: user?.role || 'staff',
    status: user?.status || 'active',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditing) {
      const updateData = { ...formData };
      if (!updateData.password) delete updateData.password;
      await mockApi.updateUser(user.id, updateData);
    } else {
      await mockApi.createUser(formData);
    }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between">
          <h3 className="text-lg font-bold">
            {isEditing ? 'Edit User' : 'Add User'}
          </h3>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border rounded-xl px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">User ID</label>
            <input
              type="text"
              required
              disabled={isEditing}
              value={formData.user_id}
              onChange={(e) =>
                setFormData({ ...formData, user_id: e.target.value })
              }
              className="w-full border rounded-xl px-4 py-2 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">
              {isEditing ? 'Reset Password' : 'Password'}
            </label>
            <input
              type="password"
              required={!isEditing}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full border rounded-xl px-4 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="w-full border rounded-xl px-4 py-2"
              >
                <option value="staff">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full border rounded-xl px-4 py-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
