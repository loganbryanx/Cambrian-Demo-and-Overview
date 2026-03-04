import { useState } from "react";
import useSWR from "swr";
import TrackCard from "./TrackCard";
import AudioPreviewPlayer from "./AudioPreviewPlayer";

const GENRES = ["All", "Electronic", "Hip-Hop", "Ambient", "Pop", "Cinematic"];
const LICENSE_TYPES = ["All", "personal", "commercial", "exclusive"];

const fetcher = (url) => fetch(url).then((res) => res.json());

/**
 * MarketplaceBrowser
 *
 * Displays a paginated, filterable grid of tracks available for purchase.
 * Clicking a track opens a 30-second audio preview; clicking "Buy License"
 * initiates the checkout flow.
 */
export default function MarketplaceBrowser() {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  const [licenseType, setLicenseType] = useState("All");
  const [page, setPage] = useState(1);
  const [previewTrack, setPreviewTrack] = useState(null);

  const query = new URLSearchParams({
    ...(search && { search }),
    ...(genre !== "All" && { genre }),
    ...(licenseType !== "All" && { licenseType }),
    page,
    pageSize: 20,
  }).toString();

  const { data, error, isLoading } = useSWR(
    `/api/tracks?${query}`,
    fetcher,
    { keepPreviousData: true }
  );

  function handleBuyLicense(track, selectedLicense) {
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ trackId: track.id, licenseType: selectedLicense }],
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then(({ stripeSessionUrl }) => {
        window.location.href = stripeSessionUrl;
      })
      .catch((err) => {
        console.error("Checkout error:", err);
        alert("Unable to initiate checkout. Please check your connection and try again.");
      });
  }

  return (
    <div className="marketplace">
      {/* Search & Filter Bar */}
      <div className="marketplace__filters">
        <input
          type="search"
          placeholder="Search tracks…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="marketplace__search"
          aria-label="Search tracks"
        />

        <select
          value={genre}
          onChange={(e) => { setGenre(e.target.value); setPage(1); }}
          className="marketplace__select"
          aria-label="Filter by genre"
        >
          {GENRES.map((g) => <option key={g}>{g}</option>)}
        </select>

        <select
          value={licenseType}
          onChange={(e) => { setLicenseType(e.target.value); setPage(1); }}
          className="marketplace__select"
          aria-label="Filter by license type"
        >
          {LICENSE_TYPES.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Status Messages */}
      {error && <p className="marketplace__error">Failed to load tracks. Please try again.</p>}
      {isLoading && <p className="marketplace__loading">Loading tracks…</p>}

      {/* Track Grid */}
      {data && (
        <>
          <p className="marketplace__count">{data.total} tracks found</p>
          <div className="marketplace__grid">
            {data.items.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isPlaying={previewTrack?.id === track.id}
                onPreview={() =>
                  setPreviewTrack(previewTrack?.id === track.id ? null : track)
                }
                onBuyLicense={handleBuyLicense}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="marketplace__pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Previous
            </button>
            <span>Page {page} of {Math.ceil(data.total / 20)}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(data.total / 20)}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {/* Floating Audio Preview Player */}
      {previewTrack && (
        <AudioPreviewPlayer
          track={previewTrack}
          onClose={() => setPreviewTrack(null)}
        />
      )}
    </div>
  );
}
