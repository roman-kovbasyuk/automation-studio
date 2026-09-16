import './banner-ratio-icon.css'

export function BannerRatioIcon({ width, height }) {
  const w = 64 * Math.min(1, width / height)
  const h = 64 * Math.min(1, height / width)
  return <span className="bs-banner-ratio-icon" aria-hidden="true"><svg viewBox="0 0 100 80">
    <rect x={(100 - w) / 2} y={(80 - h) / 2} width={w} height={h} fill="none" stroke="currentColor" strokeWidth="1" />
  </svg></span>
}
