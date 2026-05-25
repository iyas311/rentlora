import toast from "react-hot-toast";

export const notifySuccess = (msg) => toast.success(msg);

export const extractErrorMessage = (err) => {
  if (!err) return "An unknown error occurred";
  if (typeof err === "string") return err;

  // If the backend returned a validation detail list (Array of objects)
  if (Array.isArray(err)) {
    return err
      .map((item) => {
        const field = item.loc ? item.loc[item.loc.length - 1] : "";
        return field ? `${field}: ${item.msg}` : item.msg;
      })
      .join(", ");
  }

  // If the caller passed the full Axios error object
  const responseData = err.response?.data;
  if (responseData) {
    const detail = responseData.detail;
    if (detail) {
      return extractErrorMessage(detail);
    }
  }

  return err.message || "An error occurred";
};

export const notifyError = (err) => {
  const message = extractErrorMessage(err);
  toast.error(message);
};
