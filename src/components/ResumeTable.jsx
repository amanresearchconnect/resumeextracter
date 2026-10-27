import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Copy, 
  FileSpreadsheet, 
  FileCode, 
  Trash2, 
  Eye, 
  Check, 
  Mail, 
  Phone, 
  User, 
  MapPin,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { exportToExcel, exportToCsv, exportToJson, copyAllEmails, copyAllPhones } from '../utils/exporter';

export default function ResumeTable({ candidates, onUpdateCandidate, onDeleteCandidate, onClearAll, onSelectCandidate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, complete, partial, error
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [copyFeedback, setCopyFeedback] = useState(null);

  // Filter and search logic
  const filteredCandidates = candidates.filter(candidate => {
    // Status filter
    if (statusFilter === 'complete' && candidate.status !== 'complete') return false;
    if (statusFilter === 'partial' && candidate.status !== 'partial') return false;
    if (statusFilter === 'missing_any' && (candidate.name && candidate.email && candidate.phone && candidate.location)) return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (candidate.name && candidate.name.toLowerCase().includes(q)) ||
      (candidate.email && candidate.email.toLowerCase().includes(q)) ||
      (candidate.phone && candidate.phone.toLowerCase().includes(q)) ||
      (candidate.location && candidate.location.toLowerCase().includes(q)) ||
      (candidate.fileName && candidate.fileName.toLowerCase().includes(q))
    );
  });

  const handleCellChange = (id, field, value) => {
    onUpdateCandidate(id, { [field]: value });
  };

  const handleCopy = async (text, label) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopyFeedback(`${label} copied!`);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleBatchCopyEmails = async () => {
    const count = await copyAllEmails(filteredCandidates);
    setCopyFeedback(`Copied ${count} email(s) to clipboard!`);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleBatchCopyPhones = async () => {
    const count = await copyAllPhones(filteredCandidates);
    setCopyFeedback(`Copied ${count} phone number(s) to clipboard!`);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  return (
    <div className="table-wrapper-card">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="search-group">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search candidates by name, email, phone, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} className="filter-icon" />
          <select
            className="select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Candidates ({candidates.length})</option>
            <option value="complete">Complete (All 4 Fields)</option>
            <option value="partial">Partial / Missing Fields</option>
            <option value="missing_any">Needs Review</option>
          </select>
        </div>

        <div className="table-actions">
          <button 
            type="button"
            className="btn-action btn-excel"
            onClick={() => exportToExcel(filteredCandidates)}
            title="Download formatted Excel sheet"
          >
            <FileSpreadsheet size={16} />
            Export Excel (.xlsx)
          </button>

          <button 
            type="button"
            className="btn-action"
            onClick={() => exportToCsv(filteredCandidates)}
            title="Download CSV"
          >
            <Download size={16} />
            CSV
          </button>

          <button 
            type="button"
            className="btn-action"
            onClick={handleBatchCopyEmails}
            title="Copy all candidate emails for quick sending"
          >
            <Copy size={16} />
            Copy Emails
          </button>

          <button 
            type="button"
            className="btn-action"
            onClick={handleBatchCopyPhones}
            title="Copy all phone numbers"
          >
            <Phone size={16} />
            Copy Phones
          </button>

          <button 
            type="button"
            className="btn-action btn-danger"
            onClick={onClearAll}
            title="Clear all extracted entries"
          >
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </div>

      {copyFeedback && (
        <div className="toast-notification">
          <Check size={16} /> {copyFeedback}
        </div>
      )}

      {/* Table Data */}
      <div className="table-scroll-container">
        <table className="candidate-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Candidate Name</th>
              <th>Phone Number</th>
              <th>Email Address</th>
              <th>Location</th>
              <th>Resume File</th>
              <th>Status</th>
              <th style={{ textAlign: 'center', width: '125px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-table-state">
                  <div className="empty-state-content">
                    <p>No candidates match your current filter or search query.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCandidates.map((c, index) => (
                <tr key={c.id} className={`table-row ${c.status}`}>
                  <td className="row-index">{index + 1}</td>

                  {/* Name Cell */}
                  <td className="cell-editable" title="Click to edit name">
                    <div className="cell-content">
                      <User size={14} className="cell-icon" />
                      <input
                        type="text"
                        className="inline-input"
                        value={c.name}
                        placeholder="Candidate Name"
                        onChange={(e) => handleCellChange(c.id, 'name', e.target.value)}
                      />
                    </div>
                  </td>

                  {/* Phone Cell */}
                  <td className="cell-editable" title="Click to edit phone">
                    <div className="cell-content">
                      <Phone size={14} className="cell-icon" />
                      <input
                        type="text"
                        className="inline-input"
                        value={c.phone}
                        placeholder="Phone Number"
                        onChange={(e) => handleCellChange(c.id, 'phone', e.target.value)}
                      />
                      {c.phone && (
                        <button
                          type="button"
                          className="btn-icon-cell"
                          onClick={() => handleCopy(c.phone, 'Phone')}
                          title="Copy phone"
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Email Cell */}
                  <td className="cell-editable" title="Click to edit email">
                    <div className="cell-content">
                      <Mail size={14} className="cell-icon" />
                      <input
                        type="email"
                        className="inline-input"
                        value={c.email}
                        placeholder="Email Address"
                        onChange={(e) => handleCellChange(c.id, 'email', e.target.value)}
                      />
                      {c.email && (
                        <>
                          <button
                            type="button"
                            className="btn-icon-cell"
                            onClick={() => handleCopy(c.email, 'Email')}
                            title="Copy email"
                          >
                            <Copy size={12} />
                          </button>
                          <a
                            href={`mailto:${c.email}`}
                            className="btn-icon-cell"
                            title="Open in Mail client"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Location Cell */}
                  <td className="cell-editable" title="Click to edit location">
                    <div className="cell-content">
                      <MapPin size={14} className="cell-icon" />
                      <input
                        type="text"
                        className="inline-input"
                        value={c.location}
                        placeholder="Location"
                        onChange={(e) => handleCellChange(c.id, 'location', e.target.value)}
                      />
                    </div>
                  </td>

                  {/* File Name & Direct Open Link */}
                  <td className="file-cell">
                    <div className="file-cell-wrapper">
                      <span className="file-badge">{c.fileType}</span>
                      <button
                        type="button"
                        className="btn-file-open"
                        onClick={() => onSelectCandidate(c)}
                        title={`Click to preview ${c.fileName} inside site`}
                      >
                        {c.fileName}
                      </button>
                      {c.fileUrl && (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-icon-cell file-external-link"
                          title="Open resume in new tab"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td>
                    {c.status === 'complete' ? (
                      <span className="badge badge-success">
                        <Check size={12} /> Complete
                      </span>
                    ) : c.status === 'partial' ? (
                      <span className="badge badge-warning">
                        <AlertCircle size={12} /> Partial
                      </span>
                    ) : (
                      <span className="badge badge-error">
                        <AlertCircle size={12} /> Review
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="cell-actions">
                    {c.fileUrl && (
                      <a
                        href={c.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon-action"
                        title="Open original resume document in new browser tab"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-icon-action"
                      onClick={() => onSelectCandidate(c)}
                      title="Preview resume document & details"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-action danger"
                      onClick={() => onDeleteCandidate(c.id)}
                      title="Remove candidate"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="table-footer">
        <span>Showing <strong>{filteredCandidates.length}</strong> of <strong>{candidates.length}</strong> resumes extracted</span>
        <span className="keyboard-tip">Tip: Click into any cell to edit details before exporting</span>
      </div>
    </div>
  );
}
