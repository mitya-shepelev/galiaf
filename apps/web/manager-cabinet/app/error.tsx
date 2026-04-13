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
          border: "1px solid rgba(176, 68, 68, 0.24)",
          borderRadius: "24px",
          padding: "28px",
        }}
      >
        <p style={{ color: "#b04444", marginTop: 0 }}>Company Manager</p>
        <h1 style={{ margin: "0 0 12px" }}>Не удалось загрузить кабинет руководителя</h1>
        <p style={{ color: "var(--muted)" }}>
          Проверь доступность `core-api` и chat service. Ошибка: {error.message}
        </p>
        <button
          onClick={() => reset()}
          style={{
            border: "none",
            borderRadius: "999px",
            padding: "12px 18px",
            background: "var(--accent)",
            color: "#ffffff",
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
