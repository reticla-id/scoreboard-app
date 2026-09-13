type IconProps = { className?: string };

function Icon({ direction, className }: IconProps & { direction: "up-right" | "right" | "left" }) {
  const path = direction === "up-right" ? "M5 19 19 5M8 5h11v11" : direction === "right" ? "M4 12h16m-6-6 6 6-6 6" : "M20 12H4m6-6-6 6 6 6";
  return <svg className={className} aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}

export function ArrowUpRightIcon(props: IconProps) { return <Icon {...props} direction="up-right" />; }
export function ArrowRightIcon(props: IconProps) { return <Icon {...props} direction="right" />; }
export function ArrowLeftIcon(props: IconProps) { return <Icon {...props} direction="left" />; }
