export default function Loading() {
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
          width: "min(560px, 100%)",
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "24px",
          padding: "28px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--accent)", marginTop: 0 }}>Platform Admin</p>
        <h1 style={{ margin: "0 0 12px" }}>Загружаем состояние платформы</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Подтягиваем организации, пользователей, membership и health сервисов.
        </p>
      </section>
    </main>
  );
}
