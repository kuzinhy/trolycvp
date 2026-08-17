/**
 * Tiện ích xuất file Word (.doc) và sao chép văn bản đạt chuẩn thể thức văn phòng Đảng
 */

export const exportDirectiveToWord = (content: string, title: string): boolean => {
  try {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${title}</title>
    <style>
      body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; margin: 20mm; }
      h1, h2, h3 { color: #000; font-weight: bold; }
      .header-party { text-align: center; font-weight: bold; }
      .title-doc { text-align: center; font-size: 16pt; font-weight: bold; margin-top: 15px; margin-bottom: 15px; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 10px; }
      th, td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 13pt; }
      th { background-color: #f2f2f2; font-weight: bold; }
    </style></head><body>`;
    const footer = `</body></html>`;
    const formattedHtml = content.replace(/\n/g, '<br/>');
    const sourceHTML = header + `<div class="title-doc">${title}</div>` + formattedHtml + footer;

    const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error exporting word doc:', error);
    return false;
  }
};

export const copyTextSafely = async (text: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};
