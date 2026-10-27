import React, { useState } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  ExternalLink, 
  Download, 
  Copy,
  Check
} from 'lucide-react';

export default function PreviewModal({ candidate, onClose }) {
  if (!candidate) return null;

  const [copied, setCopied] = useState(false);
  const isPdf = candidate.fileName.toLowerCase().endsWith('.pdf');

  const handleCopyText = async () => {
    if (!candidate.rawText) return;
    await navigator.clipboard.writeText(candidate.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className={`modal-file-icon ${isPdf ? 'pdf-accent' : ''}`}>
              <FileText size={22} />
            </div>
            <div>
              <h3>{candidate.fileName}</h3>
              <span className="file-meta">
                {candidate.fileType} • {candidate.fileSize} • Parsed in {candidate.durationMs}ms
              </span>
            </div>
          </div>

          <div className="modal-header-actions">
            {candidate.fileUrl && (
              <>
                <a
                  href={candidate.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-modal-action-primary"
                  title="Open original resume in a new browser tab"
                >
                  <ExternalLink size={15} />
                  <span>Open in New Tab</span>
                </a>

                <a
                  href={candidate.fileUrl}
                  download={candidate.fileName}
                  className="btn-modal-action"
                  title="Download copy of this resume file"
                >
                  <Download size={15} />
                  <span>Download</span>
                </a>
              </>
            )}

            <button className="btn-close" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 4-Field Extracted Summary (Top Banner) */}
        <div className="modal-extracted-summary">
          <div className="summary-field">
            <span className="summary-label"><User size={13} /> Name</span>
            <span className={`summary-value ${!candidate.name ? 'empty' : ''}`}>
              {candidate.name || 'Not detected'}
            </span>
          </div>

          <div className="summary-field">
            <span className="summary-label"><Phone size={13} /> Phone</span>
            <span className={`summary-value ${!candidate.phone ? 'empty' : ''}`}>
              {candidate.phone || 'Not detected'}
            </span>
          </div>

          <div className="summary-field">
            <span className="summary-label"><Mail size={13} /> Email</span>
            <span className={`summary-value ${!candidate.email ? 'empty' : ''}`}>
              {candidate.email || 'Not detected'}
            </span>
          </div>

          <div className="summary-field">
            <span className="summary-label"><MapPin size={13} /> Location</span>
            <span className={`summary-value ${!candidate.location ? 'empty' : ''}`}>
              {candidate.location || 'Not detected'}
            </span>
          </div>
        </div>

        {/* Extracted Text Preview Section */}
        <div className="modal-raw-section">
          <div className="raw-header">
            <h4>Extracted Text Stream</h4>
            <div className="raw-header-actions">
              <span className="char-count">{candidate.rawText ? candidate.rawText.length : 0} characters</span>
              {candidate.rawText && (
                <button
                  type="button"
                  className="btn-copy-raw"
                  onClick={handleCopyText}
                  title="Copy full text to clipboard"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              )}
            </div>
          </div>
          <div className="raw-text-viewer">
            {candidate.rawText ? (
              <pre>{candidate.rawText}</pre>
            ) : (
              <p className="empty-text">No text content extracted.</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {candidate.fileUrl && (
            <a
              href={candidate.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <ExternalLink size={15} />
              Open Original {candidate.fileType} in New Tab
            </a>
          )}
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
