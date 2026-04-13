"use client";

export default function Error({
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
          border: "1px solid rgba(255, 107, 107, 0.3)",
          borderRadius: "24px",
          padding: "28px",
        }}
      >
        <p style={{ color: "#ff8a8a", marginTop: 0 }}>Platform Admin</p>
        <h1 style={{ margin: "0 0 12px" }}>Не удалось загрузить портал администратора</h1>
        <p style={{ color: "var(--muted)" }}>
          Проверь `core-api` и повтори загрузку. Ошибка: {error.message}
        </p>
        <button
          onClick={() => reset()}
          style={{
            border: "none",
            borderRadius: "999px",
            padding: "12px 18px",
            background: "var(--accent)",
            color: "#111111",
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
