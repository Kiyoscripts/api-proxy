type SiteLogoProps = {
  logoUrl?: string;
  alt: string;
  className?: string;
};

export function SiteLogo({ logoUrl, alt, className = "brand-logo" }: SiteLogoProps) {
  const src = logoUrl?.trim();
  if (!src) return <span className="dot" />;
  return <img className={className} src={src} alt={alt} />;
}
