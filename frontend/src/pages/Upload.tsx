import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

interface UploadTask {
  id: string;
  name: string;
  size: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  progress: number;
}

const Upload: React.FC = () => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const newTasks = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      status: 'pending' as const,
      progress: 0,
    }));
    
    setTasks((prev) => [...newTasks, ...prev]);

    // Trigger upload sequentially
    newTasks.forEach((task, index) => {
      uploadFile(task.id, files[index]);
    });
  };

  const uploadFile = async (taskId: string, file: File) => {
    setTasks((prev) => 
      prev.map((t) => (t.id === taskId ? { ...t, status: 'uploading', progress: 20 } : t))
    );

    const formData = new FormData();
    formData.append('file', file);

    try {
      setTasks((prev) => 
        prev.map((t) => (t.id === taskId ? { ...t, progress: 60 } : t))
      );
      
      await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setTasks((prev) => 
        prev.map((t) => (t.id === taskId ? { ...t, status: 'completed', progress: 100 } : t))
      );
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Upload failed';
      setTasks((prev) => 
        prev.map((t) => (t.id === taskId ? { ...t, status: 'failed', error: errorMsg } : t))
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Document Upload Center
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Upload industrial files (PDF, DOCX, TXT, CSV, PNG, JPG, ZIP). KRONOS will run OCR, extract entities, construct versioning chains, and search for conflicts.
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center transition-all ${
          dragActive 
            ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/10' 
            : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700'
        }`}
      >
        <div className="bg-zinc-100 dark:bg-zinc-850 p-4 rounded-full text-zinc-600 dark:text-zinc-400 mb-4">
          <UploadCloud size={32} />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Drag and drop your engineering documents here
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm leading-relaxed">
          Supports files up to 25MB including scanned images. Multi-file uploads will process asynchronously in the background.
        </p>
        
        <label className="mt-6 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-2 text-sm font-semibold transition-colors shadow-sm select-none">
          Browse Files
          <input 
            type="file" 
            multiple 
            className="hidden" 
            onChange={handleFileInput}
            accept=".pdf,.docx,.txt,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
          />
        </label>
      </div>

      {/* Upload Tasks List */}
      {tasks.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Upload Processing Queue</h3>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {tasks.map((task) => (
              <div key={task.id} className="p-5 flex items-center justify-between text-sm">
                <div className="space-y-1 max-w-[60%]">
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{task.name}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{task.size}</p>
                  
                  {/* Progress Bar */}
                  {task.status === 'uploading' && (
                    <div className="w-64 bg-zinc-200 dark:bg-zinc-850 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-3">
                  {task.status === 'completed' && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle size={16} />
                      Completed
                    </span>
                  )}
                  {task.status === 'failed' && (
                    <div className="text-right">
                      <span className="flex items-center justify-end gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        <AlertCircle size={16} />
                        Failed
                      </span>
                      <p className="text-[10px] text-rose-500 mt-1 max-w-[200px] leading-tight truncate">{task.error}</p>
                    </div>
                  )}
                  {task.status === 'uploading' && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                      <RefreshCw size={16} className="animate-spin" />
                      Processing
                    </span>
                  )}
                  {task.status === 'pending' && (
                    <span className="text-xs text-zinc-400 font-semibold">
                      Waiting
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
