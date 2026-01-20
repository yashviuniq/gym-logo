"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Camera, Upload, X, User, Loader2 } from "lucide-react";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes
const COMPRESSION_THRESHOLD = 1 * 1024 * 1024; // 1MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Compress images >= 1MB to reduce upload size without sacrificing too much quality
const compressImage = async (file, maxSizeBytes = COMPRESSION_THRESHOLD) => {
  const loadImage = (f) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const toBlob = (canvas, quality) =>
    new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

  const img = await loadImage(file);

  // Limit max dimensions to avoid huge uploads while preserving aspect ratio
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let blob = await toBlob(canvas, quality);

  // Iteratively reduce quality until under threshold or quality floor reached
  while (blob && blob.size > maxSizeBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await toBlob(canvas, quality);
  }

  if (!blob) {
    throw new Error("Failed to compress image");
  }

  const compressedFileName = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
  return new File([blob], compressedFileName, { type: "image/jpeg" });
};

export default function ProfileImageUpload({ 
  currentImage, 
  onImageChange, 
  memberId,
  size = "lg", // sm, md, lg
  editable = true 
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentImage);
  const fileInputRef = useRef(null);

  const sizeClasses = {
    sm: "w-16 h-16 text-xl",
    md: "w-20 h-20 text-2xl",
    lg: "w-28 h-28 text-3xl",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please select a JPG, PNG, or WebP image");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be less than 3MB");
      return;
    }

    let processedFile = file;
    if (file.size >= COMPRESSION_THRESHOLD) {
      try {
        processedFile = await compressImage(file);
      } catch (err) {
        console.error("Compression failed", err);
        setError("Could not compress image. Please try another photo.");
        return;
      }
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(processedFile);
    setPreviewUrl(objectUrl);

    // Upload to Supabase Storage
    await uploadImage(processedFile);

    // Cleanup preview URL
    URL.revokeObjectURL(objectUrl);
  };

  const uploadImage = async (file) => {
    setUploading(true);
    setError(null);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${memberId}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      // Delete old image if exists
      if (currentImage) {
        const oldPath = currentImage.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("member-images")
            .remove([`profiles/${oldPath}`]);
        }
      }

      // Upload new image
      const { data, error: uploadError } = await supabase.storage
        .from("member-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("member-images")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);

      // Update member record with new image URL
      const { error: updateError } = await supabase
        .from("members")
        .update({ profile_image: publicUrl })
        .eq("id", memberId);

      if (updateError) {
        throw updateError;
      }

      // Notify parent component
      if (onImageChange) {
        onImageChange(publicUrl);
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Failed to upload image. Please try again.");
      setPreviewUrl(currentImage); // Revert to original
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!previewUrl) return;

    setUploading(true);
    setError(null);

    try {
      // Extract filename from URL
      const urlParts = previewUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage
        .from("member-images")
        .remove([`profiles/${fileName}`]);

      // Update member record
      await supabase
        .from("members")
        .update({ profile_image: null })
        .eq("id", memberId);

      setPreviewUrl(null);

      if (onImageChange) {
        onImageChange(null);
      }
    } catch (err) {
      console.error("Error removing image:", err);
      setError("Failed to remove image");
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (editable && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Profile Image */}
        <div
          onClick={triggerFileInput}
          className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold relative ${
            editable && !uploading ? "cursor-pointer" : ""
          }`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className={iconSizes[size]} />
          )}

          {/* Uploading overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Camera button */}
        {editable && !uploading && (
          <button
            type="button"
            onClick={triggerFileInput}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
          >
            <Camera className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {/* Remove button */}
        {editable && previewUrl && !uploading && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload hint */}
      {editable && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          {uploading ? "Uploading..." : "Tap to change photo"}
          <br />
          <span className="text-gray-400">Max 3MB • JPG, PNG, WebP</span>
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
