import type { ReactNode } from "react";

interface PanelCardProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

export function PanelCard({ eyebrow, title, children }: PanelCardProps) {
  return (
    <section
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "20px",
        padding: "24px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
      }}
    >
      <p style={{ margin: 0, opacity: 0.75, fontSize: "0.875rem" }}>{eyebrow}</p>
      <h2 style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
