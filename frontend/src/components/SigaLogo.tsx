type SigaLogoProps = {
  className?: string
}

export function SigaLogo({ className = 'h-12 w-auto max-w-full' }: SigaLogoProps) {
  return (
    <img
      src="/branding/siga-logo.png"
      alt="State Interests and Governance Authority (SIGA)"
      className={`block object-contain ${className}`}
    />
  )
}
