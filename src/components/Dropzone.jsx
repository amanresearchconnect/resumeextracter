import React, { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { createSampleFiles } from '../utils/sampleData';

export default function Dropzone({ onFilesSelected, isProcessing, progress }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isProcessing) return;

    const files = Array.from(e.dataTransfer.files).filter(file => {
      const ext = file.name.toLowerCase();
      return ext.endsWith('.pdf') || ext.endsWith('.docx') || ext.endsWith('.doc') || ext.endsWith('.txt');
    });

    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      // Reset input value so re-selecting same files triggers change
      e.target.value = '';
    }
  };

  const handleLoadSamples = () => {
    if (isProcessing) return;
    const sampleFiles = createSampleFiles();
    onFilesSelected(sampleFiles);
  };

  return (
    <div className="upload-container">
      <div
        className={`dropzone ${isDragOver ? 'drag-over' : ''} ${isProcessing ? 'processing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          disabled={isProcessing}
        />

        <div className="dropzone-content">
          <div className="dropzone-icon-wrapper">
            {isProcessing ? (
              <Loader2 className="dropzone-icon spinning" size={44} />
            ) : (
              <Upload className="dropzone-icon" size={44} />
            )}
          </div>

          <h3 className="dropzone-title">
            {isProcessing ? 'Extracting Information...' : 'Drop your resumes here, or browse files'}
          </h3>

          <p className="dropzone-subtitle">
            Upload multiple files at once. Supports <strong>PDF</strong>, <strong>DOCX</strong>, and <strong>TXT</strong>.
          </p>

          <div className="file-format-tags">
            <span className="format-tag">.PDF</span>
            <span className="format-tag">.DOCX</span>
            <span className="format-tag">.TXT</span>
            <span className="privacy-badge">🔒 100% Client-Side & Private</span>
          </div>
        </div>

        {isProcessing && (
          <div className="progress-bar-container" onClick={(e) => e.stopPropagation()}>
            <div className="progress-info">
              <span>Processing file {progress.current} of {progress.total}...</span>
              <span className="progress-pct">{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="upload-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          <FileText size={16} />
          Select Files from Computer
        </button>

        <button
          type="button"
          className="btn-sample"
          onClick={handleLoadSamples}
          disabled={isProcessing}
          title="Try out the parser instantly with pre-packaged resumes"
        >
          <Sparkles size={16} />
          Load 5 Sample Resumes
        </button>
      </div>
    </div>
  );
}
