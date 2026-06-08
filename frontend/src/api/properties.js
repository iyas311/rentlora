import client from "./client";
export const getProperties = (params) => client.get("/properties", { params }).then((r) => r.data);
export const getProperty = (id) => client.get(`/properties/${id}`).then((r) => r.data);
export const createProperty = (payload) => client.post("/properties", payload).then((r) => r.data);
export const generatePropertyDescription = (payload) => client.post("/ai/description", payload).then((r) => r.data);
export const removeProperty = (id) => client.delete(`/properties/${id}`).then((r) => r.data);
export const uploadPropertyImages = (id, files) => {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  return client.post(`/properties/${id}/images`, form).then((r) => r.data);
};
export const getAvailability = (id, params) => client.get(`/properties/${id}/availability`, { params }).then((r) => r.data);
