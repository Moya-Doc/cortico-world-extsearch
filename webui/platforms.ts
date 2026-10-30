import type { ExtSearchStrings } from '../src/strings.ts';

const PLATFORM_NAMES = new Map([['win32', 'Windows'], ['darwin', 'macOS'], ['linux', 'Linux']]);

export interface PlatformBadge {
  label: string;
  tone: 'windows' | 'macos' | 'linux' | 'other' | 'excluded';
}

/** npm os exclusions override inclusions; an absent list declares no platform restriction. */
export function platformBadges(os: readonly string[] | undefined, text: ExtSearchStrings): PlatformBadge[] {
  if (!os?.length || (os.length === 1 && os[0] === 'any')) return [{ label: text.platformsUnspecified, tone: 'other' }];
  const excluded = new Set(os.filter(value => value.startsWith('!')).map(value => value.slice(1)));
  const included = os.filter(value => !value.startsWith('!'));
  const supported = [...new Set(included.length ? included : [...PLATFORM_NAMES.keys()])].filter(value => !excluded.has(value));
  return [
    ...supported.map((value): PlatformBadge => ({
      label: PLATFORM_NAMES.get(value) ?? value,
      tone: value === 'win32' ? 'windows' : value === 'darwin' ? 'macos' : value === 'linux' ? 'linux' : 'other',
    })),
    ...[...excluded].map((value): PlatformBadge => ({
      label: text.platformExcluded.replace('{platform}', PLATFORM_NAMES.get(value) ?? value), tone: 'excluded',
    })),
  ];
}
