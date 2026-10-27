import React, { useState } from 'react';
import { 
  FileText, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Dropzone from './components/Dropzone';
import ResumeTable from './components/ResumeTable';
import PreviewModal from './components/PreviewModal';
import { parseResume } from './utils/parser';

export default function App() {
  const [candidates, setCandidates] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Handle batch file processing
  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });

    const newCandidates = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseResume(file);
        newCandidates.push(parsed);
      } catch (err) {
        console.error('Failed to parse:', file.name, err);
        newCandidates.push({
          id: `${file.name}-${Date.now()}`,
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          fileType: file.name.split('.').pop().toUpperCase(),
          name: '',
          email: '',
          phone: '',
          location: '',
          rawText: '',
          durationMs: 0,
          status: 'error',
          error: err.message || 'Parsing error'
        });
      }
      setProgress({ current: i + 1, total: files.length });
    }

    setCandidates(prev => [...newCandidates, ...prev]);
    setIsProcessing(false);
  };

  const handleUpdateCandidate = (id, updatedFields) => {
    setCandidates(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updatedFields };
        const found = [updated.name, updated.email, updated.phone, updated.location].filter(Boolean).length;
        updated.status = found === 4 ? 'complete' : found >= 2 ? 'partial' : 'low_confidence';
        return updated;
      }
      return c;
    }));
  };

  const handleDeleteCandidate = (id) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all extracted resumes?')) {
      setCandidates([]);
    }
  };

  // Metric stats
  const totalResumes = candidates.length;
  const namesCount = candidates.filter(c => Boolean(c.name && c.name.trim())).length;
  const emailsCount = candidates.filter(c => Boolean(c.email && c.email.trim())).length;
  const phonesCount = candidates.filter(c => Boolean(c.phone && c.phone.trim())).length;
  const locationsCount = candidates.filter(c => Boolean(c.location && c.location.trim())).length;
  const missingCompulsoryCount = candidates.filter(c => !c.name?.trim() || !c.phone?.trim()).length;

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo">
            <FileText size={24} />
          </div>
          <div className="brand-titles">
            <h1>ResumeContact <span className="gradient-text">Extractor</span></h1>
            <p className="brand-tagline">Bulk Resume Parser • Extract Name, Phone, Email & Location</p>
          </div>
        </div>

        <div className="header-meta">
          <div className="meta-badge">
            <ShieldCheck size={16} className="meta-icon-green" />
            <span>100% Client-Side & Offline</span>
          </div>
          <div className="meta-badge">
            <Zap size={16} className="meta-icon-indigo" />
            <span>Fast In-Browser Extraction</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        {/* Upload Dropzone */}
        <Dropzone
          onFilesSelected={handleFilesSelected}
          isProcessing={isProcessing}
          progress={progress}
        />

        {/* Stats Metrics Cards */}
        {candidates.length > 0 && (
          <div className="stats-grid">
            <div 
              className={`stat-card ${statusFilter === 'all' ? 'active-stat' : ''}`}
              onClick={() => setStatusFilter('all')}
              title="Click to view all resumes"
            >
              <div className="stat-icon-wrapper total">
                <Users size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{totalResumes}</span>
                <span className="stat-label">Total Resumes</span>
              </div>
            </div>

            {/* Clean Missing Name / Phone Stat Card */}
            <div 
              className={`stat-card ${statusFilter === 'missing_compulsory' ? 'active-stat' : ''}`}
              onClick={() => setStatusFilter(prev => prev === 'missing_compulsory' ? 'all' : 'missing_compulsory')}
              title="Click to filter resumes missing Name or Phone"
            >
              <div className="stat-icon-wrapper warning">
                <AlertCircle size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{missingCompulsoryCount}</span>
                <span className="stat-label">Missing Name / Phone</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper names">
                <Users size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{namesCount} / {totalResumes}</span>
                <span className="stat-label">Names Extracted</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper phones">
                <Phone size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{phonesCount} / {totalResumes}</span>
                <span className="stat-label">Phones Extracted</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper emails">
                <Mail size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{emailsCount} / {totalResumes}</span>
                <span className="stat-label">Emails Extracted</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper locations">
                <MapPin size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{locationsCount} / {totalResumes}</span>
                <span className="stat-label">Locations Extracted</span>
              </div>
            </div>
          </div>
        )}

        {/* Extracted Candidates Table */}
        {candidates.length > 0 && (
          <ResumeTable
            candidates={candidates}
            onUpdateCandidate={handleUpdateCandidate}
            onDeleteCandidate={handleDeleteCandidate}
            onClearAll={handleClearAll}
            onSelectCandidate={setSelectedCandidate}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}
      </main>

      {/* Document Preview Modal */}
      {selectedCandidate && (
        <PreviewModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </div>
  );
}
