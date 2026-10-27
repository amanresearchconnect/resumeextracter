/**
 * Helper to open candidate resume directly in a new browser tab.
 * Supports PDF, DOCX (rendered nicely via HTML preview), TXT, and raw text.
 */
export function openResumeInNewTab(candidate) {
  if (!candidate) return;

  const fileName = (candidate.fileName || '').toLowerCase();

  // 1. PDF files: open PDF object URL directly in new tab (native browser PDF viewer)
  if (fileName.endsWith('.pdf')) {
    if (candidate.fileUrl) {
      window.open(candidate.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (candidate.fileData) {
      const blob = new Blob([candidate.fileData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  // 2. DOCX / DOC files with HTML preview: render formatted resume directly in a new tab
  if (candidate.htmlPreview) {
    const htmlPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(candidate.fileName || 'Resume Document')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0b0f19;
      color: #1e293b;
      line-height: 1.6;
      padding: 32px 16px;
      min-height: 100vh;
    }
    .resume-paper {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .resume-topbar {
      background: #0f172a;
      color: #ffffff;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      border-bottom: 2px solid #334155;
    }
    .resume-title {
      font-weight: 600;
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .doc-badge {
      background: #6366f1;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .resume-content {
      padding: 40px 48px;
      font-size: 15px;
    }
    .resume-content h1, .resume-content h2, .resume-content h3 {
      color: #0f172a;
      margin-top: 1.2em;
      margin-bottom: 0.5em;
    }
    .resume-content p {
      margin-bottom: 0.8em;
    }
    .resume-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .resume-content th, .resume-content td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    .resume-content th {
      background: #f1f5f9;
    }
    @media print {
      body { background: white; padding: 0; }
      .resume-paper { box-shadow: none; border: none; }
      .resume-topbar { display: none; }
    }
  </style>
</head>
<body>
  <div class="resume-paper">
    <div class="resume-topbar">
      <span class="resume-title">📄 ${escapeHtml(candidate.fileName || 'Resume')}</span>
      <span class="doc-badge">${escapeHtml(candidate.fileType || 'DOCX')}</span>
    </div>
    <div class="resume-content">
      ${candidate.htmlPreview}
    </div>
  </div>
</body>
</html>
    `;
    const blob = new Blob([htmlPage], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    return;
  }

  // 3. Fallback to existing file object URL
  if (candidate.fileUrl) {
    window.open(candidate.fileUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // 4. Fallback to raw text preview in new tab
  if (candidate.rawText) {
    const textBlob = new Blob([candidate.rawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(textBlob);
    window.open(url, '_blank');
    return;
  }

  alert('Unable to open resume file.');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
