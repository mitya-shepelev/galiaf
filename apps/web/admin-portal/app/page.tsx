import { ApiClient, createDevAuthHeaders, demoAuthContexts } from "@galiaf/sdk";

export const dynamic = "force-dynamic";

const adminSections = [
  "Управление организациями",
  "Глобальные настройки платформы",
  "Аудит действий и журнал событий",
  "Контроль доступности backend и chat сервисов",
];

function createApiClient() {
  return new ApiClient({
    baseUrl: process.env.GALIAF_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1",
    defaultHeaders: createDevAuthHeaders(demoAuthContexts.platformAdmin),
  });
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminPortalPage() {
  const api = createApiClient();
  const [health, session, bootstrap, organizations, users] = await Promise.all([
    api.getHealth(),
    api.getSession(),
    api.getAdminBootstrap(),
    api.listOrganizations(),
    api.listUsers(),
  ]);

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ color: "var(--accent)", marginBottom: "12px" }}>
        Platform Admin
      </p>
      <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 4.5rem)", margin: 0 }}>
        Единый центр управления платформой.
      </h1>
      <section
        style={{
          marginTop: "28px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          `Организаций: ${organizations.length}`,
          `Пользователей: ${users.length}`,
          `Redis: ${health.redis}`,
          `PostgreSQL: ${health.database}`,
        ].map((item) => (
          <article
            key={item}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "20px",
              padding: "20px",
            }}
          >
            <p style={{ margin: 0 }}>{item}</p>
          </article>
        ))}
      </section>
      <section
        style={{
          marginTop: "32px",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "16px",
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
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Платформенные зоны</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {adminSections.map((section) => (
              <article
                key={section}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "18px",
                  padding: "16px",
                }}
              >
                {section}
              </article>
            ))}
          </div>
        </article>
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            padding: "24px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Текущая сессия</p>
          <p style={{ marginBottom: "8px" }}>{session.subject}</p>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            Роли: {session.effectiveRoles.join(", ")}
          </p>
          <p style={{ marginTop: "18px", marginBottom: "8px" }}>
            Разрешенные зоны: {bootstrap.allowedAreas.join(", ")}
          </p>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            Проверка сервиса: {formatDate(health.timestamp)}
          </p>
        </article>
      </section>
      <section
        style={{
          marginTop: "16px",
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "24px",
          padding: "24px",
        }}
      >
        <p style={{ color: "var(--muted)", marginTop: 0 }}>Организации</p>
        <div style={{ display: "grid", gap: "12px" }}>
          {organizations.map((organization) => (
            <article
              key={organization.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                paddingBottom: "12px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <strong>{organization.name}</strong>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {organization.id}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong>{organization.status}</strong>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {formatDate(organization.createdAt)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
