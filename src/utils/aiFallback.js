/**
 * AI Fallback Service for Resume Parsing
 * Uses OpenAI gpt-4o-mini with multimodal vision support for scanned & photo resumes,
 * token-slimming, and controlled concurrency.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Ensure PDF.js worker is properly configured
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

// Check if candidate is missing essential fields (Name or Phone)
export function isCandidateIncomplete(candidate) {
  if (!candidate) return false;
  const hasName = Boolean(candidate.name && candidate.name.trim());
  const hasPhone = Boolean(candidate.phone && candidate.phone.trim());
  return !hasName || !hasPhone;
}

/**
 * Trims raw resume text to only the contact header (first ~1,200 characters)
 * This cuts token usage by 80-90% and speeds up API response to < 1s.
 */
export function extractHeaderSnippet(rawText) {
  if (!rawText) return '';
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const headerLines = lines.slice(0, 35).join('\n');
  return headerLines.slice(0, 1500);
}

/**
 * Convert an image File to a resized, lightweight base64 Data URL for OpenAI Vision
 */
export async function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Render the first page of a PDF as a base64 JPEG image for OpenAI Vision OCR
 */
export async function renderPdfFirstPageAsImage(candidate) {
  try {
    let arrayBuffer = candidate.fileData;
    if ((!arrayBuffer || arrayBuffer.byteLength === 0) && candidate.fileObj) {
      if (typeof candidate.fileObj.arrayBuffer === 'function') {
        arrayBuffer = await candidate.fileObj.arrayBuffer();
      }
    }
    if (!arrayBuffer) {
      console.warn('No arrayBuffer found for:', candidate.fileName);
      return null;
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.error('Failed to render PDF page as image:', err);
    return null;
  }
}

/**
 * Call OpenAI gpt-4o-mini to extract missing fields for a single candidate.
 * Seamlessly uses Vision OCR for photo/scanned resumes and Text for regular resumes.
 */
export async function extractWithOpenAI(candidate, passcode = '', retryCount = 0) {

  const isImageFile = candidate.isImageResume || 
                      ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(candidate.fileType) ||
                      candidate.fileObj?.type?.startsWith('image/');

  const textLength = (candidate.rawText || '').trim().length;
  const hasLittleText = textLength < 80;

  // Decide whether to use Vision or Text
  const shouldUseVision = isImageFile || hasLittleText || candidate.isScannedPdf;

  let messages = [];

  if (shouldUseVision) {
    let base64Url = null;
    if (isImageFile && candidate.fileObj) {
      base64Url = await imageFileToDataUrl(candidate.fileObj);
    } else {
      base64Url = await renderPdfFirstPageAsImage(candidate);
    }

    if (base64Url) {
      console.log(`[AI Fallback] Processing ${candidate.fileName} using OpenAI Vision OCR...`);
      messages = [
        {
          role: 'system',
          content: 'You are an expert HR resume OCR extraction assistant. Extract the candidate personal contact details from the resume photo or document scan. Respond strictly with a JSON object. Never return markdown codeblocks.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract candidate personal contact info from this resume image. Return strictly a JSON object with keys: "name" (Full Name or null), "phone" (Phone number with country code if available or null), "email" (Email address or null), "location" (City/State or null).'
            },
            {
              type: 'image_url',
              image_url: { url: base64Url }
            }
          ]
        }
      ];
    }
  }

  // Fallback to text prompt if vision was not triggered or image rendering failed
  if (messages.length === 0) {
    console.log(`[AI Fallback] Processing ${candidate.fileName} using text prompt...`);
    const snippet = extractHeaderSnippet(candidate.rawText);
    const missingInfo = [];
    if (!candidate.name?.trim()) missingInfo.push('Full Name');
    if (!candidate.phone?.trim()) missingInfo.push('Phone Number');
    if (!candidate.email?.trim()) missingInfo.push('Email');
    if (!candidate.location?.trim()) missingInfo.push('Location/City');

    const prompt = `You are a specialized HR resume parser. Extract candidate contact info from this resume header snippet.

Focus especially on missing fields: ${missingInfo.join(', ')}.
Current known fields:
- Name: "${candidate.name || ''}"
- Phone: "${candidate.phone || ''}"
- Email: "${candidate.email || ''}"
- Location: "${candidate.location || ''}"

Resume snippet:
---
${snippet}
---

Return ONLY valid JSON with keys:
{
  "name": "Full Name or null",
  "phone": "Phone number with country code if available, or null",
  "email": "Email address or null",
  "location": "City, State/Country or null"
}`;

    messages = [
      { 
        role: 'system', 
        content: 'You extract contact information from resume snippets. Respond strictly with a JSON object. Never return markdown codeblocks or extra text.' 
      },
      { role: 'user', content: prompt }
    ];
  }

  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (passcode && passcode.trim()) {
      headers['x-office-passcode'] = passcode.trim();
    }

    const response = await fetch('/api/extract', {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages })
    });

    if (response.status === 429 && retryCount < 2) {
      console.warn(`Rate limit hit (429). Retrying in 2s (Attempt ${retryCount + 1})...`);
      await new Promise(res => setTimeout(res, 2000 * (retryCount + 1)));
      return extractWithOpenAI(candidate, passcode, retryCount + 1);
    }

    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Unauthorized: Invalid or missing Office Passcode');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server extraction error ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    console.log(`[AI Fallback] Successfully extracted for ${candidate.fileName}:`, parsed);

    return {
      name: parsed.name && parsed.name !== 'null' ? parsed.name.trim() : null,
      phone: parsed.phone && parsed.phone !== 'null' ? parsed.phone.trim() : null,
      email: parsed.email && parsed.email !== 'null' ? parsed.email.trim() : null,
      location: parsed.location && parsed.location !== 'null' ? parsed.location.trim() : null
    };
  } catch (err) {
    if (err.message.includes('Unauthorized') || err.message.includes('Passcode')) {
      throw err;
    }
    if (retryCount < 2 && (err.message.includes('fetch') || err.message.includes('429'))) {
      await new Promise(res => setTimeout(res, 1500));
      return extractWithOpenAI(candidate, passcode, retryCount + 1);
    }
    throw err;
  }
}

/**
 * Concurrency-controlled batch processor for 40-50+ partial resumes.
 * Collects all resolved proposals and returns them for review.
 */
export async function processBatchWithAI({
  candidates,
  passcode = '',
  concurrency = 3,
  onProgress,
  signal
}) {
  const queue = candidates.filter(isCandidateIncomplete);
  const total = queue.length;

  if (total === 0) {
    return { processed: 0, fixed: 0, results: [] };
  }

  let completedCount = 0;
  let queueIndex = 0;
  const results = [];

  async function worker() {
    while (queueIndex < queue.length) {
      if (signal?.aborted) break;

      const currentIndex = queueIndex++;
      const candidate = queue[currentIndex];

      try {
        const extracted = await extractWithOpenAI(candidate, passcode);

        if (extracted) {
          results.push({
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
          });
        }
      } catch (err) {
        console.error(`AI extraction failed for ${candidate.fileName}:`, err);
      } finally {
        completedCount++;
        if (onProgress) {
          onProgress({
            current: completedCount,
            total,
            resolved: results.length
          });
        }
      }
    }
  }

  const workerCount = Math.min(concurrency, total);
  const workers = Array.from({ length: workerCount }, () => worker());

  await Promise.all(workers);

  return {
    processed: completedCount,
    fixed: results.filter(r => r.isFixed).length,
    results
  };
}
