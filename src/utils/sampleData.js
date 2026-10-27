function makePdfFile(name, phone, email, location, title, summary, fileName) {
  const content = `BT
/F1 18 Tf
50 720 Td
(${name}) Tj
/F1 10 Tf
0 -24 Td
(Phone: ${phone}   |   Email: ${email}) Tj
0 -18 Td
(Location: ${location}) Tj
0 -32 Td
/F1 13 Tf
(${title}) Tj
0 -22 Td
/F1 10 Tf
(${summary}) Tj
0 -20 Td
(CORE COMPETENCIES: Cloud Architecture, React, Node.js, Distributed Systems) Tj
0 -20 Td
(EDUCATION: B.S. in Computer Science - Honors) Tj
ET`;

  const streamLength = content.length;
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000236 00000 n 
0000000305 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${360 + streamLength}
%%EOF`;

  const bytes = new Uint8Array(pdfString.length);
  for (let i = 0; i < pdfString.length; i++) {
    bytes[i] = pdfString.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: 'application/pdf' });
}

export const SAMPLE_RESUMES = [
  {
    fileName: 'Sarah_Connor_Senior_Engineer.txt',
    content: `SARAH CONNOR
Los Angeles, CA
Phone: +1 (310) 555-0199
Email: sarah.connor@cyberdyne.org
LinkedIn: linkedin.com/in/sarah-connor

PROFESSIONAL SUMMARY
Senior Distributed Systems Architect with 8+ years building resilient microservices and cloud infrastructure.

EXPERIENCE
Lead Systems Engineer | TechCorp Inc. (2020 - Present)
- Architected high-throughput message streaming platform handling 250k events/sec.
- Mentored junior engineers and improved release velocity by 40%.`
  },
  {
    fileName: 'David_Kim_Product_Manager.txt',
    content: `David Kim
Seattle, WA 98101
+1 (206) 555-8472
david.kim.pm@productgrowth.io

SUMMARY
Results-driven Lead Technical Product Manager with deep experience in AI/ML products and SaaS growth.

WORK HISTORY
Principal PM | CloudMetrics (2021 - Present)
- Led team of 14 engineers and designers through 4 major enterprise feature rollouts.
- Increased annual recurring revenue by $3.2M within 12 months.`
  },
  {
    fileName: 'Ananya_Sharma_DataScientist.txt',
    content: `ANANYA SHARMA
Bengaluru, Karnataka, India
+91 98451 23456 | ananya.sharma@mlresearch.ai

PROFILE
Applied Machine Learning Scientist specialized in Large Language Models, NLP pipelines, and computer vision.

TECHNICAL SKILLS
Python, PyTorch, Hugging Face, spaCy, Docker, Kubernetes, AWS SageMaker

EDUCATION
M.Tech in Artificial Intelligence | Indian Institute of Science (IISc)`
  },
  {
    fileName: 'Marcus_Vance_UX_Designer.txt',
    content: `MARCUS VANCE
Austin, Texas
Email: marcus.vance.ux@designcraft.io
Portfolio: https://marcusux.design

PROFILE
Lead UX/UI Product Designer specializing in design systems, user journey mapping, and mobile app interactions.
(Note: Please contact via email to request direct phone screening).

EXPERIENCE
Staff Product Designer | FinTech Studio (2021 - Present)
- Designed design token system adopted across 8 web and mobile products.`
  }
];

export function createSampleFiles() {
  const textFiles = SAMPLE_RESUMES.map(sample => {
    return new File([sample.content], sample.fileName, { type: 'text/plain' });
  });

  const samplePdf1 = makePdfFile(
    'Alex Rivera',
    '+1 (415) 555-2671',
    'alex.rivera@cloudscale.io',
    'San Francisco, CA',
    'Principal Cloud Architect',
    'Specialist in high-throughput distributed systems and Kubernetes infrastructure.',
    'Alex_Rivera_CloudArchitect.pdf'
  );

  const samplePdf2 = makePdfFile(
    'Sophia Chen',
    '+1 (650) 555-0182',
    'sophia.chen.ai@stanfordalumni.org',
    'Palo Alto, CA',
    'Senior AI Research Scientist',
    'Lead author on Transformer architectures and multimodal embedding models.',
    'Sophia_Chen_AI_Researcher.pdf'
  );

  return [samplePdf1, samplePdf2, ...textFiles];
}
