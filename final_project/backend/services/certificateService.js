// backend/services/certificateService.js
// Streams a PDF certificate to the HTTP response using PDFKit.
// Supports: plain generated cert OR overlay on a custom template image.

'use strict';

const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');

/**
 * streamCertificate(options, res)
 *
 * options:
 *   studentName    {string}  — recipient name
 *   courseTitle    {string}  — course name
 *   certNumber     {string}  — e.g. "CERT-00142-7"
 *   completedAt    {string}  — human-readable date
 *   instructorName {string?} — instructor name
 *   platformName   {string?} — school / platform name (default "ExamPro")
 *   primaryColor   {string?} — hex color (default "#5C6EF8")
 *   templateImage  {string?} — server path like "/uploads/cert_templates/foo.png"
 *   nameX          {number?} — horizontal position as % of page width (0-100, default 50)
 *   nameY          {number?} — vertical position as % of page height (0-100, default 55)
 *   nameFontSize   {number?} — font size for student name (default 48)
 *   nameColor      {string?} — hex color for name text (default "#1a1a2e")
 *   nameFont       {string?} — font name (default "Helvetica-Bold")
 *
 * res — Express response object
 */
function streamCertificate(options, res) {
  const {
    studentName    = 'Student',
    courseTitle    = 'Course',
    certNumber     = '',
    completedAt    = '',
    instructorName = '',
    platformName   = 'ExamPro',
    primaryColor   = '#5C6EF8',
    templateImage  = null,
    nameX          = 50,
    nameY          = 55,
    nameFontSize   = 48,
    nameColor      = '#1a1a2e',
    nameFont       = 'Helvetica-Bold',
  } = options;

  // Page size: A4 landscape
  const doc = new PDFDocument({
    size:   'A4',
    layout: 'landscape',
    margin: 0,
    info: {
      Title:    `Certificate of Completion — ${courseTitle}`,
      Author:   platformName,
      Subject:  `Awarded to ${studentName}`,
    },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="certificate-${certNumber || 'cert'}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;   // 841.89
  const H = doc.page.height;  // 595.28

  // ── Background ──────────────────────────────────────────────────────────────
  if (templateImage) {
    // Resolve server path — templateImage is like "/uploads/cert_templates/foo.png"
    const imgPath = path.join(__dirname, '../../frontend/public', templateImage);
    if (fs.existsSync(imgPath)) {
      doc.image(imgPath, 0, 0, { width: W, height: H });
    } else {
      // Template image not found on disk — fall through to generated background
      drawGeneratedBackground(doc, W, H, primaryColor, platformName);
    }
  } else {
    drawGeneratedBackground(doc, W, H, primaryColor, platformName);
  }

  // ── Student name (primary text) ──────────────────────────────────────────
  const nameXpx = (nameX / 100) * W;
  const nameYpx = (nameY / 100) * H;

  // Choose a safe font
  const safeFonts = ['Helvetica-Bold', 'Helvetica', 'Times-Bold', 'Times-Roman', 'Courier-Bold'];
  const chosenFont = safeFonts.includes(nameFont) ? nameFont : 'Helvetica-Bold';

  doc
    .font(chosenFont)
    .fontSize(Number(nameFontSize) || 48)
    .fillColor(nameColor || '#1a1a2e')
    .text(studentName, nameXpx - 250, nameYpx, {
      width:  500,
      align:  'center',
      lineBreak: false,
    });

  // ── If no template image: add course title and footer ──────────────────────
  if (!templateImage || !fs.existsSync(path.join(__dirname, '../../frontend/public', templateImage))) {
    // Course title
    doc
      .font('Helvetica')
      .fontSize(18)
      .fillColor('#333333')
      .text(`for completing`, 0, nameYpx + Number(nameFontSize) + 8, { width: W, align: 'center' });

    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#222222')
      .text(courseTitle, 0, nameYpx + Number(nameFontSize) + 34, { width: W, align: 'center' });

    // Cert number + date
    const footerY = H - 90;
    if (certNumber) {
      doc.font('Helvetica').fontSize(9).fillColor('#999999')
         .text(`Certificate No: ${certNumber}`, 60, footerY);
    }
    if (completedAt) {
      doc.font('Helvetica').fontSize(9).fillColor('#999999')
         .text(`Completed: ${completedAt}`, W - 220, footerY, { width: 160, align: 'right' });
    }
    if (instructorName) {
      doc.font('Helvetica').fontSize(10).fillColor('#555555')
         .text(`Instructor: ${instructorName}`, W / 2 - 100, footerY, { width: 200, align: 'center' });
    }
  }

  doc.end();
}

function drawGeneratedBackground(doc, W, H, primaryColor, platformName) {
  // Outer border
  doc.rect(0, 0, W, H).fill('#fafafa');

  // Top colour band
  doc.rect(0, 0, W, 14).fill(primaryColor);
  doc.rect(0, H - 14, W, 14).fill(primaryColor);

  // Decorative side strips
  doc.rect(0, 14, 8, H - 28).fill(primaryColor);
  doc.rect(W - 8, 14, 8, H - 28).fill(primaryColor);

  // Inner border frame
  doc.rect(24, 24, W - 48, H - 48).lineWidth(1).strokeColor(primaryColor).stroke();
  doc.rect(28, 28, W - 56, H - 56).lineWidth(0.5).strokeColor(primaryColor).opacity(0.3).stroke();
  doc.opacity(1);

  // Platform name at top
  doc.font('Helvetica-Bold').fontSize(13).fillColor(primaryColor)
     .text(platformName.toUpperCase(), 0, 44, { width: W, align: 'center', characterSpacing: 3 });

  // "Certificate of Completion" heading
  doc.font('Helvetica').fontSize(11).fillColor('#777777')
     .text('CERTIFICATE OF COMPLETION', 0, 68, { width: W, align: 'center', characterSpacing: 2 });

  // Divider line
  const lineY = 90;
  doc.moveTo(W / 2 - 120, lineY).lineTo(W / 2 + 120, lineY).lineWidth(0.8).strokeColor(primaryColor).stroke();

  // "This is to certify that"
  doc.font('Helvetica').fontSize(13).fillColor('#555555')
     .text('This is to certify that', 0, 108, { width: W, align: 'center' });
}

module.exports = { streamCertificate };
