# Resume Contact Extractor — Employee Onboarding & User Guide

Welcome to the **Resume Contact Extractor**! This application is designed to help recruiters, HR teams, and hiring managers rapidly process batches of resumes and automatically extract key contact details (**Name**, **Phone Number**, **Email Address**, and **Location**).

---

## 🔒 Privacy & Data Security Notice

> **100% Client-Side & Offline**  
> All documents are processed **directly within your local web browser**. Resumes are never transmitted to any external server, third-party API, or cloud storage. Candidate data remains entirely private and secure on your computer.

---

## 🚀 Quick Start (Running the App Locally)

If the application is not already running on your computer, follow these simple steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or newer installed)

### 1. Open Terminal or PowerShell
Navigate into the project folder:
```powershell
cd E:\resume-parser\vite-project
```

### 2. Start the Local Server
```powershell
npm run dev
```

### 3. Open in Browser
Open Google Chrome, Microsoft Edge, or Firefox and go to:
👉 **[http://localhost:5173/](http://localhost:5173/)**

---

## 📋 Core Features & How to Use

### 1. Uploading Resumes in Bulk
- **Drag & Drop**: Select multiple resumes from your computer folder (`.pdf`, `.docx`, `.doc`, `.txt`) and drop them into the dotted upload box.
- **Browse Files**: Click **"Select Files from Computer"** to choose files through your file manager.
- **Instant Test Drive**: Click **"Load 5 Sample Resumes"** to see how the system parses sample PDF and text resumes without needing your own files.
- **Batch Processing**: The upload progress bar tracks files as they process (typically under 100 milliseconds per resume).

---

### 2. Viewing the Extracted Candidate Data Grid
Once uploaded, resumes appear in a structured candidate table:

| Column | Description |
| :--- | :--- |
| **#** | Sequential candidate index. |
| **Candidate Name** | Extracted applicant full name. |
| **Phone Number** | Formatted local or international phone number. |
| **Email Address** | Extracted email with quick-copy and direct mail buttons. |
| **Location** | City, state, or country extracted from contact details. |
| **Resume File** | File name with format badge (`PDF`, `DOCX`, `TXT`). |
| **Status Badge** | `Complete` (all 4 fields found), `Partial` (2–3 fields found), or `Review`. |
| **Actions** | Open original resume, inspect text stream, or delete entry. |

---

### 3. Inline Editing & Corrections
You can correct or fine-tune any field directly in the table before exporting:
1. **Click into any cell** (Name, Phone, Email, Location).
2. Type your changes or corrections.
3. The table saves your edits immediately in real-time.

---

### 4. Opening and Previewing Resumes

You have two convenient ways to review resumes:

#### Option A: Open the Original PDF in a New Tab
- In the **Resume File** column or the **Actions** column, click the **Open in New Tab (`↗`)** icon.
- This immediately opens the original PDF document in your browser's native PDF reader (allowing full zoom, print, search, and page navigation).

#### Option B: In-Site Extracted Text Modal
- Click the **`👁` (Eye)** icon on any row to open the inspection modal.
- **Top Summary Cards**: Displays the 4 extracted contact fields.
- **Extracted Text Stream**: Displays the full raw text parsed from the document with character count.
- **Copy Text**: Click **"Copy Text"** in the modal to copy the cleaned text to your clipboard.
- **Open in New Tab**: A prominent header and footer button allows you to jump directly to the original file.

---

### 5. Search & Filter
- **Search Bar**: Type any candidate name, email, area code, or city to filter rows instantly.
- **Filter Dropdown**:
  - `All Candidates`: View everything.
  - `Complete`: Only resumes where all 4 fields were detected.
  - `Partial`: Resumes with 1 or more missing fields.
  - `Needs Review`: Resumes requiring manual verification.

---

### 6. Batch Actions & Exporting

Located above the table on the right side:

1. **Export Excel (`.xlsx`)**:
   - Downloads a cleanly formatted spreadsheet with auto-fitted column widths ready for Excel or Google Sheets.
2. **CSV**:
   - Downloads a comma-separated `.csv` file compatible with any ATS (Applicant Tracking System) or CRM.
3. **Copy Emails**:
   - Copies all unique email addresses formatted with commas (e.g. `user1@email.com, user2@email.com`), ready to paste into your email client's **BCC** field.
4. **Copy Phones**:
   - Copies all phone numbers formatted for messaging tools or dialers.
5. **Clear**:
   - Resets the table and clears current entries when you are ready for a new batch.

---

## 💡 Best Practices & Tips

- **Handling Complex Multi-Column Resumes**: If a candidate used a heavily formatted design and a field was missed, click the **`👁`** icon to read the text stream, then type the value directly into the table cell.
- **Bulk Email Outreach**: Always use the **"Copy Emails"** button and paste into the **BCC** field of your email software to maintain recipient privacy.
- **Batch Size**: The client-side parser can comfortably handle 50 to 100+ resumes at once in modern browsers.

---

## ❓ Frequently Asked Questions (FAQ)

**Q: Do my uploaded resumes get saved to the cloud?**  
**A:** No. Everything runs 100% locally in your browser memory. As soon as you close or refresh the tab, no temporary files remain.

**Q: Which file types are supported?**  
**A:** PDF (`.pdf`), Microsoft Word (`.docx`, `.doc`), and Plain Text (`.txt`).

**Q: What if a phone number or name looks incomplete?**  
**A:** Simply click the cell in the table to edit the text directly before exporting to Excel.

---

## 📞 Support & Maintenance
For bug reports or feature requests, consult your internal development team or repository maintainer.
