import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  console.log("Starting PDF text extraction for:", file.name);
  try {
    const arrayBuffer = await file.arrayBuffer();
    console.log("PDF ArrayBuffer size:", arrayBuffer.byteLength);
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log("PDF loaded, pages:", pdf.numPages);
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // @ts-ignore
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    console.log("PDF text extraction complete, length:", text.length);
    return text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw error;
  }
}
