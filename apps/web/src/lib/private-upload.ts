type PrivateUpload = {
  method?: "POST" | "PUT";
  headers?: Record<string, string>;
  fields?: Record<string, string>;
};

// Keep POST support for existing S3 deployments and older init responses.
export async function uploadPrivateFile(url: string, upload: PrivateUpload, file: File) {
  try {
    if (upload.method === "PUT") {
      return await fetch(url, { method: "PUT", headers: upload.headers, body: file });
    }
    const form = new FormData();
    for (const [key, value] of Object.entries(upload.fields ?? {})) form.append(key, value);
    form.append("file", file);
    return await fetch(url, { method: "POST", body: form });
  } catch {
    throw new Error("Could not connect to private storage. Check your connection or ask an administrator to check the storage upload settings.");
  }
}
