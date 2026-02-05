
import React, { useState } from 'react';
import { FileItem, ExtractedData } from './types';
import { processPDFFile } from './services/geminiService';
import MasterTable from './components/MasterTable';
import DetailModal from './components/DetailModal';

const App: React.FC = () => {
  const [items, setItems] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);

  const isDuplicate = (newData: ExtractedData, currentItems: FileItem[]) => {
    return currentItems.some(item => {
      if (!item.data) return false;
      const d = item.data;
      return d.metadata.name === newData.metadata.name &&
             d.metadata.date === newData.metadata.date &&
             d.metadata.grandTotal === newData.metadata.grandTotal;
    });
  };

  const processFile = async (item: FileItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
    
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result?.toString().split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(item.file);
      });

      const base64Data = await base64Promise;
      const extracted = await processPDFFile(base64Data, item.file.type, item.file.name);
      
      setItems(prev => {
        // Double check for duplicate data before final integration
        if (isDuplicate(extracted, prev)) {
          return prev.map(i => i.id === item.id ? { 
            ...i, 
            status: 'error', 
            error: "Duplicate document detected: Data signature already exists in registry." 
          } : i);
        }

        return prev.map(i => i.id === item.id ? { 
          ...i, 
          status: 'completed', 
          data: extracted 
        } : i);
      });
    } catch (err: any) {
      setItems(prev => prev.map(i => i.id === item.id ? { 
        ...i, 
        status: 'error', 
        error: err.message 
      } : i));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles: File[] = Array.from(event.target.files || []);
    if (rawFiles.length === 0) return;

    // Filter out files that have the exact same name as ones already in the list
    const existingNames = new Set(items.map(i => i.file.name));
    const uniqueFiles = rawFiles.filter(f => !existingNames.has(f.name));

    if (uniqueFiles.length < rawFiles.length) {
      alert(`${rawFiles.length - uniqueFiles.length} file(s) skipped due to identical file names.`);
    }

    if (uniqueFiles.length === 0) return;

    const newItems: FileItem[] = uniqueFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending'
    }));

    setItems(prev => [...newItems, ...prev]);
    setIsProcessing(true);

    await Promise.all(newItems.map(item => processFile(item)));
    setIsProcessing(false);
    
    if (event.target) event.target.value = '';
  };

  const clearAll = () => {
    if (window.confirm("Purge all analysis data?")) {
      setItems([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">DocuStack</h1>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">Multi-PDF Intelligence</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-1 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
              <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                {isProcessing ? 'Processing Active' : 'Engines Standby'}
              </span>
            </div>
            {items.length > 0 && (
              <button onClick={clearAll} className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-widest transition-colors">
                Reset Workspace
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <section className="relative overflow-hidden bg-white p-1 rounded-3xl shadow-2xl shadow-indigo-100/50 border border-slate-100">
          <div className="p-8 md:p-12 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 rounded-[1.4rem] flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-xl text-center lg:text-left space-y-6">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1]">
                Batch Data <span className="text-indigo-600">Verification</span>
              </h2>
              <p className="text-lg text-slate-500 font-medium">
                Our AI detects duplicate content signatures. If a document matches an existing record by name, date, and total, it will be automatically quarantined to prevent data repetition.
              </p>
            </div>

            <div className="w-full lg:w-[400px] shrink-0">
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 to-slate-900 rounded-[2rem] blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative h-64 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white flex flex-col items-center justify-center p-6 text-center group-hover:border-indigo-400 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Batch Upload</h3>
                  <p className="text-slate-400 text-sm font-medium">AI verifies duplicates on-the-fly</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {items.some(i => i.status !== 'completed') && (
          <section className="space-y-4">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">Verification Queue</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.filter(i => i.status !== 'completed').map(item => (
                  <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in zoom-in-95">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className={`p-2 rounded-lg ${item.status === 'error' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                         {item.status === 'processing' ? <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z"/></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                      </div>
                      <span className="text-sm font-bold text-slate-800 truncate" title={item.error || item.file.name}>{item.file.name}</span>
                    </div>
                    {item.status === 'error' && (
                      <button 
                        onClick={() => alert(item.error)}
                        className="text-[10px] bg-red-100 text-red-600 font-black px-2 py-1 rounded hover:bg-red-200 transition-colors"
                      >
                        INFO
                      </button>
                    )}
                  </div>
                ))}
             </div>
          </section>
        )}

        <section>
          <MasterTable 
            items={items} 
            onSelectFile={(item) => setSelectedItem(item)} 
          />
        </section>

        {items.filter(i => i.status === 'completed').length === 0 && !isProcessing && (
           <div className="py-24 flex flex-col items-center justify-center space-y-4 opacity-40 grayscale">
              <div className="w-24 h-24 border-2 border-slate-300 rounded-[2rem] flex items-center justify-center">
                 <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                 </svg>
              </div>
              <p className="text-xl font-black text-slate-400 uppercase tracking-widest">Workspace Empty</p>
           </div>
        )}
      </main>

      {selectedItem && selectedItem.data && (
        <DetailModal 
          data={selectedItem.data} 
          onClose={() => setSelectedItem(null)} 
        />
      )}

      <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2 text-center md:text-left">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">DocuStack Pro</h4>
            <p className="text-xs text-slate-500 font-medium">AI-Native Multi-Document Validation Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
