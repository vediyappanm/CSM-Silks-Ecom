interface SectionHeaderProps {
  label?: string;
  title: string;
  accent?: string;
  description?: string;
  align?: 'left' | 'center';
  tone?: 'dark' | 'light';
}

export function SectionHeader({
  label,
  title,
  accent,
  description,
  align = 'center',
  tone = 'dark',
}: SectionHeaderProps) {
  return (
    <div className={`section-heading ${align} ${tone}`}>
      {label && <div className="section-label">{label}</div>}
      <h2>
        {title}
        {accent && <span>{accent}</span>}
      </h2>
      {description && <p>{description}</p>}
    </div>
  );
}
