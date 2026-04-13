import { ApiClient, createDevAuthHeaders, demoAuthContexts } from "@galiaf/sdk";
import { LiveChatPanel } from "./live-chat-panel";

export const dynamic = "force-dynamic";

const managerCapabilities = [
  "Создание сотрудников и выдача доступов",
  "Управление объектами и сменами внутри своей организации",
  "Контроль переписок и операционных уведомлений",
];

function createApiClient() {
  return new ApiClient({
    baseUrl: process.env.GALIAF_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1",
    defaultHeaders: createDevAuthHeaders(demoAuthContexts.managerAlpha),
  });
}

export default async function ManagerCabinetPage() {
  const api = createApiClient();
  const chatBaseUrl = process.env.GALIAF_CHAT_BASE_URL ?? "http://127.0.0.1:4010";
  const [session, workspace, organizations, users, memberships, invitations] =
    await Promise.all([
      api.getSession(),
      api.getWorkspace(),
      api.listOrganizations(),
      api.listUsers(),
      api.listMemberships("org_alpha"),
      api.listInvitations("org_alpha"),
    ]);

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ color: "var(--accent)", marginBottom: "10px" }}>
        Company Manager
      </p>
      <h1 style={{ fontSize: "clamp(2.3rem, 6vw, 4.2rem)", margin: 0 }}>
        Кабинет руководителя с tenant-изоляцией.
      </h1>
      <section
        style={{
          marginTop: "28px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        {managerCapabilities.map((item) => (
          <article
            key={item}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "18px",
              padding: "20px",
              backdropFilter: "blur(10px)",
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
          `Активная организация: ${workspace.activeTenantId ?? "не выбрана"}`,
          `Пользователей в контуре: ${users.length}`,
          `Участников: ${memberships.length}`,
          `Инвайтов: ${invitations.length}`,
        ].map((item) => (
          <article
            key={item}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "18px",
              padding: "18px",
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
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Сессия</p>
          <p style={{ marginBottom: "8px" }}>{session.subject}</p>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            Роли: {session.effectiveRoles.join(", ")}
          </p>
          <p style={{ marginTop: "18px", marginBottom: "8px" }}>
            Доступные membership-контексты
          </p>
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
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Организации</p>
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
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Команда</p>
          <div style={{ display: "grid", gap: "10px" }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                <strong>{user.fullName}</strong>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {user.email}
                </p>
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
            Ожидающие приглашения
          </p>
          <div style={{ display: "grid", gap: "10px" }}>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                <strong>{invitation.email}</strong>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {invitation.roles.join(", ")} · {invitation.status}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
      <LiveChatPanel
        chatBaseUrl={chatBaseUrl}
        identity={{
          ...demoAuthContexts.managerAlpha,
          issuer: "dev-bypass",
          audiences: [],
          scopes: [],
          effectiveRoles: ["company_manager"],
          rawClaims: {},
        }}
        roomId={`org:${workspace.activeTenantId ?? "org_alpha"}`}
        subtitle="Минимальный live chat client для smoke-проверки manager/employee потока."
        title="Live Chat"
      />
    </main>
  );
}
