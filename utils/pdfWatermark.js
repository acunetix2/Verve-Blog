/**
 * PDF Watermark Utility
 * Adds VerveHub Academy footer branding to downloaded documents
 * Supports plain text file conversion to branded PDF
 */

/**
 * Create a branded footer string for documents
 * Used to add watermark/branding info to PDFs
 * @param {string} documentTitle - Title of the document
 * @returns {string} - Footer text with branding
 */
export function getWatermarkFooter(documentTitle = 'Document') {
  const downloadDate = new Date().toLocaleString();
  return `\n\n${'='.repeat(60)}\nVerveHub Academy - ${documentTitle}\nDownloaded: ${downloadDate}\n© VerveHub Academy - All Rights Reserved\nWebsite: https://vervehub.com\n${'='.repeat(60)}`;
}

/**
 * Create header for branded document
 * @returns {string} - Header text with branding
 */
export function getWatermarkHeader() {
  return `${'='.repeat(60)}\nVERVEHUB ACADEMY\n${new Date().toLocaleString()}\n${'='.repeat(60)}\n\n`;
}

/**
 * Add watermark footer to text content
 * @param {string} content - Original file content
 * @param {string} documentTitle - Title of the document
 * @returns {string} - Content with watermark footer
 */
export function addWatermarkToContent(content, documentTitle = 'Document') {
  return getWatermarkHeader() + content + getWatermarkFooter(documentTitle);
}

/**
 * Create metadata headers for document downloads
 * @param {string} documentTitle - Title of the document
 * @param {string} documentType - Type of document (pdf, docx, etc)
 * @returns {Object} - Headers object for response
 */
export function getDownloadHeaders(documentTitle, documentType = 'application/pdf') {
  return {
    'Content-Type': documentType,
    'Content-Disposition': `attachment; filename="${sanitizeFilename(documentTitle)}"`,
    'X-Watermark': 'VerveHub Academy',
    'X-Download-Date': new Date().toISOString(),
  };
}

/**
 * Sanitize filename for safe download
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-z0-9._-]/gi, '_')
    .replace(/_+/g, '_')
    .substring(0, 255);
}

/**
 * Create a branded cover page text for PDFs
 * @param {string} documentTitle - Title of the document
 * @param {string} description - Document description
 * @returns {string} - Cover page content
 */
export function createBrandedCoverPage(documentTitle, description = '') {
  const date = new Date().toLocaleString();
  return `
${'█'.repeat(60)}
VERVEHUB ACADEMY
Official Learning Resource
${'█'.repeat(60)}

DOCUMENT: ${documentTitle}
DOWNLOADED: ${date}
SOURCE: https://vervehub.com

${description ? `DESCRIPTION:\n${description}\n` : ''}
─────────────────────────────────────────────────────────────

TERMS OF USE:
This material is provided for educational purposes only. Users must 
comply with all applicable laws and regulations. VerveHub Academy is 
not responsible for misuse of the content.

For more resources and tutorials, visit:
→ https://vervehub.com
→ contact@vervehub.com

${'─'.repeat(60)}
${new Date().getFullYear()} © VerveHub Academy - All Rights Reserved
${'═'.repeat(60)}

`;
}

/**
 * Create footer branding for each document page
 * @returns {string} - Page footer text
 */
export function createPageFooter() {
  return '\n' + '─'.repeat(60) + '\n© VerveHub Academy | https://vervehub.com | Downloaded ' + new Date().toLocaleString() + '\n' + '─'.repeat(60);
}

export default {
  getWatermarkFooter,
  getWatermarkHeader,
  addWatermarkToContent,
  getDownloadHeaders,
  sanitizeFilename,
  createBrandedCoverPage,
  createPageFooter,
};
