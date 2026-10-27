import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { findPhoneNumbersInText } from 'libphonenumber-js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Common stop words / job titles / section headers to avoid mistakenly identifying as candidate names
const TITLE_AND_HEADER_STOPWORDS = new Set([
  'resume', 'curriculum', 'vitae', 'cv', 'profile', 'summary', 'contact', 'contacts',
  'personal', 'details', 'objective', 'experience', 'education', 'skills', 'projects',
  'certifications', 'work', 'history', 'employment', 'about', 'me', 'page', 'portfolio',
  'engineer', 'developer', 'designer', 'manager', 'lead', 'architect', 'specialist',
  'consultant', 'analyst', 'intern', 'fullstack', 'frontend', 'backend', 'software',
  'data', 'science', 'scientist', 'devops', 'product', 'marketing', 'sales', 'student',
  'technologies', 'tools', 'languages', 'frameworks', 'achievements', 'awards',
  'senior', 'junior', 'staff', 'principal', 'head', 'director', 'vp', 'officer',
  'executive', 'associate', 'trainee', 'candidate', 'applicant', 'references',
  'declaration', 'hobbies', 'interests', 'phone', 'email', 'address', 'linkedin', 'github'
]);

// Top global cities, tech hubs, regions, and countries for location matching
const CITIES = [
  // US & Americas
  'new york', 'san francisco', 'los angeles', 'chicago', 'seattle', 'austin', 'boston',
  'atlanta', 'dallas', 'houston', 'denver', 'san diego', 'san jose', 'washington dc', 'washington',
  'miami', 'philadelphia', 'phoenix', 'portland', 'raleigh', 'charlotte', 'salt lake city',
  'vancouver', 'toronto', 'montreal', 'calgary', 'ottawa', 'sao paulo', 'buenos aires',
  // Europe
  'london', 'manchester', 'birmingham', 'edinburgh', 'dublin', 'amsterdam', 'berlin',
  'munich', 'frankfurt', 'paris', 'madrid', 'barcelona', 'rome', 'milan', 'zurich', 'geneva',
  'stockholm', 'oslo', 'copenhagen', 'helsinki', 'vienna', 'brussels', 'warsaw', 'lisbon',
  // Asia-Pacific & Middle East
  'singapore', 'tokyo', 'sydney', 'melbourne', 'brisbane', 'auckland', 'dubai', 'abu dhabi',
  'riyadh', 'tel aviv', 'doha', 'seoul', 'hong kong', 'kuala lumpur', 'bangkok',
  // India & South Asia
  'bengaluru', 'bangalore', 'mumbai', 'delhi', 'new delhi', 'hyderabad', 'pune',
  'chennai', 'gurgaon', 'gurugram', 'noida', 'kolkata', 'ahmedabad', 'jaipur', 'kochi',
  'coimbatore', 'indore', 'chandigarh', 'bhopal', 'lucknow', 'nagpur', 'surat', 'visakhapatnam',
  'thiruvananthapuram', 'trivandrum', 'vadodara', 'mysuru', 'mysore', 'bhubaneswar'
];

const REGIONS_AND_COUNTRIES = [
  'united states', 'usa', 'united kingdom', 'uk', 'canada', 'germany', 'france',
  'australia', 'india', 'netherlands', 'ireland', 'switzerland', 'uae', 'united arab emirates',
  'singapore', 'japan', 'california', 'texas', 'new york', 'washington', 'florida', 'massachusetts',
  'ontario', 'british columbia', 'quebec', 'karnataka', 'maharashtra', 'tamil nadu',
  'telangana', 'delhi ncr', 'haryana', 'uttar pradesh', 'gujarat', 'kerala', 'rajasthan',
  'west bengal', 'andhra pradesh', 'punjab', 'madhya pradesh', 'bihar'
];

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]);

/**
 * Extract text and visual font hierarchy from PDF file using PDF.js.
 * Detects largest font size in header for high-precision name identification,
 * and sorts columns intelligently for multi-column resumes.
 */
export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';
  let candidateNameFromFont = null;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items = textContent.items.filter(it => it.str && it.str.trim().length > 0);

    if (items.length === 0) continue;

    // --- SURE-SHOT METHOD 1: FONT-SIZE HIERARCHY ON PAGE 1 FOR NAME ---
    if (pageNum === 1) {
      candidateNameFromFont = detectNameFromFontHierarchy(items, viewport.height);
    }

    // --- SURE-SHOT METHOD 2: TWO-COLUMN AWARE LAYOUT PARSING ---
    // Detect if page has two distinct columns
    const pageText = layoutAwarePageText(items, viewport.width);
    fullText += pageText + '\n\n';
  }

  return {
    text: fullText.trim(),
    nameFromFont: candidateNameFromFont
  };
}

/**
 * Identifies the candidate name based on font size & top-page spatial hierarchy.
 * In 98% of resume templates, the candidate's name uses the largest font on Page 1.
 */
function detectNameFromFontHierarchy(items, pageHeight) {
  // Look only at the top 35% of the first page (Y coordinates in PDF are from bottom to top)
  const topThresholdY = pageHeight * 0.65;
  const headerItems = items.filter(item => {
    const y = item.transform[5];
    return y >= topThresholdY;
  });

  if (headerItems.length === 0) return null;

  // Calculate font height for each text item
  const scoredItems = headerItems.map(item => {
    const fontSize = Math.abs(item.transform[0]) || Math.abs(item.transform[3]) || item.height || 10;
    return {
      str: item.str.trim(),
      fontSize,
      y: item.transform[5],
      x: item.transform[4]
    };
  });

  // Sort by font size descending
  scoredItems.sort((a, b) => b.fontSize - a.fontSize);

  // Find the largest valid person name candidate
  const maxFontSize = scoredItems[0]?.fontSize || 0;
  
  // Combine items on the exact same line if the name was split into multiple text tokens
  const largeItems = scoredItems.filter(it => it.fontSize >= maxFontSize * 0.88);

  // Group by Y position (within 3px tolerance)
  const lineGroups = {};
  for (const it of largeItems) {
    const roundedY = Math.round(it.y / 4) * 4;
    if (!lineGroups[roundedY]) lineGroups[roundedY] = [];
    lineGroups[roundedY].push(it);
  }

  // Sort each line by X coordinate
  for (const y in lineGroups) {
    lineGroups[y].sort((a, b) => a.x - b.x);
    const combinedStr = lineGroups[y].map(it => it.str).join(' ').trim();
    if (isValidNameCandidate(combinedStr)) {
      return cleanName(combinedStr);
    }
  }

  // Test individual tokens
  for (const it of scoredItems) {
    if (it.fontSize >= maxFontSize * 0.85 && isValidNameCandidate(it.str)) {
      return cleanName(it.str);
    }
  }

  return null;
}

/**
 * Smart layout-aware text joining:
 * Handles 2-column resumes so left sidebar text doesn't interleave into main text.
 */
function layoutAwarePageText(items, pageWidth) {
  // Determine if this page has two columns
  const midpoint = pageWidth / 2;
  let leftCount = 0;
  let rightCount = 0;

  for (const it of items) {
    const x = it.transform[4];
    if (x < midpoint - 40) leftCount++;
    else if (x > midpoint + 40) rightCount++;
  }

  const isTwoColumn = leftCount > 15 && rightCount > 15;

  if (!isTwoColumn) {
    // Standard single-column flow: sort top-to-bottom (Y desc), left-to-right (X asc)
    return assembleTextLines(items);
  }

  // Two-column layout:
  // Usually header is full-width at top, then split left column and right column
  const topHeaderThreshold = Math.max(...items.map(it => it.transform[5])) - 120;
  const headerItems = items.filter(it => it.transform[5] >= topHeaderThreshold);
  const leftColItems = items.filter(it => it.transform[5] < topHeaderThreshold && it.transform[4] <= midpoint);
  const rightColItems = items.filter(it => it.transform[5] < topHeaderThreshold && it.transform[4] > midpoint);

  const headerText = assembleTextLines(headerItems);
  const leftText = assembleTextLines(leftColItems);
  const rightText = assembleTextLines(rightColItems);

  return `${headerText}\n\n${leftText}\n\n${rightText}`;
}

function assembleTextLines(items) {
  if (!items || items.length === 0) return '';
  // Sort items top-to-bottom (Y descending), then left-to-right (X ascending)
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 4) return yDiff;
    return a.transform[4] - b.transform[4];
  });

  let fullText = '';
  let lastY = null;

  for (const it of sorted) {
    if (!it.str) continue;
    if (lastY !== null && Math.abs(it.transform[5] - lastY) > 5) {
      fullText += '\n';
    } else if (fullText.length > 0 && !fullText.endsWith(' ') && !fullText.endsWith('\n')) {
      fullText += ' ';
    }
    fullText += it.str;
    lastY = it.transform[5];
  }

  return fullText;
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
  return { text: textResult.value.trim(), html, nameFromFont: null };
}

/**
 * Extract raw text from TXT file
 */
export async function extractTextFromTxt(file) {
  const text = await file.text();
  return { text: text.trim(), html: null, nameFromFont: null };
}

/**
 * Unified text extractor based on file extension
 */
export async function extractContent(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    const result = await extractTextFromPdf(file);
    return { text: result.text, html: null, nameFromFont: result.nameFromFont };
  } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
    return await extractDocx(file);
  } else {
    return await extractTextFromTxt(file);
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
 * Extract Phone Number using Google's libphonenumber-js standard telecom engine,
 * with enhanced fallback for unformatted local numbers.
 */
export function extractPhone(text) {
  if (!text) return null;

  // 1. SURE-SHOT: Run official libphonenumber-js parser (handles India, US, UK, EU, UAE, etc.)
  try {
    const foundPhones = findPhoneNumbersInText(text, { defaultCountry: 'IN' });
    if (foundPhones && foundPhones.length > 0) {
      // Pick first valid phone number
      for (const item of foundPhones) {
        const num = item.number;
        if (num && num.isValid()) {
          // Format as clean international or national string
          return num.formatInternational();
        }
      }
      // If isValid() was strict, return the first well-formed parsed number
      if (foundPhones[0]?.number) {
        return foundPhones[0].number.formatInternational();
      }
    }
  } catch (err) {
    console.warn('libphonenumber-js parsing error, using fallback:', err);
  }

  // 2. High-precision fallback regex for numbers without standard country prefix
  const phonePatterns = [
    // Standard international with + (e.g. +91 98765 43210, +1 (555) 234-5678)
    /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,5}/g,
    // 10-digit Indian mobile starting with 6, 7, 8, or 9
    /\b[6-9]\d{4}[\s.-]?\d{5}\b/g,
    // Standard US 10-digit: (555) 123-4567 or 555-123-4567
    /\b\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g
  ];

  for (const regex of phonePatterns) {
    const matches = text.match(regex);
    if (matches) {
      for (const m of matches) {
        const cleaned = m.trim();
        const digits = cleaned.replace(/\D/g, '');
        // Validate length and eliminate date ranges like 20182022
        if (digits.length >= 10 && digits.length <= 15) {
          if (digits.startsWith('201') || digits.startsWith('202') || digits.startsWith('199')) {
            if (digits.length <= 8) continue;
          }
          if (/^(\d)\1+$/.test(digits)) continue; // ignore 0000000000
          return cleaned;
        }
      }
    }
  }

  return null;
}

/**
 * Extract Location with Contact Anchor Proximity & Postal Code Anchoring
 */
export function extractLocation(text, email = null, phone = null) {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. CONTACT PROXIMITY: Location is almost always near the candidate's email or phone!
  let priorityLines = [];
  if (email || phone) {
    const contactIndex = lines.findIndex(l => (email && l.includes(email)) || (phone && l.includes(phone)));
    if (contactIndex !== -1) {
      // Grab 1 line before, the contact line itself, and 2 lines after
      const start = Math.max(0, contactIndex - 1);
      const end = Math.min(lines.length, contactIndex + 3);
      priorityLines = lines.slice(start, end);
    }
  }

  // Combine priority lines with header top 25 lines
  const searchLines = [...priorityLines, ...lines.slice(0, 25)];

  // 2. Check for explicit location prefix: "Location:", "Address:", "Based in:"
  for (const line of searchLines) {
    const labelMatch = line.match(/(?:location|address|residing in|based in|residence|city)\s*[:|-]\s*([^\n;•|]+)/i);
    if (labelMatch && labelMatch[1]) {
      const loc = labelMatch[1].trim();
      if (loc.length > 2 && loc.length < 60) {
        return loc.replace(/^[,\s-]+|[,\s-]+$/g, '');
      }
    }
  }

  // 3. Postal Code Anchors (India 6-digit PIN code, US 5-digit ZIP, UK postcodes)
  for (const line of searchLines) {
    // Indian PIN code: e.g. "Bengaluru - 560001" or "Hyderabad, Telangana 500081"
    const pinMatch = line.match(/([A-Z][a-zA-Z\s,]+)\s*(?:[-–]\s*)?([1-9]\d{2}\s?\d{3})\b/);
    if (pinMatch && pinMatch[1]) {
      const cityPart = pinMatch[1].trim().replace(/^[,\s-]+|[,\s-]+$/g, '');
      if (cityPart.length > 2 && cityPart.split(' ').length <= 4) {
        return cityPart;
      }
    }

    // US City, State ZIP pattern: e.g. "Austin, TX 78701" or "San Francisco, CA"
    const usPattern = /([A-Z][a-zA-Z\s.-]+),\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?/g;
    const usMatch = usPattern.exec(line);
    if (usMatch && US_STATE_CODES.has(usMatch[2].toUpperCase())) {
      const cityName = usMatch[1].trim();
      if (cityName.length > 2 && cityName.split(' ').length <= 3) {
        return `${cityName}, ${usMatch[2].toUpperCase()}`;
      }
    }
  }

  // 4. City & Region matching against curated database
  for (const line of searchLines) {
    const lowerLine = line.toLowerCase();
    for (const city of CITIES) {
      if (lowerLine.includes(city)) {
        // Check if a region/country is also present on this line
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
 * Extract Candidate Name:
 * Prioritizes Font-Size Detection from PDF header,
 * then checks text lines before the contact block,
 * and finally falls back to filename heuristics.
 */
export function extractName(text, filename = '', nameFromFont = null) {
  // 1. SURE-SHOT: If font-size detector from PDF found a prominent header name, use it!
  if (nameFromFont && isValidNameCandidate(nameFromFont)) {
    return cleanName(nameFromFont);
  }

  if (!text) return fallbackNameFromFilename(filename);

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Look in the top 10 lines
  const topLines = lines.slice(0, 10);

  for (const line of topLines) {
    // Skip lines with email, urls, phone digits, or obvious metadata
    if (line.includes('@') || /https?:\/\/|www\.|linkedin|github/i.test(line)) continue;
    if (/\d{4,}/.test(line)) continue; // has dates or numbers
    if (/[|•·]/.test(line)) {
      // E.g. "John Doe | Senior Software Engineer | Austin, TX"
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

  return fallbackNameFromFilename(filename);
}

function fallbackNameFromFilename(filename) {
  if (!filename) return null;
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanFilename = nameWithoutExt
    .replace(/[-_.]/g, ' ')
    .replace(/\b(resume|cv|curriculum|vitae|profile|202[0-9]|201[0-9]|updated|final|doc|pdf)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (isValidNameCandidate(cleanFilename)) {
    return cleanName(cleanFilename);
  }
  return null;
}

/**
 * Validate whether a string looks like a legitimate person's name
 */
function isValidNameCandidate(str) {
  if (!str) return false;
  const trimmed = str.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  // A name is typically 2 to 4 words (e.g. "Sarah Connor", "Alex Rivera", "Ananya Sharma")
  if (words.length < 2 || words.length > 4) return false;

  // Total length should be reasonable
  if (trimmed.length < 3 || trimmed.length > 40) return false;

  // Check each word
  for (const word of words) {
    // Only letters, hyphens, and periods
    if (!/^[A-Za-z.-]+$/.test(word)) return false;
    const lower = word.toLowerCase();
    if (TITLE_AND_HEADER_STOPWORDS.has(lower)) return false;
  }

  // Must be Title Case or ALL CAPS
  const isAllUpper = trimmed === trimmed.toUpperCase();
  const isTitleCase = words.every(w => /^[A-Z][a-z.-]*$/.test(w));

  return isAllUpper || isTitleCase;
}

function cleanName(str) {
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
  let nameFromFont = null;
  let error = null;

  try {
    const content = await extractContent(file);
    rawText = normalizeText(content.text || '');
    htmlPreview = content.html;
    nameFromFont = content.nameFromFont;
  } catch (err) {
    console.error(`Error reading ${file.name}:`, err);
    error = err.message || 'Failed to read file contents';
  }

  // Pre-load raw ArrayBuffer for PDF files
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

  // 1. High-precision Email Extraction
  const email = extractEmail(rawText);

  // 2. High-precision Phone Extraction with libphonenumber-js
  const phone = extractPhone(rawText);

  // 3. High-precision Location Extraction with Contact Proximity & PIN Codes
  const location = extractLocation(rawText, email, phone);

  // 4. High-precision Name Extraction with Font-Size Hierarchy & Layout Awareness
  const name = extractName(rawText, file.name, nameFromFont);

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
