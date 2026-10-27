import * as XLSX from 'xlsx';

/**
 * Format data for standard export
 */
function prepareDataForExport(candidates) {
  return candidates.map((c, index) => ({
    '#': index + 1,
    'Candidate Name': c.name || 'N/A',
    'Phone Number': c.phone || 'N/A',
    'Email Address': c.email || 'N/A',
    'Location': c.location || 'N/A',
    'Source File': c.fileName,
    'Status': c.status.toUpperCase()
  }));
}

/**
 * Export candidates list to an Excel (.xlsx) file
 */
export function exportToExcel(candidates, fileName = 'extracted_candidates.xlsx') {
  if (!candidates || candidates.length === 0) return;

  const data = prepareDataForExport(candidates);
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set nice column widths
  worksheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 25 }, // Name
    { wch: 20 }, // Phone
    { wch: 30 }, // Email
    { wch: 25 }, // Location
    { wch: 28 }, // Source File
    { wch: 12 }  // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export candidates list to CSV
 */
export function exportToCsv(candidates, fileName = 'extracted_candidates.csv') {
  if (!candidates || candidates.length === 0) return;

  const data = prepareDataForExport(candidates);
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export candidate details to JSON
 */
export function exportToJson(candidates, fileName = 'extracted_candidates.json') {
  if (!candidates || candidates.length === 0) return;

  const sanitized = candidates.map(({ id, rawText, ...rest }) => rest);
  const jsonString = JSON.stringify(sanitized, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy all emails to clipboard (comma separated, ready for email client)
 */
export async function copyAllEmails(candidates) {
  const emails = candidates
    .map(c => c.email)
    .filter(Boolean);

  const uniqueEmails = [...new Set(emails)];
  if (uniqueEmails.length === 0) return 0;

  await navigator.clipboard.writeText(uniqueEmails.join(', '));
  return uniqueEmails.length;
}

/**
 * Copy all phone numbers to clipboard (comma separated)
 */
export async function copyAllPhones(candidates) {
  const phones = candidates
    .map(c => c.phone)
    .filter(Boolean);

  const uniquePhones = [...new Set(phones)];
  if (uniquePhones.length === 0) return 0;

  await navigator.clipboard.writeText(uniquePhones.join(', '));
  return uniquePhones.length;
}
