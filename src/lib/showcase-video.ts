export type ShowcaseVideoProvider = 'youtube' | 'vimeo';

export type ShowcaseVideo = {
  provider: ShowcaseVideoProvider;
  id: string;
  canonicalUrl: string;
  embedUrl: string;
};

const cleanHost = (hostname: string) => hostname.toLowerCase().replace(/^www\./, '');

export function parseShowcaseVideoUrl(value: string | null | undefined): ShowcaseVideo | null {
  const input = value?.trim();
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (!['https:', 'http:'].includes(url.protocol)) return null;
  const host = cleanHost(url.hostname);

  if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
    let id = '';
    const parts = url.pathname.split('/').filter(Boolean);

    if (host === 'youtu.be') id = parts[0] ?? '';
    else if (url.pathname === '/watch') id = url.searchParams.get('v') ?? '';
    else if (['shorts', 'embed', 'live'].includes(parts[0] ?? '')) id = parts[1] ?? '';

    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return {
      provider: 'youtube',
      id,
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`
    };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const candidate = host === 'player.vimeo.com' && parts[0] === 'video' ? parts[1] : parts[0];
    if (!candidate || !/^\d{5,15}$/.test(candidate)) return null;
    return {
      provider: 'vimeo',
      id: candidate,
      canonicalUrl: `https://vimeo.com/${candidate}`,
      embedUrl: `https://player.vimeo.com/video/${candidate}`
    };
  }

  return null;
}
