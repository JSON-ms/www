interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
}

/**
 * Circular avatar with an animated conic-gradient ring via CSS.
 * Falls back to a generated initial-based avatar if the image fails to load.
 */
export function Avatar({ src, alt, size = 112 }: AvatarProps) {
  const fallbackSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&size=${size * 2}&background=6c63ff&color=fff&bold=true`;

  return (
    <div className="avatar-wrapper" style={{ width: size, height: size }}>
      <img
        src={src}
        alt={alt}
        className="avatar-img"
        width={size}
        height={size}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = fallbackSrc;
        }}
      />
    </div>
  );
}
