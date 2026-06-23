// Cognito client. Pool id + client id are fetched once from the backend
// (/api/auth/config) so the same build works in dev and prod. The SDK persists
// tokens in localStorage and refreshes the session automatically.
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

let _poolPromise = null;

function getPool() {
  if (!_poolPromise) {
    _poolPromise = fetch("/api/auth/config")
      .then((r) => r.json())
      .then((cfg) => new CognitoUserPool({ UserPoolId: cfg.userPoolId, ClientId: cfg.clientId }));
  }
  return _poolPromise;
}

export async function signUp({ name, email, password }) {
  const pool = await getPool();
  return new Promise((resolve, reject) => {
    pool.signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: "name", Value: name })],
      null,
      (err, res) => (err ? reject(err) : resolve(res))
    );
  });
}

export async function signIn(email, password) {
  const pool = await getPool();
  const user = new CognitoUser({ Username: email, Pool: pool });
  const details = new AuthenticationDetails({ Username: email, Password: password });
  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(session.getIdToken().getJwtToken()),
      onFailure: reject,
    });
  });
}

// Current (auto-refreshed) ID token, or null if there's no valid session.
export async function currentIdToken() {
  const pool = await getPool();
  const user = pool.getCurrentUser();
  if (!user) return null;
  return new Promise((resolve) => {
    user.getSession((err, session) => {
      if (err || !session || !session.isValid()) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export async function signOut() {
  const pool = await getPool();
  const user = pool.getCurrentUser();
  if (user) user.signOut();
}
