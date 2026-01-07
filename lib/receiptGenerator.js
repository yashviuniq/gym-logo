"use client";

import jsPDF from "jspdf";
import { supabase } from "./supabaseClient";

/**
 * Receipt Generator Utility
 * Generates professional PDF receipts for membership payments
 */

// Generate a unique receipt number
export const generateReceiptNumber = async (gymId) => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get count of receipts created today for this gym
  const { count } = await supabase
    .from("payment_receipts")
    .select("*", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .gte("created_at", today.toISOString().slice(0, 10));
  
  const dailyCount = (count || 0) + 1;
  return `RCP-${dateStr}-${String(dailyCount).padStart(4, '0')}`;
};

/**
 * Generate PDF Receipt - Professional Landscape Layout
 * @param {Object} receiptData - Receipt details
 * @returns {Promise<{pdf: jsPDF, blob: Blob, base64: string}>}
 */
export const generateReceiptPDF = async (receiptData) => {
  const {
    gymName = "Gym",
    gymAddress = "",
    gymPhone = "",
    memberName,
    memberPhone,
    memberEmail,
    planName,
    planDuration,
    validityStart,
    validityEnd,
    amount,
    paymentMode,
    receiptNumber,
    paymentDate = new Date(),
  } = receiptData;

  // Create PDF document - Landscape A5 for better layout
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [148, 210] // A5 landscape (210 x 148)
  });

  const pageWidth = 210;
  const pageHeight = 148;
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);
  const colWidth = (contentWidth - 10) / 2; // Two columns with gap

  // Colors
  const primaryBlue = [37, 99, 235]; // Deep blue
  const accentGreen = [22, 163, 74]; // Green
  const darkText = [31, 41, 55];
  const grayText = [107, 114, 128];
  const lightGray = [243, 244, 246];
  const white = [255, 255, 255];

  // Format amount properly
  const formatAmount = (amt) => {
    const num = Number(amt) || 0;
    return "Rs. " + num.toLocaleString("en-IN") + "/-";
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // ========== HEADER SECTION ==========
  // Blue header background
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Gym Name
  doc.setTextColor(...white);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(gymName.toUpperCase(), pageWidth / 2, 14, { align: "center" });

  // Gym contact info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let headerY = 21;
  if (gymAddress) {
    doc.text(gymAddress, pageWidth / 2, headerY, { align: "center" });
    headerY += 5;
  }
  if (gymPhone) {
    doc.text("Phone: " + gymPhone, pageWidth / 2, headerY, { align: "center" });
  }

  // Receipt title bar
  doc.setFillColor(...accentGreen);
  doc.rect(0, 35, pageWidth, 10, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", pageWidth / 2, 41.5, { align: "center" });

  // ========== RECEIPT INFO ROW ==========
  let yPos = 52;
  
  // Receipt number box (left)
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, 85, 16, 2, 2, 'F');
  doc.setTextColor(...grayText);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Receipt Number", margin + 4, yPos + 5);
  doc.setTextColor(...darkText);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(receiptNumber, margin + 4, yPos + 12);

  // Date box (right)
  doc.setFillColor(...lightGray);
  doc.roundedRect(pageWidth - margin - 85, yPos, 85, 16, 2, 2, 'F');
  doc.setTextColor(...grayText);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Date", pageWidth - margin - 81, yPos + 5);
  doc.setTextColor(...darkText);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(paymentDate), pageWidth - margin - 81, yPos + 12);

  // ========== MAIN CONTENT AREA ==========
  yPos = 74;
  const leftCol = margin;
  const rightCol = margin + colWidth + 10;

  // ---------- LEFT COLUMN: Member Details ----------
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.roundedRect(leftCol, yPos, colWidth, 50, 3, 3);

  // Section header
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(leftCol, yPos, colWidth, 10, 3, 3, 'F');
  doc.rect(leftCol, yPos + 5, colWidth, 5, 'F'); // Square bottom corners
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("MEMBER DETAILS", leftCol + colWidth/2, yPos + 7, { align: "center" });

  // Member info
  let infoY = yPos + 18;
  doc.setTextColor(...darkText);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(memberName || "N/A", leftCol + 5, infoY);

  infoY += 8;
  doc.setTextColor(...grayText);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Phone:  " + (memberPhone || "N/A"), leftCol + 5, infoY);

  infoY += 7;
  if (memberEmail) {
    doc.text("Email:  " + memberEmail, leftCol + 5, infoY);
  }

  // ---------- RIGHT COLUMN: Membership Details ----------
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(rightCol, yPos, colWidth, 50, 3, 3);

  // Section header
  doc.setFillColor(...accentGreen);
  doc.roundedRect(rightCol, yPos, colWidth, 10, 3, 3, 'F');
  doc.rect(rightCol, yPos + 5, colWidth, 5, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("MEMBERSHIP DETAILS", rightCol + colWidth/2, yPos + 7, { align: "center" });

  // Membership info - cleaner table format
  infoY = yPos + 18;
  const labelX = rightCol + 5;
  const valueX = rightCol + 35;
  
  doc.setFontSize(9);
  
  // Plan
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text("Plan:", labelX, infoY);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(planName || "N/A", valueX, infoY);

  // Duration
  infoY += 7;
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text("Duration:", labelX, infoY);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text((planDuration || 0) + " Days", valueX, infoY);

  // Start Date
  infoY += 7;
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text("Start Date:", labelX, infoY);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(validityStart), valueX, infoY);

  // End Date
  infoY += 7;
  doc.setTextColor(...grayText);
  doc.setFont("helvetica", "normal");
  doc.text("Valid Till:", labelX, infoY);
  doc.setTextColor(...darkText);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(validityEnd), valueX, infoY);

  // ========== PAYMENT SECTION (BOTTOM) ==========
  yPos = 128;
  
  // Payment box spanning full width
  doc.setFillColor(...accentGreen);
  doc.roundedRect(margin, yPos, contentWidth, 16, 3, 3, 'F');

  // Left side - Payment mode and status
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Mode: " + (paymentMode || "CASH").toUpperCase(), margin + 8, yPos + 7);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Status: PAID", margin + 8, yPos + 12);

  // Right side - Amount (prominent)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmount(amount), pageWidth - margin - 8, yPos + 10.5, { align: "right" });

  // ========== FOOTER ==========
  doc.setTextColor(...grayText);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("Thank you for choosing " + gymName + "! Stay fit, stay healthy.", pageWidth / 2, pageHeight - 4, { align: "center" });

  // Small "Computer Generated" note
  doc.setFontSize(6);
  doc.text("This is a computer-generated receipt and does not require a signature.", pageWidth / 2, pageHeight - 1, { align: "center" });

  // Generate blob
  const blob = doc.output('blob');
  const base64 = doc.output('datauristring');

  return { pdf: doc, blob, base64 };
};

/**
 * Upload receipt PDF to Supabase storage
 * @param {Blob} pdfBlob - PDF blob
 * @param {string} gymId - Gym ID
 * @param {string} receiptNumber - Receipt number
 * @returns {Promise<{url: string, path: string}>}
 */
export const uploadReceiptToStorage = async (pdfBlob, gymId, receiptNumber) => {
  const fileName = `${gymId}/${receiptNumber}.pdf`;
  
  const { data, error } = await supabase.storage
    .from("payment-receipts")
    .upload(fileName, pdfBlob, {
      contentType: "application/pdf",
      upsert: true
    });

  if (error) {
    console.error("Error uploading receipt:", error);
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("payment-receipts")
    .getPublicUrl(fileName);

  return { url: publicUrl, path: fileName };
};

/**
 * Save receipt record to database
 * @param {Object} receiptData - Receipt details for database
 * @returns {Promise<Object>} - Created receipt record
 */
export const saveReceiptRecord = async (receiptData) => {
  const { data, error } = await supabase
    .from("payment_receipts")
    .insert({
      payment_id: receiptData.paymentId,
      member_id: receiptData.memberId,
      gym_id: receiptData.gymId,
      receipt_number: receiptData.receiptNumber,
      receipt_url: receiptData.receiptUrl,
      file_path: receiptData.filePath,
      amount: receiptData.amount,
      payment_mode: receiptData.paymentMode,
      plan_name: receiptData.planName,
      plan_duration: receiptData.planDuration,
      validity_start: receiptData.validityStart,
      validity_end: receiptData.validityEnd,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving receipt record:", error);
    throw error;
  }

  return data;
};

/**
 * Generate, upload and save a complete receipt
 * @param {Object} paymentData - Complete payment details
 * @returns {Promise<Object>} - Complete receipt with URL
 */
export const createPaymentReceipt = async (paymentData) => {
  const {
    gymId,
    gymName,
    gymAddress,
    gymPhone,
    memberId,
    memberName,
    memberPhone,
    memberEmail,
    planName,
    planDuration,
    validityStart,
    validityEnd,
    amount,
    paymentMode,
    paymentId,
    paymentDate = new Date()
  } = paymentData;

  try {
    // 1. Generate receipt number
    const receiptNumber = await generateReceiptNumber(gymId);

    // 2. Generate PDF
    const { pdf, blob } = await generateReceiptPDF({
      gymName,
      gymAddress,
      gymPhone,
      memberName,
      memberPhone,
      memberEmail,
      planName,
      planDuration,
      validityStart,
      validityEnd,
      amount,
      paymentMode,
      receiptNumber,
      paymentDate
    });

    // 3. Upload to storage
    const { url, path } = await uploadReceiptToStorage(blob, gymId, receiptNumber);

    // 4. Save record to database
    const receiptRecord = await saveReceiptRecord({
      paymentId,
      memberId,
      gymId,
      receiptNumber,
      receiptUrl: url,
      filePath: path,
      amount,
      paymentMode,
      planName,
      planDuration,
      validityStart,
      validityEnd
    });

    return {
      success: true,
      receipt: receiptRecord,
      url,
      receiptNumber
    };
  } catch (error) {
    console.error("Error creating payment receipt:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get latest receipt for a member
 * @param {string} memberId - Member ID
 * @returns {Promise<Object|null>} - Latest receipt or null
 */
export const getLatestMemberReceipt = async (memberId) => {
  const { data, error } = await supabase
    .from("payment_receipts")
    .select("*")
    .eq("member_id", memberId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = no rows found
    console.error("Error fetching receipt:", error);
    return null;
  }

  return data;
};

/**
 * Generate WhatsApp share message with receipt
 * @param {Object} receiptData - Receipt details
 * @returns {string} - WhatsApp share URL
 */
export const generateWhatsAppShareLink = (receiptData) => {
  const {
    memberName,
    memberPhone,
    gymName,
    planName,
    amount,
    validityEnd,
    receiptUrl
  } = receiptData;

  // Clean phone number (remove +91 or any prefix for display)
  const cleanPhone = memberPhone?.replace(/^\+?91/, '').replace(/\D/g, '') || '';
  
  // Format validity date
  const validTill = validityEnd 
    ? new Date(validityEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "N/A";

  // Create message - Plain text without emojis for better compatibility
  const message = `*${gymName}*

Hello ${memberName}!

Thank you for your membership payment!

*Payment Details:*
- Plan: ${planName}
- Amount: Rs. ${Number(amount).toLocaleString("en-IN")}/-
- Valid Till: ${validTill}

*Download Receipt:*
${receiptUrl}

Stay fit, stay healthy!

_This receipt is valid for 7 days._`;

  // Create WhatsApp link
  const encodedMessage = encodeURIComponent(message);
  const whatsappNumber = cleanPhone ? `91${cleanPhone}` : '';
  
  // If we have a phone number, open chat with that number; otherwise open WhatsApp to choose contact
  if (whatsappNumber) {
    return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
  }
  return `https://wa.me/?text=${encodedMessage}`;
};

/**
 * Share receipt via WhatsApp
 * @param {Object} receiptData - Receipt details
 */
export const shareReceiptOnWhatsApp = (receiptData) => {
  const shareUrl = generateWhatsAppShareLink(receiptData);
  window.open(shareUrl, '_blank');
};

/**
 * Download receipt PDF
 * @param {string} receiptUrl - URL of the receipt
 * @param {string} receiptNumber - Receipt number for filename
 */
export const downloadReceipt = async (receiptUrl, receiptNumber) => {
  try {
    const response = await fetch(receiptUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receiptNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading receipt:", error);
    // Fallback: open in new tab
    window.open(receiptUrl, '_blank');
  }
};

export default {
  generateReceiptPDF,
  createPaymentReceipt,
  getLatestMemberReceipt,
  shareReceiptOnWhatsApp,
  downloadReceipt,
  generateWhatsAppShareLink
};
