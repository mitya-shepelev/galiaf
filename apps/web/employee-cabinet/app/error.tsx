"use client";

export default function ErrorView({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "min(640px, 100%)",
          background: "var(--panel)",
          border: "1px solid rgba(89, 165, 255, 0.28)",
          borderRadius: "24px",
          padding: "28px",
        }}
      >
        <p style={{ color: "var(--accent)", marginTop: 0 }}>Employee</p>
        <h1 style={{ margin: "0 0 12px" }}>Не удалось открыть рабочее пространство</h1>
        <p style={{ color: "var(--muted)" }}>
          Проверь доступность backend и текущий employee context. Ошибка: {error.message}
        </p>
        <button
          onClick={() => reset()}
          style={{
            border: "none",
            borderRadius: "999px",
            padding: "12px 18px",
            background: "var(--accent)",
            color: "#0f1724",
            fontWeight: 700,
            cursor: "pointer",
          }}
          type="button"
        >
          Повторить загрузку
        </button>
      </section>
    </main>
  );
}
