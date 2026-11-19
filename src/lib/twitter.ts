const TWEET_RE = /^https?:\/\/(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,30}|i)\/status\/(\d+)/i;

type FxMedia = {
  videos?: { url?: string }[];
  photos?: { url?: string }[];
};

type VxMedia = {
  media_extended?: { type?: string; url?: string }[];
  mediaURLs?: string[];
};

function pickUrlFromFx(data: { tweet?: { media?: FxMedia } }): string | null {
  const media = data.tweet?.media;
  return media?.videos?.[0]?.url ?? media?.photos?.[0]?.url ?? null;
}

function pickUrlFromVx(data: VxMedia): string | null {
  return data.media_extended?.[0]?.url ?? data.mediaURLs?.[0] ?? null;
}

/** Resolves a public X/Twitter post URL to its direct MP4 (GIF/video) or image URL. */
export async function resolveTwitterMediaUrl(tweetUrl: string): Promise<string> {
  const match = tweetUrl.trim().match(TWEET_RE);
  if (!match) {
    throw new Error('Pega un link válido de X / Twitter (ej. https://x.com/.../status/...).');
  }

  const [, user, id] = match;
  const endpoints = [
    { url: `https://api.fxtwitter.com/${user}/status/${id}`, pick: pickUrlFromFx },
    { url: `https://api.vxtwitter.com/${user}/status/${id}`, pick: pickUrlFromVx },
  ] as const;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint.url, { headers: { 'User-Agent': 'byb-stickers/1.0' } });
      if (!res.ok) continue;
      const json = await res.json();
      const mediaUrl = endpoint.pick(json);
      if (mediaUrl) return mediaUrl;
    } catch {
      // Try fallback endpoint
    }
  }

  throw new Error('No se encontró una imagen o GIF en ese link (verifica que el tweet sea público).');
}
