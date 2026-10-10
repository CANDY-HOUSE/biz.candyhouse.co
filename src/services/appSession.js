import { Auth } from '@aws-amplify/auth';
import { Signer } from '@aws-amplify/core';
import { Buffer } from 'buffer';
import i18n from '../i18n';
import { envConfig } from '../env_config';
import { isAndroidShell, requestNative } from './appBridge';

let nativeState;
let nativeRefreshing;
let guestToken;
let guestRefreshing;
let initialToken;
let anonymous = false;
let sessionGeneration = 0;
export const initialAppToken = () => initialToken;
export const isGuestAppSession = () => anonymous;

const tokenPayload = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
const isFresh = (token) => {
  try {
    return tokenPayload(token).exp * 1000 > Date.now() + 60000;
  } catch (_) {
    return false;
  }
};

const nativeSession = () => {
  if (!nativeRefreshing) {
    nativeRefreshing = requestNative('session')
      .then(({ data }) => {
        if (!data || (data.signedIn !== true && data.signedIn !== false) || (data.signedIn && !data.token))
          throw new Error('Session unavailable');
        // Older H5 shells return a guest token instead of a separate installation identity.
        const guestIdentityId =
          data.guestIdentityId || (!data.signedIn && data.token ? tokenPayload(data.token).identity_id : null);
        nativeState = {
          token: data.signedIn ? data.token : null,
          signedIn: data.signedIn,
          guestIdentityId,
          language: data.language,
        };
        return nativeState;
      })
      .finally(() => {
        nativeRefreshing = null;
      });
  }
  return nativeRefreshing;
};

const guestSession = () => {
  if (!guestRefreshing) {
    const generation = sessionGeneration;
    guestRefreshing = (async () => {
      const credentials = await Auth.currentCredentials();
      if (!credentials?.accessKeyId || !credentials.secretAccessKey || credentials.authenticated)
        throw new Error('Guest credentials unavailable');
      const headers = { 'Content-Type': 'application/json' };
      if (!nativeState?.guestIdentityId) throw new Error('Installation identity unavailable; update the app');
      headers.appidentifyid = nativeState.guestIdentityId;
      const request = Signer.sign(
        {
          method: 'POST',
          url: `${envConfig.getConfigAppApiUrl()}/web_route`,
          headers,
          data: JSON.stringify({ scene: 'app-session' }),
        },
        {
          access_key: credentials.accessKeyId,
          secret_key: credentials.secretAccessKey,
          session_token: credentials.sessionToken,
        },
        { service: 'execute-api', region: 'ap-northeast-1' }
      );
      // The browser supplies Host itself, matching the host used for SigV4 signing.
      delete request.headers.host;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.data,
          signal: controller.signal,
          credentials: 'omit',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Guest session unavailable (${response.status})`);
        const data = await response.json();
        if (data.isAnonymous !== true || !isFresh(data.token)) throw new Error('Invalid guest session');
        if (generation !== sessionGeneration) throw new Error('Session changed');
        guestToken = data.token;
        return guestToken;
      } finally {
        clearTimeout(timeout);
      }
    })().finally(() => {
      guestRefreshing = null;
    });
  }
  return guestRefreshing;
};

export async function prepareAppSession() {
  // Native only hands over existing sessions/keys; new guest credentials belong to Biz.
  if (isAndroidShell) {
    const { language } = await nativeSession();
    if (language) {
      const resolvedLanguage = /^zh(?:-|$)/i.test(language)
        ? /-(?:Hant|TW|HK|MO)(?:-|$)/i.test(language)
          ? 'zh-TW'
          : 'zh-CN'
        : language;
      await i18n.changeLanguage(resolvedLanguage);
    }
  }
  initialToken = await currentAppToken();
}
export async function currentAppToken() {
  try {
    const token = (await Auth.currentSession()).getIdToken().getJwtToken();
    anonymous = false;
    return token;
  } catch (error) {
    if (!isAndroidShell) throw error;
    if (!nativeState || (nativeState.signedIn && !isFresh(nativeState.token))) await nativeSession();
    if (nativeState.signedIn) {
      if (!isFresh(nativeState.token)) throw new Error('User session unavailable');
      anonymous = false;
      return nativeState.token;
    }
    const token = isFresh(guestToken) ? guestToken : await guestSession();
    anonymous = true;
    return token;
  }
}
export async function retireLegacySession() {
  sessionGeneration++;
  nativeState = undefined;
  guestToken = null;
  initialToken = null;
  anonymous = false;
  if (isAndroidShell) await requestNative('retireSession');
}

// Account binding only; business requests do not need AWS credentials or API keys.
export async function appRequestContext(expectedSub) {
  const token = await currentAppToken();
  const payload = tokenPayload(token);
  const subject = anonymous ? payload.identity_id : payload.sub;
  if (!subject || (expectedSub && subject !== expectedSub)) throw new Error('Session changed');
  if (!nativeState) await nativeSession();
  const generation = sessionGeneration;
  return {
    subject,
    identityId: nativeState.guestIdentityId,
    isCurrent: () => generation === sessionGeneration,
  };
}
