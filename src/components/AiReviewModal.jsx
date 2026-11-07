import React, { useState } from 'react';
import { X, Sparkles, Check, User, Phone, Mail, MapPin, FileText } from 'lucide-react';

export default function AiReviewModal({
  isOpen,
  onClose,
  proposals,
  onConfirmApply
}) {
  const [editedProposals, setEditedProposals] = useState(() => proposals || []);

  // Sync state if proposals change
  React.useEffect(() => {
    setEditedProposals(proposals || []);
  }, [proposals]);

  if (!isOpen || !editedProposals || editedProposals.length === 0) return null;

  const handleFieldChange = (id, field, value) => {
    setEditedProposals(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          extracted: {
            ...item.extracted,
            [field]: value
          }
        };
      }
      return item;
    }));
  };

  const handleApply = () => {
    onConfirmApply(editedProposals);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card ai-review-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="ai-icon-bubble">
              <Sparkles size={20} />
            </div>
            <div>
              <h3>AI Extracted Review ({editedProposals.length} Resumes)</h3>
              <p className="modal-subtitle">
                Review the contact details found by OpenAI. Click <strong>Apply & Fill</strong> to insert them into your table.
              </p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Proposals List */}
        <div className="modal-body-content review-proposals-list">
          {editedProposals.map((item, idx) => (
            <div key={item.id} className="proposal-card">
              <div className="proposal-header">
                <div className="proposal-file-info">
                  <span className="proposal-index">#{idx + 1}</span>
                  <FileText size={16} className="text-muted" />
                  <span className="proposal-filename" title={item.fileName}>
                    {item.fileName}
                  </span>
                  <span className="file-badge">{item.fileType || 'PDF'}</span>
                </div>
                {item.isFixed && (
                  <span className="badge badge-ai">
                    <Sparkles size={11} /> Ready to Fill
                  </span>
                )}
              </div>

              <div className="proposal-grid">
                {/* Name Field */}
                <div className="proposal-field">
                  <label className="field-label">
                    <User size={13} /> Name
                  </label>
                  <input
                    type="text"
                    className={`proposal-input ${item.extracted.name ? 'has-value' : 'is-empty'}`}
                    placeholder="Candidate Name"
                    value={item.extracted.name}
                    onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                  />
                </div>

                {/* Phone Field */}
                <div className="proposal-field">
                  <label className="field-label">
                    <Phone size={13} /> Phone
                  </label>
                  <input
                    type="text"
                    className={`proposal-input ${item.extracted.phone ? 'has-value' : 'is-empty'}`}
                    placeholder="Phone Number"
                    value={item.extracted.phone}
                    onChange={(e) => handleFieldChange(item.id, 'phone', e.target.value)}
                  />
                </div>

                {/* Email Field */}
                <div className="proposal-field">
                  <label className="field-label">
                    <Mail size={13} /> Email
                  </label>
                  <input
                    type="email"
                    className={`proposal-input ${item.extracted.email ? 'has-value' : 'is-empty'}`}
                    placeholder="Email Address"
                    value={item.extracted.email}
                    onChange={(e) => handleFieldChange(item.id, 'email', e.target.value)}
                  />
                </div>

                {/* Location Field */}
                <div className="proposal-field">
                  <label className="field-label">
                    <MapPin size={13} /> Location
                  </label>
                  <input
                    type="text"
                    className={`proposal-input ${item.extracted.location ? 'has-value' : 'is-empty'}`}
                    placeholder="City, State"
                    value={item.extracted.location}
                    onChange={(e) => handleFieldChange(item.id, 'location', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel / Discard
          </button>
          <button type="button" className="btn-apply-primary" onClick={handleApply}>
            <Check size={16} /> Apply & Fill Values ({editedProposals.length})
          </button>
        </div>
      </div>
    </div>
  );
}
