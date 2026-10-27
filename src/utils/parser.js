import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Common stop words / job titles to avoid mistakenly identifying as candidate names
const TITLE_AND_HEADER_STOPWORDS = new Set([
  'resume', 'curriculum', 'vitae', 'cv', 'profile', 'summary', 'contact', 'contacts',
  'personal', 'details', 'objective', 'experience', 'education', 'skills', 'projects',
  'certifications', 'work', 'history', 'employment', 'about', 'me', 'page', 'portfolio',
  'engineer', 'developer', 'designer', 'manager', 'lead', 'architect', 'specialist',
  'consultant', 'analyst', 'intern', 'fullstack', 'frontend', 'backend', 'software',
  'data', 'science', 'scientist', 'devops', 'product', 'marketing', 'sales', 'student'
]);

// Top global cities, regions, and countries for location matching
const CITIES = [
  'new york', 'san francisco', 'los angeles', 'chicago', 'seattle', 'austin', 'boston',
  'atlanta', 'dallas', 'houston', 'denver', 'san diego', 'san jose', 'washington dc',
  'london', 'manchester', 'birmingham', 'edinburgh', 'dublin', 'amsterdam', 'berlin',
  'munich', 'frankfurt', 'paris', 'madrid', 'barcelona', 'rome', 'milan', 'zurich',
  'vancouver', 'toronto', 'montreal', 'calgary', 'ottawa', 'sydney', 'melbourne',
  'brisbane', 'singapore', 'tokyo', 'dubai', 'abu dhabi', 'riyadh', 'tel aviv',
  'bengaluru', 'bangalore', 'mumbai', 'delhi', 'new delhi', 'hyderabad', 'pune',
  'chennai', 'gurgaon', 'gurugram', 'noida', 'kolkata', 'ahmedabad', 'jaipur', 'kochi',
  'indore', 'chandigarh', 'bhopal', 'lucknow', 'nagpur', 'surat', 'visakhapatnam'
];

const REGIONS_AND_COUNTRIES = [
  'united states', 'usa', 'united kingdom', 'uk', 'canada', 'germany', 'france',
  'australia', 'india', 'netherlands', 'ireland', 'switzerland', 'uae', 'singapore',
  'japan', 'california', 'texas', 'new york', 'washington', 'florida', 'massachusetts',
  'ontario', 'british columbia', 'quebec', 'karnataka', 'maharashtra', 'tamil nadu',
  'telangana', 'delhi ncr', 'haryana', 'uttar pradesh', 'gujarat', 'kerala'
];

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]);

/**
 * Extract raw text from PDF file using PDF.js
 */
export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let lastY;
    let pageText = '';

    for (const item of textContent.items) {
      if (!item.str) continue;
      // Detect vertical spacing to preserve line breaks
      if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += '\n';
      } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
        pageText += ' ';
      }
      pageText += item.str;
      lastY = item.transform[5];
    }
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}

/**
 * Extract raw text and optional HTML preview from DOCX file using Mammoth.js
 */
export async function extractDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const textResult = await mammoth.extractRawText({ arrayBuffer: arrayBuffer.slice(0) });
  let html = null;
  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    html = htmlResult.value;
  } catch (e) {
    console.warn('Failed to generate HTML preview for docx', e);
  }
  return { text: textResult.value.trim(), html };
}

/**
 * Extract raw text from TXT file
 */
export async function extractTextFromTxt(file) {
  const text = await file.text();
  return text.trim();
}

/**
 * Unified text extractor based on file extension
 */
export async function extractContent(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    const text = await extractTextFromPdf(file);
    return { text, html: null };
  } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
    return await extractDocx(file);
  } else {
    const text = await extractTextFromTxt(file);
    return { text, html: null };
  }
}


/**
 * Clean and normalize text
 */
function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/g, ' ')
    .trim();
}

/**
 * Extract Email
 */
export function extractEmail(text) {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const matches = text.match(emailRegex);
  if (!matches || matches.length === 0) return null;

  // Filter out dummy/generic placeholders
  const filtered = matches.filter(e => {
    const lower = e.toLowerCase();
    return !lower.includes('example.com') && 
           !lower.includes('domain.com') && 
           !lower.includes('yoursite.com') &&
           !lower.endsWith('.png') &&
           !lower.endsWith('.jpg');
  });

  return filtered.length > 0 ? filtered[0] : matches[0];
}

/**
 * Extract Phone Number
 */
export function extractPhone(text) {
  // Common phone patterns:
  // +1 (555) 000-0000 | +91 98765 43210 | +91-9876543210 | (555) 123-4567 | 9876543210 | 0412 345 678
  const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}(?:[\s.-]?\d{1,4})?/g;
  const matches = text.match(phoneRegex);
  if (!matches) return null;

  for (const match of matches) {
    const cleaned = match.trim();
    // Count raw digits
    const digitsOnly = cleaned.replace(/\D/g, '');
    
    // Valid phone numbers typically have 10 to 14 digits (or 7-15)
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      // Avoid dates (e.g. 20202024 or 01012022)
      if (digitsOnly.startsWith('201') || digitsOnly.startsWith('202') || digitsOnly.startsWith('199')) {
        if (digitsOnly.length <= 8) continue;
      }
      // Avoid repetitive digits like 0000000000 or 1111111111
      if (/^(\d)\1+$/.test(digitsOnly)) continue;

      return cleaned;
    }
  }

  return null;
}

/**
 * Extract Location
 */
export function extractLocation(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Look for explicit location labels in the first 25 lines
  const headerLines = lines.slice(0, 25);
  for (const line of headerLines) {
    const labelMatch = line.match(/(?:location|address|residing in|based in|residence|city)\s*[:|-]\s*([^\n;•|]+)/i);
    if (labelMatch && labelMatch[1]) {
      const loc = labelMatch[1].trim();
      if (loc.length > 2 && loc.length < 60) {
        return loc.replace(/^[,\s-]+|[,\s-]+$/g, '');
      }
    }
  }

  // 2. Look for "City, State/Country" or "City, State Zip" patterns in header
  for (const line of headerLines) {
    // US City, State Zip pattern: e.g. "Austin, TX 78701" or "San Francisco, CA"
    const usPattern = /([A-Z][a-zA-Z\s.-]+),\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?/g;
    const usMatch = usPattern.exec(line);
    if (usMatch && US_STATE_CODES.has(usMatch[2].toUpperCase())) {
      const cityName = usMatch[1].trim();
      if (cityName.length > 2 && cityName.split(' ').length <= 3) {
        return `${cityName}, ${usMatch[2].toUpperCase()}`;
      }
    }

    // Match known cities or regions
    const lowerLine = line.toLowerCase();
    for (const city of CITIES) {
      if (lowerLine.includes(city)) {
        // Return full formatted line or city + region if available
        for (const reg of REGIONS_AND_COUNTRIES) {
          if (lowerLine.includes(reg)) {
            const formattedCity = city.charAt(0).toUpperCase() + city.slice(1);
            const formattedReg = reg.charAt(0).toUpperCase() + reg.slice(1);
            return `${formattedCity}, ${formattedReg}`;
          }
        }
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }

    for (const reg of REGIONS_AND_COUNTRIES) {
      if (lowerLine.includes(reg)) {
        return reg.charAt(0).toUpperCase() + reg.slice(1);
      }
    }
  }

  return null;
}

/**
 * Extract Candidate Name
 */
export function extractName(text, filename = '') {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Look in the first 8 non-empty lines
  const topLines = lines.slice(0, 8);

  for (const line of topLines) {
    // Skip lines with email, urls, phone digits, or obvious metadata
    if (line.includes('@') || /https?:\/\/|www\.|linkedin|github/i.test(line)) continue;
    if (/\d{4,}/.test(line)) continue; // has long numbers
    if (/[|•·]/.test(line)) {
      // Sometimes "John Doe | Software Engineer | Austin, TX"
      const parts = line.split(/[|•·]/).map(p => p.trim());
      for (const part of parts) {
        if (isValidNameCandidate(part)) return cleanName(part);
      }
      continue;
    }

    if (isValidNameCandidate(line)) {
      return cleanName(line);
    }
  }

  // Fallback: derive name from filename (e.g., "John_Doe_Resume_2024.pdf" -> "John Doe")
  if (filename) {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const cleanFilename = nameWithoutExt
      .replace(/[-_.]/g, ' ')
      .replace(/\b(resume|cv|curriculum|vitae|profile|202[0-9]|201[0-9]|updated|final|doc)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (isValidNameCandidate(cleanFilename)) {
      return cleanName(cleanFilename);
    }
  }

  return null;
}

/**
 * Validate whether a token/string looks like a person's name
 */
function isValidNameCandidate(str) {
  if (!str) return false;
  const trimmed = str.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  // Name should typically be 2 to 4 words (e.g., "Alex Doe", "Mary Jane Watson")
  if (words.length < 2 || words.length > 4) return false;

  // Check that every word is purely alphabetic (with optional dot for initial or hyphen)
  for (const word of words) {
    if (!/^[A-Za-z.-]+$/.test(word)) return false;
    const lower = word.toLowerCase();
    if (TITLE_AND_HEADER_STOPWORDS.has(lower)) return false;
  }

  // Check casing: should be Title Case or ALL CAPS
  const isAllUpper = trimmed === trimmed.toUpperCase();
  const isTitleCase = words.every(w => /^[A-Z][a-z.-]*$/.test(w));

  return isAllUpper || isTitleCase;
}

function cleanName(str) {
  // Convert ALL CAPS to Title Case for pleasant presentation
  const words = str.trim().split(/\s+/);
  return words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Master parser function for a resume file
 */
export async function parseResume(file) {
  const startTime = performance.now();
  let rawText = '';
  let htmlPreview = null;
  let fileData = null;
  let error = null;

  try {
    const content = await extractContent(file);
    rawText = normalizeText(content.text);
    htmlPreview = content.html;
  } catch (err) {
    console.error(`Error reading ${file.name}:`, err);
    error = err.message || 'Failed to read file contents';
  }

  // Pre-load raw ArrayBuffer for PDF files to guarantee zero-fail canvas rendering
  try {
    if (file && typeof file.arrayBuffer === 'function') {
      fileData = await file.arrayBuffer();
    }
  } catch (err) {
    console.warn('Could not read arrayBuffer for file:', err);
  }

  // Create an object URL so the user can open and view the resume directly in the browser
  let fileUrl = '';
  try {
    if (fileData && file.name.toLowerCase().endsWith('.pdf')) {
      const blob = new Blob([fileData], { type: 'application/pdf' });
      fileUrl = URL.createObjectURL(blob);
    } else if (file instanceof Blob || file instanceof File) {
      fileUrl = URL.createObjectURL(file);
    }
  } catch (err) {
    console.warn('Could not generate object URL for file:', err);
  }

  const name = extractName(rawText, file.name);
  const email = extractEmail(rawText);
  const phone = extractPhone(rawText);
  const location = extractLocation(rawText);

  const durationMs = Math.round(performance.now() - startTime);

  // Determine parsing completeness score
  const foundCount = [name, email, phone, location].filter(Boolean).length;
  let status = 'complete';
  if (error) {
    status = 'error';
  } else if (foundCount === 4) {
    status = 'complete';
  } else if (foundCount >= 2) {
    status = 'partial';
  } else {
    status = 'low_confidence';
  }

  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    fileName: file.name,
    fileSize: (file.size / 1024).toFixed(1) + ' KB',
    fileType: file.name.split('.').pop().toUpperCase(),
    fileObj: file,
    fileData,
    fileUrl,
    htmlPreview,
    name: name || '',
    email: email || '',
    phone: phone || '',
    location: location || '',
    rawText,
    durationMs,
    status,
    error
  };
}
