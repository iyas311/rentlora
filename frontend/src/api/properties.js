import client from "./client";
export const getProperties = (params) => client.get("/properties", { params }).then((r) => r.data);
export const getProperty = (id) => client.get(`/properties/${id}`).then((r) => r.data);
export const createProperty = (payload) => client.post("/properties", payload).then((r) => r.data);
export const generatePropertyDescription = (payload) => client.post("/ai/description", payload).then((r) => r.data);
export const removeProperty = (id) => client.delete(`/properties/${id}`).then((r) => r.data);
// Production image upload: browser uploads directly to S3 via a presigned URL, then
// registers the CDN URL. No file bytes pass through the backend pod (and nothing is
// written to ephemeral pod disk). The resize Lambda creates the medium/thumbnail variants.
export const uploadPropertyImages = async (id, files) => {
  const images = [];
  for (const file of files) {
    // 1) ask the backend for a presigned S3 PUT URL + the final CDN URLs
    const { data } = await client.post(`/properties/${id}/presigned-upload`, null, {
      params: { filename: file.name, content_type: file.type },
    });
    // 2) upload the file straight to S3 (raw fetch — must NOT carry our auth/baseURL)
    const res = await fetch(data.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
    // 3) register the CDN URL on the property (medium variant is created by the Lambda)
    const cdnUrl = data.cdn_urls.medium;
    await client.post(`/properties/${id}/confirm-upload`, null, {
      params: { cdn_url: cdnUrl },
    });
    images.push(cdnUrl);
  }
  return { images };
};
export const getAvailability = (id, params) => client.get(`/properties/${id}/availability`, { params }).then((r) => r.data);
