// Vercel serverless function: returns what you're listening to, via Last.fm.
// Env vars (set in Vercel project settings):
//   LASTFM_API_KEY  - from https://www.last.fm/api/account/create
//   LASTFM_USER     - your Last.fm username
// Last.fm scrobbles from Spotify, Apple Music, YouTube Music, etc.

export default async function handler(req, res) {
  const key = process.env.LASTFM_API_KEY;
  const user = process.env.LASTFM_USER;

  if (!key || !user) {
    res.status(500).json({ error: "Missing LASTFM_API_KEY or LASTFM_USER" });
    return;
  }

  try {
    const url =
      "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks" +
      `&user=${encodeURIComponent(user)}&api_key=${key}&format=json&limit=1`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Last.fm responded ${r.status}`);
    const data = await r.json();

    const t = data?.recenttracks?.track?.[0];
    if (!t) {
      res.status(200).json({ nowPlaying: false, track: null });
      return;
    }

    const images = t.image || [];
    const art = (images[images.length - 1] || {})["#text"] || "";
    const nowPlaying = t["@attr"]?.nowplaying === "true";

    // Short cache so the page feels live without hammering Last.fm.
    res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
    res.status(200).json({
      nowPlaying,
      track: t.name,
      artist: t.artist?.["#text"] || "",
      album: t.album?.["#text"] || "",
      image: art,
      url: t.url,
      playedAt: nowPlaying ? null : Number(t.date?.uts) || null,
    });
  } catch (e) {
    res.status(502).json({ error: "Could not reach Last.fm" });
  }
}
