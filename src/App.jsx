import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Zap,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import Dropzone from './components/Dropzone';
import ResumeTable from './components/ResumeTable';
import PreviewModal from './components/PreviewModal';
import AiReviewModal from './components/AiReviewModal';
import { parseResume } from './utils/parser';
import { 
  processBatchWithAI, 
  extractWithOpenAI, 
  isCandidateIncomplete 
} from './utils/aiFallback';

const getInitialPasscode = () => {
  return import.meta.env.VITE_OFFICE_PASSCODE || localStorage.getItem('resume_office_passcode') || '';
};

export default function App() {
  const [candidates, setCandidates] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // AI Queue Execution States
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0, resolved: 0 });
  const [reviewProposals, setReviewProposals] = useState([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [passcode, setPasscode] = useState(getInitialPasscode);
  const aiAbortControllerRef = useRef(null);

  // Helper to obtain passcode or prompt user
  const getOrPromptPasscode = () => {
    let current = passcode || getInitialPasscode();
    if (!current) {
      const entered = window.prompt('🔒 Enter Office Passcode to run AI Smart Extraction:');
      if (entered && entered.trim()) {
        current = entered.trim();
        localStorage.setItem('resume_office_passcode', current);
        setPasscode(current);
      }
    }
    return current;
  };

  const handleUpdatePasscode = () => {
    const current = passcode || getInitialPasscode();
    const entered = window.prompt('🔒 Configure Office Passcode (saved securely in your browser):', current);
    if (entered !== null) {
      const trimmed = entered.trim();
      localStorage.setItem('resume_office_passcode', trimmed);
      setPasscode(trimmed);
      if (trimmed) {
        alert('Office passcode updated successfully.');
      } else {
        alert('Office passcode cleared.');
      }
    }
  };

  // Run AI batch refinement on incomplete candidates
  const runAiRefinementQueue = async (candidatesQueue) => {
    const queueToProcess = candidatesQueue.filter(isCandidateIncomplete);
    if (queueToProcess.length === 0) return;

    const currentPasscode = getOrPromptPasscode();

    setIsAiProcessing(true);
    setAiProgress({ current: 0, total: queueToProcess.length, resolved: 0 });
    const abortController = new AbortController();
    aiAbortControllerRef.current = abortController;

    try {
      const { results } = await processBatchWithAI({
        candidates: queueToProcess,
        passcode: currentPasscode,
        concurrency: 3,
        signal: abortController.signal,
        onProgress: (prog) => {
          setAiProgress(prog);
        }
      });

      if (results && results.length > 0) {
        // Pop modal with response and option of OK / Fill
        setReviewProposals(results);
        setIsReviewOpen(true);
      } else {
        alert('AI completed processing, but no contact details could be detected in these resumes.');
      }
    } catch (err) {
      console.error('Batch AI execution error:', err);
      if (err.message.includes('Unauthorized') || err.message.includes('Passcode')) {
        localStorage.removeItem('resume_office_passcode');
        setPasscode('');
        alert('🔒 Authentication Error: Invalid or missing Office Passcode. Please click the lock badge in the header to re-enter it.');
      } else {
        alert(`AI Extraction Error: ${err.message}`);
      }
    } finally {
      setIsAiProcessing(false);
      aiAbortControllerRef.current = null;
    }
  };

  const handleStopAi = () => {
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
      setIsAiProcessing(false);
    }
  };

  // Single candidate AI refinement (from table row button)
  const handleSingleAiRefine = async (candidate) => {
    const currentPasscode = getOrPromptPasscode();

    setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, _isAiRunning: true } : c));

    try {
      const extracted = await extractWithOpenAI(candidate, currentPasscode);

      if (extracted) {
        const proposal = {
          id: candidate.id,
          fileName: candidate.fileName,
          fileType: candidate.fileType,
          original: {
            name: candidate.name,
            phone: candidate.phone,
            email: candidate.email,
            location: candidate.location
          },
          extracted: {
            name: extracted.name || candidate.name || '',
            phone: extracted.phone || candidate.phone || '',
            email: extracted.email || candidate.email || '',
            location: extracted.location || candidate.location || ''
          },
          isFixed: Boolean(extracted.name || extracted.phone)
        };

        // Pop modal with response and option of OK / Fill
        setReviewProposals([proposal]);
        setIsReviewOpen(true);
      } else {
        alert(`No details could be extracted for ${candidate.fileName}.`);
      }
    } catch (err) {
      console.error('Single candidate AI error:', err);
      if (err.message.includes('Unauthorized') || err.message.includes('Passcode')) {
        localStorage.removeItem('resume_office_passcode');
        setPasscode('');
        alert('🔒 Authentication Error: Invalid or missing Office Passcode.');
      } else {
        alert(`AI Extraction Error: ${err.message}`);
      }
    } finally {
      setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, _isAiRunning: false } : c));
    }
  };

  // When user clicks "Apply & Fill Values" in review modal
  const handleConfirmApplyProposals = (proposals) => {
    setCandidates(prev => prev.map(candidate => {
      const match = proposals.find(p => p.id === candidate.id);
      if (!match) return candidate;

      const updated = {
        ...candidate,
        name: match.extracted.name || candidate.name,
        phone: match.extracted.phone || candidate.phone,
        email: match.extracted.email || candidate.email,
        location: match.extracted.location || candidate.location,
        aiRefined: true
      };

      const found = [updated.name, updated.email, updated.phone, updated.location].filter(Boolean).length;
      updated.status = found === 4 ? 'complete' : found >= 2 ? 'partial' : 'low_confidence';
      return updated;
    }));
  };

  // Handle batch file processing from Dropzone
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
  const missingCompulsoryCount = candidates.filter(isCandidateIncomplete).length;
  const aiRefinedCount = candidates.filter(c => c.aiRefined).length;

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
            <p className="brand-tagline">Bulk Resume Parser • Multi-Format & Smart Vision OCR Fallback</p>
          </div>
        </div>

        <div className="header-meta">
          <div 
            className="meta-badge" 
            style={{ cursor: 'pointer' }}
            onClick={handleUpdatePasscode}
            title="Click to configure or change company Office Passcode"
          >
            <Lock size={15} className="meta-icon-indigo" />
            <span>{passcode ? 'Office Protected 🔒' : 'Set Passcode 🔑'}</span>
          </div>

          <div className="meta-badge meta-ai-active">
            <Sparkles size={15} className="ai-sparkle-icon" />
            <span>AI Smart Fallback Active</span>
          </div>

          <div className="meta-badge">
            <ShieldCheck size={16} className="meta-icon-green" />
            <span>Client-Side Privacy</span>
          </div>
          <div className="meta-badge">
            <Zap size={16} className="meta-icon-indigo" />
            <span>Fast In-Browser Engine</span>
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

        {/* AI Progress / Refine Notification Banner */}
        {candidates.length > 0 && (
          <div className="ai-banner-container">
            {isAiProcessing ? (
              <div className="ai-running-banner">
                <div className="ai-running-info">
                  <div className="ai-spin-wrapper">
                    <Sparkles size={20} className="ai-spin-pulse" />
                  </div>
                  <div>
                    <h4>AI Smart Fallback in Progress...</h4>
                    <p>
                      Analyzing {aiProgress.current} of {aiProgress.total} partial & photo resumes
                      {aiProgress.resolved > 0 && ` • ${aiProgress.resolved} responses received`}
                    </p>
                  </div>
                </div>
                <div className="ai-banner-controls">
                  <div className="ai-mini-progress-bar">
                    <div 
                      className="ai-mini-progress-fill" 
                      style={{ width: `${Math.round((aiProgress.current / (aiProgress.total || 1)) * 100)}%` }}
                    />
                  </div>
                  <button type="button" className="btn-stop-ai" onClick={handleStopAi}>
                    Stop
                  </button>
                </div>
              </div>
            ) : missingCompulsoryCount > 0 ? (
              <div className="ai-callout-banner">
                <div className="ai-callout-content">
                  <div className="ai-callout-icon">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4>
                      {missingCompulsoryCount} Resume{missingCompulsoryCount > 1 ? 's' : ''} Missing Name or Phone
                    </h4>
                    <p>
                      Send only these {missingCompulsoryCount} resumes (including scanned/photos) to AI. You can review the found values before filling.
                    </p>
                  </div>
                </div>
                <div className="ai-callout-actions">
                  <button
                    type="button"
                    className="btn-ai-primary"
                    onClick={() => runAiRefinementQueue(candidates)}
                  >
                    <Sparkles size={16} />
                    Extract {missingCompulsoryCount} with AI
                  </button>
                </div>
              </div>
            ) : aiRefinedCount > 0 ? (
              <div className="ai-success-banner">
                <CheckCircle2 size={18} className="text-emerald" />
                <span>All resumes complete! <strong>{aiRefinedCount}</strong> candidate{aiRefinedCount > 1 ? 's were' : ' was'} successfully refined by AI.</span>
              </div>
            ) : null}
          </div>
        )}

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

            {/* Missing Name / Phone Stat Card */}
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
            onSingleAiRefine={handleSingleAiRefine}
            onBatchAiRefine={() => runAiRefinementQueue(candidates)}
            isAiProcessing={isAiProcessing}
            aiProgress={aiProgress}
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

      {/* AI Review & Fill Confirmation Modal */}
      <AiReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        proposals={reviewProposals}
        onConfirmApply={handleConfirmApplyProposals}
      />
    </div>
  );
}
