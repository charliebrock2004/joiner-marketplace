import { isTrustedImageUrl } from "@/lib/storage";

/**
 * Renders stored job photos.
 *
 * Each URL is checked against the hosts we actually store to, so a tampered
 * database row cannot turn a listing into a request to an arbitrary server.
 * next/image is not used because Blob URLs are already optimised and would
 * otherwise need remote patterns configured per deployment.
 */
export function JobPhotos({ photos }: { photos: { id: string; url: string }[] }) {
  const safe = photos.filter((photo) => isTrustedImageUrl(photo.url));
  if (safe.length === 0) return null;

  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {safe.map((photo) => (
        <li key={photo.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt=""
            loading="lazy"
            className="aspect-4/3 w-full rounded-xl border border-line object-cover"
          />
        </li>
      ))}
    </ul>
  );
}
