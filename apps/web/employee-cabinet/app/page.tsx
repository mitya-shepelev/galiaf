import {
  ApiClient,
  createDevAuthHeaders,
  demoAuthContexts,
  type MembershipRecord,
  type OrganizationRecord,
} from "@galiaf/sdk";
import { LiveChatPanel } from "./live-chat-panel";

export const dynamic = "force-dynamic";

const capabilityBlocks = [
  "Личный dashboard и назначения",
  "Чат с командой и руководителем",
  "Уведомления, профиль и рабочая история",
];

function areDevPersonasEnabled(): boolean {
  const raw = process.env.GALIAF_ENABLE_DEV_PERSONAS;

  if (raw != null) {
    return raw === "true";
  }

  return process.env.NODE_ENV !== "production";
}

function createApiClient() {
  return new ApiClient({
    baseUrl: process.env.GALIAF_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1",
    defaultHeaders: createDevAuthHeaders(demoAuthContexts.employeeAlpha),
  });
}

function resolveOrganizationId(workspace: {
  activeTenantId?: string;
  availableMemberships: Array<{ organizationId: string }>;
}): string | undefined {
  return workspace.activeTenantId ?? workspace.availableMemberships[0]?.organizationId;
}

function membershipBadge(membership?: MembershipRecord) {
  if (!membership) {
    return "membership не найден";
  }

  return `${membership.roles.join(", ")} · ${membership.status}`;
}

function organizationCaption(
  organization: OrganizationRecord,
  membership?: MembershipRecord,
) {
  return membership
    ? `${organization.id} · ${organization.status} · ${membershipBadge(membership)}`
    : `${organization.id} · ${organization.status}`;
}

export default async function EmployeeCabinetPage() {
  if (!areDevPersonasEnabled()) {
    return (
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "72px 24px" }}>
        <p style={{ color: "var(--accent)", marginBottom: "10px" }}>Employee</p>
        <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", margin: 0 }}>
          Demo personas отключены.
        </h1>
        <article
          style={{
            marginTop: "24px",
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "24px",
            padding: "24px",
          }}
        >
          Этот кабинет больше не должен неявно работать через demo employee persona в
          production. Настрой реальный OIDC flow или временно укажи
          `GALIAF_ENABLE_DEV_PERSONAS=true` только для изолированного debug-окружения.
        </article>
      </main>
    );
  }

  const api = createApiClient();
  const chatBaseUrl = process.env.GALIAF_CHAT_BASE_URL ?? "http://127.0.0.1:4010";
  const [session, workspace, profile] = await Promise.all([
    api.getSession(),
    api.getWorkspace(),
    api.getCurrentUser(),
  ]);
  const currentOrganizationId = resolveOrganizationId(workspace);
  const organizationById = new Map(
    profile.resolvedOrganizations.map((organization) => [organization.id, organization]),
  );
  const membershipByOrganizationId = new Map(
    profile.resolvedMemberships.map((membership) => [membership.organizationId, membership]),
  );
  const currentOrganization = currentOrganizationId
    ? organizationById.get(currentOrganizationId)
    : undefined;

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
        {capabilityBlocks.map((item) => (
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
          `Активная организация: ${currentOrganizationId ?? "не выбрана"}`,
          `Доступных организаций: ${profile.resolvedOrganizations.length}`,
          `Активных membership: ${profile.resolvedMemberships.length}`,
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
          <strong>{profile.user.fullName}</strong>
          <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{profile.user.email}</p>
          <p style={{ marginBottom: "8px", color: "var(--muted)" }}>
            Рабочие роли: {session.effectiveRoles.join(", ")}
          </p>
          <p style={{ marginBottom: "8px" }}>Контексты доступа</p>
          <div style={{ display: "grid", gap: "8px" }}>
            {workspace.availableMemberships.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                  color: "var(--muted)",
                }}
              >
                Для текущего employee context пока нет доступных membership.
              </div>
            ) : null}
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
          <p style={{ marginTop: "18px", marginBottom: "8px" }}>DB-backed memberships</p>
          <div style={{ display: "grid", gap: "8px" }}>
            {profile.resolvedMemberships.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                  color: "var(--muted)",
                }}
              >
                Для сотрудника пока не найдено активных membership в базе.
              </div>
            ) : null}
            {profile.resolvedMemberships.map((membership) => (
              <div
                key={membership.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                {membership.organizationId}: {membershipBadge(membership)}
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
            {profile.resolvedOrganizations.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                  color: "var(--muted)",
                }}
              >
                У сотрудника пока нет доступных организаций в доменной модели.
              </div>
            ) : null}
            {profile.resolvedOrganizations.map((organization) => (
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
                  {organizationCaption(
                    organization,
                    membershipByOrganizationId.get(organization.id),
                  )}
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
          gridTemplateColumns: "1.2fr 0.8fr",
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
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Активный рабочий контур
          </p>
          {currentOrganization ? (
            <>
              <strong>{currentOrganization.name}</strong>
              <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                {organizationCaption(
                  currentOrganization,
                  membershipByOrganizationId.get(currentOrganization.id),
                )}
              </p>
              <p style={{ margin: "16px 0 0", color: "var(--muted)" }}>
                Кабинет сейчас показывает только собственный профиль, доступные
                membership и разрешенные организации сотрудника.
              </p>
            </>
          ) : (
            <div
              style={{
                border: "1px dashed var(--line)",
                borderRadius: "14px",
                padding: "12px",
                color: "var(--muted)",
              }}
            >
              Активная организация еще не выбрана. Employee flow должен работать
              только в пределах назначенного tenant-контекста.
            </div>
          )}
        </article>
        <article
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <p style={{ color: "var(--muted)", marginTop: 0 }}>Границы доступа</p>
          <div style={{ display: "grid", gap: "10px" }}>
            {[
              "Сотрудник видит только свои memberships и разрешенные организации.",
              "Manager-only списки пользователей и приглашений остаются за пределами employee UI.",
              "Чат подключается в рамках активной организации и не расширяет RBAC domain API.",
            ].map((item) => (
              <div
                key={item}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "12px",
                }}
              >
                {item}
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
        roomId={`org:${currentOrganizationId ?? "org_alpha"}`}
        subtitle="Минимальный live chat client для проверки подключения, presence и сообщений."
        title="Live Chat"
      />
    </main>
  );
}
