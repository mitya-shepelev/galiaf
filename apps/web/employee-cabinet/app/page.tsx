import { ApiClient, createDevAuthHeaders, demoAuthContexts } from "@galiaf/sdk";
import { LiveChatPanel } from "./live-chat-panel";

export const dynamic = "force-dynamic";

const blocks = [
  "Личный dashboard и назначения",
  "Чат с командой и руководителем",
  "Уведомления, профиль и рабочая история",
];

function createApiClient() {
  return new ApiClient({
    baseUrl: process.env.GALIAF_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1",
    defaultHeaders: createDevAuthHeaders(demoAuthContexts.employeeAlpha),
  });
}

export default async function EmployeeCabinetPage() {
  const api = createApiClient();
  const chatBaseUrl = process.env.GALIAF_CHAT_BASE_URL ?? "http://127.0.0.1:4010";
  const [session, workspace, organizations] = await Promise.all([
    api.getSession(),
    api.getWorkspace(),
    api.listOrganizations(),
  ]);

  return (
    <main style={{ maxWidth: "1024px", margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ color: "var(--accent)", marginBottom: "10px" }}>Employee</p>
      <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", margin: 0 }}>
        Рабочее пространство сотрудника.
      </h1>
      <section
        style={{
          marginTop: "32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {blocks.map((item) => (
          <article
            key={item}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "20px",
              padding: "22px",
            }}
          >
            {item}
          </article>
        ))}
      </section>
      <section
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          `Текущая роль: ${session.effectiveRoles.join(", ")}`,
          `Активная организация: ${workspace.activeTenantId ?? "не выбрана"}`,
          `Доступных организаций: ${organizations.length}`,
        ].map((item) => (
          <article
            key={item}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "20px",
              padding: "22px",
            }}
          >
            {item}
          </article>
        ))}
      </section>
      <section
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Профиль</p>
          <strong>{session.subject}</strong>
          <p style={{ marginBottom: "8px", color: "var(--muted)" }}>
            Рабочие роли: {session.effectiveRoles.join(", ")}
          </p>
          <p style={{ marginBottom: "8px" }}>Контексты доступа</p>
          <div style={{ display: "grid", gap: "8px" }}>
            {workspace.availableMemberships.map((membership) => (
              <div
                key={membership.organizationId}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                {membership.organizationId}: {membership.roles.join(", ")}
              </div>
            ))}
          </div>
        </article>
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Организации сотрудника
          </p>
          <div style={{ display: "grid", gap: "10px" }}>
            {organizations.map((organization) => (
              <div
                key={organization.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                <strong>{organization.name}</strong>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {organization.id} · {organization.status}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
      <LiveChatPanel
        chatBaseUrl={chatBaseUrl}
        identity={{
          ...demoAuthContexts.employeeAlpha,
          issuer: "dev-bypass",
          audiences: [],
          scopes: [],
          effectiveRoles: ["employee"],
          rawClaims: {},
        }}
        roomId={`org:${workspace.activeTenantId ?? "org_alpha"}`}
        subtitle="Минимальный live chat client для проверки подключения, presence и сообщений."
        title="Live Chat"
      />
    </main>
  );
}
