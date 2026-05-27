import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, Copy, Check, FolderOpen, Loader2 } from 'lucide-react';
import { db } from '../firebase'; // Adjust to './firebase' if in the exact same folder
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

export default function MediaVault() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const fileInputRef = useRef(null);

  // --- CLOUDINARY CONFIGURATION ---
  const CLOUD_NAME = "dx0oipjh3"; 
  const UPLOAD_PRESET = "crm_vault"; 

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "media_vault"));
      const fileData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFiles(fileData);
    } catch (error) {
      console.error("Error fetching files from Firebase:", error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);

    try {
      // 1. Upload the file directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
      });
      const cloudData = await res.json();

      if (cloudData.secure_url) {
        // 2. Save the URL and File Name to your Firebase Database
        await addDoc(collection(db, "media_vault"), {
          name: file.name,
          url: cloudData.secure_url,
          created_at: new Date().toISOString()
        });
        
        await fetchFiles(); // Refresh the UI
      } else {
        alert("Upload failed. Please check your Cloudinary Cloud Name and Preset.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Something went wrong with the upload.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from your vault?`)) return;
    try {
      // Removes the link from your CRM view
      await deleteDoc(doc(db, "media_vault", id));
      await fetchFiles();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const copyToClipboard = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center">
            <FolderOpen className="w-6 h-6 mr-3 text-indigo-600" /> Media Vault
          </h2>
          <p className="text-sm text-gray-500 font-medium">Store your PDFs and Brochures for AI-generated scripts.</p>
        </div>
        <button onClick={() => fileInputRef.current.click()} disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black hover:bg-indigo-700 transition flex items-center shadow-md disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {loading ? 'Uploading...' : 'Upload Asset'}
        </button>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.length === 0 && !loading && (
          <div className="col-span-full p-10 text-center text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-xl bg-white">
            Your vault is empty. Click "Upload Asset" to add a file!
          </div>
        )}
        
        {files.map((file) => (
          <div key={file.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition">
            <div className="flex items-center overflow-hidden pr-4">
              <FileText className="w-8 h-8 text-indigo-400 shrink-0 mr-3" />
              <span className="text-sm font-bold text-gray-700 truncate" title={file.name}>{file.name}</span>
            </div>
            <div className="flex space-x-1 shrink-0">
              <button onClick={() => copyToClipboard(file.url, file.id)} className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition" title="Copy public link">
                {copiedId === file.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={() => handleDelete(file.id, file.name)} className="p-2 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition" title="Remove file link">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}