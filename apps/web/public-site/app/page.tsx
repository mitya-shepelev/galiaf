import { ApiClient } from "@galiaf/sdk";

export const dynamic = "force-dynamic";

const highlights = [
  "Охрана объектов и выездные группы",
  "Оперативный чат для команд и руководителей",
  "Цифровые кабинеты для клиентов и сотрудников",
];

function getCabinetLinks() {
  return [
    {
      title: "Публичный сайт",
      href: process.env.GALIAF_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
      note: "Маркетинговая витрина, контакты и заявки.",
    },
    {
      title: "Admin Portal",
      href: process.env.GALIAF_ADMIN_PORTAL_URL ?? "http://127.0.0.1:3001",
      note: "Управление платформой, аудит и сервисы.",
    },
    {
      title: "Manager Cabinet",
      href:
        process.env.GALIAF_MANAGER_CABINET_URL ?? "http://127.0.0.1:3002",
      note: "Сотрудники, доступы и операции организации.",
    },
    {
      title: "Employee Cabinet",
      href:
        process.env.GALIAF_EMPLOYEE_CABINET_URL ?? "http://127.0.0.1:3003",
      note: "Рабочий кабинет сотрудника и персональный контур.",
    },
  ];
}

async function loadPlatformSnapshot() {
  const api = new ApiClient({
    baseUrl: process.env.GALIAF_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1",
  });

  try {
    const [health, auth] = await Promise.all([
      api.getHealth(),
      api.getPublicAuthConfig(),
    ]);

    return {
      health,
      auth,
      error: null,
    };
  } catch (error) {
    return {
      health: null,
      auth: null,
      error: error instanceof Error ? error.message : "Unknown API error",
    };
  }
}

export default async function HomePage() {
  const snapshot = await loadPlatformSnapshot();
  const cabinetLinks = getCabinetLinks();

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "80px 24px",
      }}
    >
      <section
        style={{
          display: "grid",
          gap: "24px",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          alignItems: "end",
        }}
      >
        <div>
          <p style={{ color: "var(--accent)", marginBottom: "12px" }}>
            Galiaf Security Platform
          </p>
          <h1 style={{ fontSize: "clamp(3rem, 8vw, 5.5rem)", margin: 0 }}>
            Охрана, контроль и связь в одной системе.
          </h1>
        </div>
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            padding: "24px",
            backdropFilter: "blur(12px)",
          }}
        >
          <p style={{ color: "var(--muted)" }}>
            Публичный сайт отделен от внутренних кабинетов и служит точкой входа
            для заявок, контактов и коммерческих предложений.
          </p>
          <ul style={{ paddingLeft: "18px", marginBottom: 0 }}>
            {highlights.map((item) => (
              <li key={item} style={{ marginBottom: "8px" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section
        style={{
          marginTop: "20px",
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            padding: "24px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Состояние платформы</p>
          <p style={{ marginBottom: "8px" }}>
            Backend: {snapshot.health?.status ?? "unavailable"}
          </p>
          <p style={{ margin: "0 0 8px", color: "var(--muted)" }}>
            PostgreSQL: {snapshot.health?.database ?? "unknown"} · Redis:{" "}
            {snapshot.health?.redis ?? "unknown"}
          </p>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {snapshot.error ?? snapshot.health?.timestamp ?? "Live snapshot unavailable"}
          </p>
        </article>
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            padding: "24px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Auth contract</p>
          <p style={{ marginBottom: "8px" }}>
            Mode: {snapshot.auth?.mode ?? "unknown"}
          </p>
          <p style={{ margin: "0 0 8px", color: "var(--muted)" }}>
            Issuer: {snapshot.auth?.issuerUrl ?? "not loaded"}
          </p>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Web flow: {snapshot.auth?.flows.web ?? "n/a"} · Mobile flow:{" "}
            {snapshot.auth?.flows.mobile ?? "n/a"}
          </p>
        </article>
      </section>
      <section
        style={{
          marginTop: "20px",
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {cabinetLinks.map((link) => (
          <a
            key={link.title}
            href={link.href}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <article
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "24px",
                padding: "24px",
                minHeight: "100%",
              }}
            >
              <strong>{link.title}</strong>
              <p style={{ color: "var(--muted)", marginBottom: 0 }}>{link.note}</p>
            </article>
          </a>
        ))}
      </section>
    </main>
  );
}
