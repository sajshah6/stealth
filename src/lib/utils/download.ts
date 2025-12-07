import { createClient } from "@/lib/supabase/client";

/**
 * Downloads a file from Supabase Storage using a signed URL
 * @param storagePath - The path to the file in storage (e.g., "user_id/project_id/filename")
 * @param fileName - The name to save the file as
 * @param bucket - The storage bucket name (default: "project-files")
 */
export async function downloadFile(
  storagePath: string,
  fileName: string,
  bucket: string = "project-files"
): Promise<void> {
  const supabase = createClient();

  try {
    // Create a signed URL that expires in 60 seconds
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 60);

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      
      // Fallback: try direct download (for public buckets)
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(storagePath);

      if (error) {
        console.error("Download error:", error);
        throw new Error("Failed to download file");
      }

      // Create a blob URL and trigger download
      const blob = new Blob([data], { type: data.type });
      const url = window.URL.createObjectURL(blob);
      triggerDownload(url, fileName);
      window.URL.revokeObjectURL(url);
      return;
    }

    // Use signed URL - this approach triggers a proper download
    const response = await fetch(signedUrlData.signedUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch file");
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    triggerDownload(url, fileName);
    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error("Error downloading file:", err);
    throw err;
  }
}

/**
 * Helper to trigger a file download
 */
function triggerDownload(url: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Gets a signed URL for a file (for temporary access)
 * @param storagePath - The path to the file in storage
 * @param bucket - The storage bucket name
 * @param expiresIn - Seconds until the URL expires (default: 60)
 */
export async function getSignedUrl(
  storagePath: string,
  bucket: string = "project-files",
  expiresIn: number = 60
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error("Signed URL error:", error);
    return null;
  }

  return data.signedUrl;
}
