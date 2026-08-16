// Lightweight, dependency-free User-Agent parsing for landing-page analytics.
// Covers the common cases (Android/iOS/Windows/Mac/Linux, Chrome/Safari/
// Firefox/Edge/Opera, mobile vs desktop vs tablet) via plain regex — NOT a
// full UA database like ua-parser-js, just enough to be useful in the Admin
// Console's Analytics tab without adding a dependency.
export interface ParsedUserAgent {
  deviceType: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  os: string;
}

export function parseUserAgent(uaRaw: string | undefined | null): ParsedUserAgent {
  const ua = uaRaw || '';

  // Device type — order matters: iPad/Android-without-"Mobile" read as
  // tablets before the broader mobile check below catches them.
  let deviceType: ParsedUserAgent['deviceType'] = 'desktop';
  if (/iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = 'tablet';
  } else if (/Mobi|iPhone|iPod|Android/i.test(ua)) {
    deviceType = 'mobile';
  }

  // Browser — Edge/Opera claim to be Chrome, and Chrome claims to be Safari,
  // so the more specific tokens must be checked first.
  let browser = 'Unknown';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  // OS
  let os = 'Unknown';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod|CPU OS/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { deviceType, browser, os };
}
