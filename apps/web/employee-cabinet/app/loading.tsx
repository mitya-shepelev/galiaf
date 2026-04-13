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
        <p style={{ color: "var(--accent)", marginTop: 0 }}>Employee</p>
        <h1 style={{ margin: "0 0 12px" }}>Загружаем рабочее пространство</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Подтягиваем профиль, membership, организации и активный tenant-контекст.
        </p>
      </section>
    </main>
  );
}
