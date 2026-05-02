export function GroupColorDot({
  color,
  size = 12,
}: {
  color: string | null;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        background: color || "var(--accent)",
        border: "2px solid var(--ink)",
        borderRadius: "999px",
        flexShrink: 0,
      }}
      aria-hidden
    />
  );
}
