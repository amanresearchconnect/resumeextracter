import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Copy, 
  FileSpreadsheet, 
  Trash2, 
  Eye, 
  Check, 
  Mail, 
  Phone, 
  User, 
  MapPin,
  ExternalLink
} from 'lucide-react';
import { exportToExcel, exportToCsv, copyAllEmails, copyAllPhones } from '../utils/exporter';
import { openResumeInNewTab } from '../utils/fileViewer';

export default function ResumeTable({ 
  candidates, 
  onUpdateCandidate, 
  onDeleteCandidate, 
  onClearAll, 
  onSelectCandidate,
  statusFilter,
  setStatusFilter
}) {
  const [internalFilter, setInternalFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(null);

  const activeFilter = statusFilter !== undefined ? statusFilter : internalFilter;
  const setActiveFilter = setStatusFilter || setInternalFilter;

  // Compulsory check: Name or Phone missing
  const isMissingCompulsory = (c) => !c.name?.trim() || !c.phone?.trim();
  // Any field missing check: Name, Phone, Email, or Location missing
  const isMissingAny = (c) => !c.name?.trim() || !c.phone?.trim() || !c.email?.trim() || !c.location?.trim();

  // Filter and search logic
  const filteredCandidates = candidates.filter(candidate => {
    if (activeFilter === 'missing_compulsory' && !isMissingCompulsory(candidate)) return false;
    if (activeFilter === 'missing_any' && !isMissingAny(candidate)) return false;
    if (activeFilter === 'complete' && candidate.status !== 'complete') return false;

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

  const totalCount = candidates.length;
  const missingCompulsoryCount = candidates.filter(isMissingCompulsory).length;
  const missingAnyCount = candidates.filter(isMissingAny).length;
  const completeCount = candidates.filter(c => c.status === 'complete').length;

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
      {/* Table Toolbar - Single Clean Filter Section */}
      <div className="table-toolbar">
        <div className="search-group">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, phone, email, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} className="filter-icon" />
          <select
            className="select-filter"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="all">All Resumes ({totalCount})</option>
            <option value="missing_compulsory">Missing Name or Phone ({missingCompulsoryCount})</option>
            <option value="missing_any">Any Field Missing ({missingAnyCount})</option>
            <option value="complete">Complete Resumes ({completeCount})</option>
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
            Excel
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
            title="Copy all candidate emails"
          >
            <Copy size={16} />
            Emails
          </button>

          <button 
            type="button"
            className="btn-action"
            onClick={handleBatchCopyPhones}
            title="Copy all phone numbers"
          >
            <Phone size={16} />
            Phones
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
              <th style={{ textAlign: 'center', width: '110px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-table-state">
                  <div className="empty-state-content">
                    <p>No candidates match the selected filter or search.</p>
                    {activeFilter !== 'all' && (
                      <button 
                        type="button" 
                        className="btn-action" 
                        style={{ marginTop: '10px' }}
                        onClick={() => setActiveFilter('all')}
                      >
                        Show All Resumes
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCandidates.map((c, index) => {
                const isComplete = c.status === 'complete';
                const hasMissingCompulsory = isMissingCompulsory(c);

                return (
                  <tr key={c.id} className="table-row">
                    <td className="row-index">{index + 1}</td>

                    {/* Name Cell - Clean & Editable */}
                    <td className="cell-editable">
                      <div className="cell-content">
                        <User size={14} className="cell-icon" />
                        <input
                          type="text"
                          className="inline-input"
                          value={c.name}
                          placeholder="Name"
                          onChange={(e) => handleCellChange(c.id, 'name', e.target.value)}
                        />
                      </div>
                    </td>

                    {/* Phone Cell - Clean & Editable */}
                    <td className="cell-editable">
                      <div className="cell-content">
                        <Phone size={14} className="cell-icon" />
                        <input
                          type="text"
                          className="inline-input"
                          value={c.phone}
                          placeholder="Phone"
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
                    <td className="cell-editable">
                      <div className="cell-content">
                        <Mail size={14} className="cell-icon" />
                        <input
                          type="email"
                          className="inline-input"
                          value={c.email}
                          placeholder="Email"
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
                              title="Open mail client"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Location Cell */}
                    <td className="cell-editable">
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

                    {/* Resume File Cell - CLICK OPENS DIRECTLY IN NEW TAB */}
                    <td className="file-cell">
                      <div className="file-cell-wrapper">
                        <span className="file-badge">{c.fileType}</span>
                        <button
                          type="button"
                          className="btn-file-open"
                          onClick={() => openResumeInNewTab(c)}
                          title={`Click to open ${c.fileName} in a new tab`}
                        >
                          <span className="file-name-text">{c.fileName}</span>
                          <ExternalLink size={12} className="file-external-icon" />
                        </button>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      {isComplete ? (
                        <span className="badge badge-success">
                          <Check size={12} /> Complete
                        </span>
                      ) : hasMissingCompulsory ? (
                        <span className="badge badge-warning">
                          Incomplete
                        </span>
                      ) : (
                        <span className="badge badge-subtle">
                          Partial
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={() => openResumeInNewTab(c)}
                        title="Open resume in new tab"
                      >
                        <ExternalLink size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action"
                        onClick={() => onSelectCandidate(c)}
                        title="Preview text details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action danger"
                        onClick={() => onDeleteCandidate(c.id)}
                        title="Delete entry"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="table-footer">
        <div className="footer-stats">
          <span>Showing <strong>{filteredCandidates.length}</strong> of <strong>{candidates.length}</strong> resumes</span>
          {activeFilter === 'missing_compulsory' && (
            <span className="footer-filter-tag">Filter: Missing Name or Phone</span>
          )}
          {activeFilter === 'missing_any' && (
            <span className="footer-filter-tag">Filter: Any Field Missing</span>
          )}
          {activeFilter === 'complete' && (
            <span className="footer-filter-tag">Filter: Complete Resumes</span>
          )}
        </div>
        <span className="keyboard-tip">
          Click any resume file to open it in a new tab • Edit cells directly
        </span>
      </div>
    </div>
  );
}
