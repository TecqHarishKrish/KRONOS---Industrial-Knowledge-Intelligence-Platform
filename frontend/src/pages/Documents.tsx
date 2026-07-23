import React, { useEffect, useState } from 'react';
import { 
  X, 
  FileCode
} from 'lucide-react';
import api from '../services/api';

interface ExtractedEntity {
  id: number;
  entity_type: string;
  entity_value: string;
  confidence: number;
}

interface DocumentData {
  id: number;
  filename: string;
  file_type: string;
  status: string;
  size_bytes: number;
  uploaded_at: string;
  version: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  text_content: string | null;
  entities: ExtractedEntity[];
}

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null);
  const [historyChain, setHistoryChain] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to load documents list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (doc: DocumentData) => {
    // Fetch full document details
    try {
      const docResponse = await api.get(`/documents/${doc.id}`);
      setSelectedDoc(docResponse.data);
      
      // Fetch version history chain
      setHistoryLoading(true);
      const histResponse = await api.get(`/documents/${doc.id}/history`);
      setHistoryChain(histResponse.data);
    } catch (error) {
      console.error('Error fetching document details:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closePanel = () => {
    setSelectedDoc(null);
    setHistoryChain([]);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Indefinite';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Document Repository
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Explore ingested technical documents, active SOP version paths, and extracted entity data.
        </p>
      </div>

      {/* Main Grid: Split Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start transition-all duration-300">
        
        {/* Table View */}
        <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${
          selectedDoc ? 'w-full lg:w-2/3' : 'w-full'
        }`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500">
                <th className="px-6 py-3.5">Filename</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Size</th>
                <th className="px-6 py-3.5">Version</th>
                <th className="px-6 py-3.5">Temporal Status</th>
                <th className="px-6 py-3.5">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm text-zinc-900 dark:text-zinc-200">
              {documents.map((doc) => (
                <tr 
                  key={doc.id} 
                  onClick={() => handleRowClick(doc)}
                  className={`cursor-pointer transition-colors ${
                    selectedDoc?.id === doc.id
                      ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/15'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-850/50'
                  }`}
                >
                  <td className="px-6 py-4 font-semibold truncate max-w-[200px]">{doc.filename}</td>
                  <td className="px-6 py-4">
                    <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded px-1.5 py-0.5 font-mono text-xs">
                      {doc.file_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{formatSize(doc.size_bytes)}</td>
                  <td className="px-6 py-4">v{doc.version}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      doc.is_active 
                        ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {doc.is_active ? 'Active' : 'Superseded'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{formatDate(doc.uploaded_at)}</td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No documents indexed in repository.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Side Panel: Selected Document Details */}
        {selectedDoc && (
          <div className="w-full lg:w-1/3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[80vh] sticky top-6 transition-all duration-300">
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="text-blue-600 dark:text-blue-400" size={18} />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
                  {selectedDoc.filename}
                </h3>
              </div>
              <button 
                onClick={closePanel}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Status Section */}
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Status</p>
                  <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedDoc.is_active 
                      ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {selectedDoc.is_active ? 'Latest Valid' : 'Superseded'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Version</p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-1">v{selectedDoc.version}</p>
                </div>
              </div>

              {/* Version History Chain */}
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Version Chain</p>
                <div className="space-y-1.5">
                  {historyChain.map((hist) => (
                    <div 
                      key={hist.id} 
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                        hist.id === selectedDoc.id 
                          ? 'border-blue-500 bg-blue-50/10 text-blue-600 dark:text-blue-400 font-semibold' 
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="truncate max-w-[150px]">{hist.filename}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono bg-black/5 dark:bg-white/5 px-1 py-0.2 rounded">v{hist.version}</span>
                        {hist.is_active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Active"></span>
                        )}
                      </div>
                    </div>
                  ))}
                  {historyLoading && <div className="h-10 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded"></div>}
                </div>
              </div>

              {/* Validity Period */}
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Valid From</p>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-1">
                    {formatDate(selectedDoc.valid_from)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Valid Until</p>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mt-1">
                    {formatDate(selectedDoc.valid_until)}
                  </p>
                </div>
              </div>

              {/* Extracted Entities */}
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Extracted Entities</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.entities.map((ent) => {
                    let color = 'bg-zinc-100 dark:bg-zinc-850 text-zinc-800 dark:text-zinc-400';
                    if (ent.entity_type === 'EQUIPMENT') color = 'bg-blue-100 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400';
                    if (ent.entity_type === 'SOP') color = 'bg-indigo-100 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400';
                    if (ent.entity_type === 'REGULATION') color = 'bg-purple-100 dark:bg-purple-950/20 text-purple-800 dark:text-purple-400';
                    if (ent.entity_type === 'INCIDENT') color = 'bg-rose-100 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400';
                    
                    return (
                      <span 
                        key={ent.id} 
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${color}`}
                        title={`Confidence: ${(ent.confidence * 100).toFixed(0)}%`}
                      >
                        {ent.entity_type}: {ent.entity_value}
                      </span>
                    );
                  })}
                  {selectedDoc.entities.length === 0 && (
                    <span className="text-xs text-zinc-500">No entities extracted.</span>
                  )}
                </div>
              </div>

              {/* Text Extract Preview */}
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Extracted Text Content</p>
                <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 max-h-48 overflow-y-auto text-xs font-mono text-zinc-300 leading-normal white-space-pre-wrap">
                  {selectedDoc.text_content || 'No text extracted.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;
