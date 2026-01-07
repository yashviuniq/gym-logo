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
 * Generate PDF Receipt - Professional Layout
 * @param {Object} receiptData - Receipt details
 * @returns {Promise<{pdf: jsPDF, blob: Blob, base64: string}>}
 */
export const generateReceiptPDF = async (receiptData) => {
  const {
    gymName = "FITNESS CENTER",
    gymAddress = "",
    gymPhone = "",
    memberName,
    memberPhone,
    memberEmail,
    memberAddress,
    planName,
    planDuration,
    validityStart,
    validityEnd,
    amount,
    paymentMode,
    receiptNumber,
    paymentDate = new Date(),
  } = receiptData;

  // Create PDF document - A4 Portrait
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Professional colors - Clean black, white, and subtle blue
  const black = [0, 0, 0];
  const darkBlue = [30, 58, 138];
  const mediumGray = [100, 116, 139];
  const lightGray = [241, 245, 249];
  const white = [255, 255, 255];

  // Format amount properly
  const formatAmount = (amt) => {
    const num = Number(amt) || 0;
    return "₹ " + num.toLocaleString("en-IN") + "/-";
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // Format date for validity
  const formatDateShort = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
  };

  // ========== HEADER SECTION ==========
  let yPos = margin;
  
  // Gym Name centered at top
  doc.setTextColor(...darkBlue);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(gymName.toUpperCase(), pageWidth / 2, yPos, { align: "center" });

  yPos += 12;
  
  // "RECEIPT" title
  doc.setTextColor(...black);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT", pageWidth / 2, yPos, { align: "center" });

  // Top horizontal line
  yPos += 8;
  doc.setDrawColor(...black);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // ========== MEMBER DETAILS SECTION ==========
  yPos += 15;
  
  // "Received with thanks from Mr/Mrs:" line
  doc.setTextColor(...mediumGray);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Received with thanks from Mr/Mrs:", margin, yPos);

  // Member Name
  yPos += 8;
  doc.setTextColor(...black);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(memberName || "", margin, yPos);

  // Member Address
  yPos += 8;
  doc.setTextColor(...mediumGray);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  if (memberAddress) {
    doc.text(`Address: ${memberAddress}`, margin, yPos);
    yPos += 6;
  }
  
  if (memberPhone) {
    doc.text(`Phone: ${memberPhone}`, margin, yPos);
    yPos += 6;
  }
  
  if (memberEmail) {
    doc.text(`Email: ${memberEmail}`, margin, yPos);
    yPos += 6;
  }

  // ========== PAYMENT DETAILS SECTION ==========
  yPos += 12;
  
  // Create a structured box for payment details
  const boxHeight = 80;
  const boxY = yPos;
  
  // Draw box background
  doc.setFillColor(...lightGray);
  doc.rect(margin, boxY, contentWidth, boxHeight, 'F');
  doc.rect(margin, boxY, contentWidth, boxHeight); // Border
  
  // Validity Period (left side)
  doc.setTextColor(...darkBlue);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("VALIDITY PERIOD", margin + 8, boxY + 8);
  
  doc.setTextColor(...black);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${formatDateShort(validityStart)} to ${formatDateShort(validityEnd)}`, margin + 8, boxY + 16);

  // Vertical divider line
  const dividerX = margin + contentWidth / 2;
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(0.5);
  doc.line(dividerX, boxY + 5, dividerX, boxY + boxHeight - 5);

  // Plan Type (right side)
  doc.setTextColor(...darkBlue);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("PLAN TYPE", dividerX + 8, boxY + 8);
  
  doc.setTextColor(...black);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  
  // Determine plan type from name
  let planType = "MONTHLY";
  const planNameLower = planName?.toLowerCase() || "";
  if (planNameLower.includes("quarter") || planNameLower.includes("3 month")) planType = "QUARTERLY";
  if (planNameLower.includes("half") || planNameLower.includes("6 month")) planType = "HALF YEARLY";
  if (planNameLower.includes("year") || planNameLower.includes("12 month")) planType = "YEARLY";
  
  doc.text(planType, dividerX + 8, boxY + 16);

  // Amount section (bottom of box)
  doc.setTextColor(...darkBlue);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("AMOUNT:", margin + 8, boxY + 30);
  
  doc.setTextColor(...black);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`₹ ${Number(amount).toLocaleString("en-IN")}`, margin + 8, boxY + 40);

  // Paid Amount (right side, bottom)
  doc.setTextColor(...darkBlue);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("PAID AMOUNT:", dividerX + 8, boxY + 30);
  
  doc.setTextColor(...black);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`₹ ${Number(amount).toLocaleString("en-IN")}`, dividerX + 8, boxY + 40);

  // Balance Amount
  doc.setTextColor(...darkBlue);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("BALANCE AMOUNT:", margin + 8, boxY + 55);
  
  doc.setTextColor(...black);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("₹ 0", margin + 8, boxY + 65);

  // Payment Mode
  doc.setTextColor(...darkBlue);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT MODE:", dividerX + 8, boxY + 55);
  
  doc.setTextColor(...black);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text((paymentMode || "CASH").toUpperCase(), dividerX + 8, boxY + 65);

  // ========== TRAINER SECTION ==========
  yPos += boxHeight + 15;
  
  // If trainer information is available
  if (receiptData.traineeName) {
    doc.setTextColor(...darkBlue);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TRAINER:", margin, yPos);
    
    doc.setTextColor(...black);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(receiptData.traineeName, margin + 25, yPos);
    yPos += 10;
  }

  // ========== TERMS AND CONDITIONS ==========
  yPos += 10;
  
  // Horizontal line separator
  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 8;
  doc.setTextColor(...darkBlue);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS:", margin, yPos);

  yPos += 8;
  doc.setTextColor(...mediumGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const terms = [
    "Any extension to the specified period of membership filed for any reason,",
    "will not be refunded or transferred under any circumstances.",
    "",
    "1. Membership is non-transferable without prior written consent.",
    "2. All payments are final and non-refundable.",
    "3. This receipt must be presented for gym access.",
    "4. Membership card must be carried at all times during gym visits."
  ];

  terms.forEach((term, index) => {
    doc.text(term, margin, yPos + (index * 4));
  });

  // ========== FOOTER SECTION ==========
  const footerY = 270; // Fixed position near bottom
  
  // Receipt Number and Date
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setTextColor(...darkBlue);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Receipt No: ${receiptNumber}`, margin, footerY + 6);
  
  doc.setTextColor(...mediumGray);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${formatDate(paymentDate)}`, pageWidth - margin, footerY + 6, { align: "right" });

  // Gym Contact Info
  if (gymAddress || gymPhone) {
    const contactInfo = [];
    if (gymAddress) contactInfo.push(`Address: ${gymAddress}`);
    if (gymPhone) contactInfo.push(`Phone: ${gymPhone}`);
    
    doc.text(contactInfo.join(" | "), pageWidth / 2, footerY + 15, { align: "center" });
  }

  // Final Note
  doc.setTextColor(...mediumGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("This is an official receipt for payment made. Please keep this document safe.", pageWidth / 2, footerY + 22, { align: "center" });
  doc.text("Computer Generated Document - Valid without signature", pageWidth / 2, footerY + 27, { align: "center" });

  // Generate blob
  const blob = doc.output('blob');
  const base64 = doc.output('datauristring');

  return { pdf: doc, blob, base64 };
};

// ALL REMAINING FUNCTIONS STAY EXACTLY THE SAME AS ORIGINAL
// (uploadReceiptToStorage, saveReceiptRecord, createPaymentReceipt, etc.)

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
    memberAddress = "",
    planName,
    planDuration,
    validityStart,
    validityEnd,
    amount,
    paymentMode,
    paymentId,
    paymentDate = new Date(),
    traineeName = "",
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
      memberAddress,
      planName,
      planDuration,
      validityStart,
      validityEnd,
      amount,
      paymentMode,
      receiptNumber,
      paymentDate,
      traineeName
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