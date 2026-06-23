// Auth via Amazon Cognito. Sign-up/sign-in happen against the Cognito user pool
// directly; the resulting ID token is stored and sent on API calls. The backend
// validates it and just-in-time provisions the local user.
import { signIn, signUp, signOut } from "./cognito";

export const loginApi = async ({ email, password }) => {
  const idToken = await signIn(email, password);
  localStorage.setItem("access_token", idToken);
  return { access_token: idToken };
};

export const registerApi = async ({ name, email, password }) => {
  // Pre-signup Lambda auto-confirms the user, so we can sign in immediately.
  await signUp({ name, email, password });
  const idToken = await signIn(email, password);
  localStorage.setItem("access_token", idToken);
  return { access_token: idToken };
};

export const logoutApi = async () => {
  await signOut();
};
