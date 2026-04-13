import { useEffect, useState } from "react";
import {
  ApiClient,
  ApiError,
  createDevAuthHeaders,
  demoAuthContexts,
  type AccessRolesSnapshot,
  type AdminBootstrap,
  type AuthSession,
  type HealthReport,
  type InvitationRecord,
  type PublicAuthContract,
  type UserRecord,
  type WorkspaceAccess,
} from "@galiaf/sdk";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const presets = [
  {
    label: "iOS simulator",
    value: "http://127.0.0.1:4000/api/v1",
  },
  {
    label: "Android emulator",
    value: "http://10.0.2.2:4000/api/v1",
  },
];

const personas = [
  {
    key: "employeeAlpha",
    title: "Employee",
    note: "Личный кабинет и tenant-scoped доступ.",
  },
  {
    key: "managerAlpha",
    title: "Manager",
    note: "Сотрудники, инвайты и рабочее пространство организации.",
  },
  {
    key: "platformAdmin",
    title: "Platform Admin",
    note: "Глобальный контур управления платформой.",
  },
] as const;

type LoadState = {
  auth: PublicAuthContract | null;
  health: HealthReport | null;
  session: AuthSession | null;
  roles: AccessRolesSnapshot | null;
  workspace: WorkspaceAccess | null;
  adminBootstrap: AdminBootstrap | null;
  organizations: Array<{ id: string; name: string; status: string }>;
  users: UserRecord[];
  invitations: InvitationRecord[];
  restrictions: string[];
  error: string | null;
};

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/u, "");
}

function stringifyBody(body: unknown): string | null {
  if (body == null) {
    return null;
  }

  if (typeof body === "string") {
    return body;
  }

  if (typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(", ");
    }
  }

  return JSON.stringify(body);
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:4000/api/v1");
  const [personaKey, setPersonaKey] =
    useState<(typeof personas)[number]["key"]>("employeeAlpha");
  const [state, setState] = useState<LoadState>({
    auth: null,
    health: null,
    session: null,
    roles: null,
    workspace: null,
    adminBootstrap: null,
    organizations: [],
    users: [],
    invitations: [],
    restrictions: [],
    error: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const apiBaseUrl = normalizeBaseUrl(baseUrl);
        const publicApi = new ApiClient({
          baseUrl: apiBaseUrl,
        });
        const privateApi = new ApiClient({
          baseUrl: apiBaseUrl,
          defaultHeaders: createDevAuthHeaders(demoAuthContexts[personaKey]),
        });
        const [health, auth, session, roles, organizations] = await Promise.all([
          publicApi.getHealth(),
          publicApi.getPublicAuthConfig(),
          privateApi.getSession(),
          privateApi.getAccessRoles(),
          privateApi.listOrganizations(),
        ]);
        const restrictions: string[] = [];
        let workspace: WorkspaceAccess | null = null;
        let adminBootstrap: AdminBootstrap | null = null;
        let users: UserRecord[] = [];
        let invitations: InvitationRecord[] = [];

        if (session.effectiveRoles.includes("platform_admin")) {
          adminBootstrap = await privateApi.getAdminBootstrap();
        } else {
          workspace = await privateApi.getWorkspace();
        }

        if (session.effectiveRoles.includes("company_manager")) {
          users = await privateApi.listUsers();
          invitations = await privateApi.listInvitations(session.activeTenantId);
        }

        if (session.effectiveRoles.includes("employee")) {
          const probes = await Promise.allSettled([
            privateApi.listUsers(),
            privateApi.listInvitations(session.activeTenantId),
          ]);

          probes.forEach((probe, index) => {
            const label = index === 0 ? "users" : "invitations";

            if (probe.status === "rejected" && probe.reason instanceof ApiError) {
              if (probe.reason.status === 403) {
                restrictions.push(`Employee access to ${label} is blocked with 403.`);
                return;
              }

              restrictions.push(
                `Employee probe for ${label} failed with ${probe.reason.status}.`,
              );
              return;
            }

            if (probe.status === "fulfilled") {
              restrictions.push(
                `Employee unexpectedly received ${label}; RBAC should be checked.`,
              );
            }
          });
        }

        if (!cancelled) {
          setState({
            auth,
            health,
            session,
            roles,
            workspace,
            adminBootstrap,
            organizations,
            users,
            invitations,
            restrictions,
            error: null,
          });
        }
      } catch (caught) {
        if (!cancelled) {
          const apiError = caught instanceof ApiError ? caught : null;
          const runtimeError = caught instanceof Error ? caught : null;

          setState({
            auth: null,
            health: null,
            session: null,
            roles: null,
            workspace: null,
            adminBootstrap: null,
            organizations: [],
            users: [],
            invitations: [],
            restrictions: [],
            error:
              apiError != null
                ? stringifyBody(apiError.body) ?? apiError.message
                : runtimeError != null
                  ? runtimeError.message
                : "Не удалось загрузить API snapshot.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, personaKey]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Galiaf Mobile</Text>
        <Text style={styles.title}>Мобильный клиент с общим auth/API contract.</Text>
        <Text style={styles.subtitle}>
          Экран уже ходит в `core-api`, получает session/access context и
          позволяет быстро проверять ролевое поведение под iOS simulator,
          Android emulator или физическое устройство.
        </Text>
        <View style={styles.urlPanel}>
          <Text style={styles.sectionTitle}>API base URL</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setBaseUrl}
            style={styles.input}
            value={baseUrl}
          />
          <View style={styles.presetRow}>
            {presets.map((preset) => (
              <Pressable
                key={preset.label}
                onPress={() => setBaseUrl(preset.value)}
                style={styles.presetButton}
              >
                <Text style={styles.presetText}>{preset.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.urlPanel}>
          <Text style={styles.sectionTitle}>Dev persona</Text>
          <View style={styles.presetRow}>
            {personas.map((persona) => (
              <Pressable
                key={persona.key}
                onPress={() => setPersonaKey(persona.key)}
                style={[
                  styles.presetButton,
                  personaKey === persona.key ? styles.presetButtonActive : null,
                ]}
              >
                <Text style={styles.presetText}>{persona.title}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.secondaryText}>
            {
              personas.find((persona) => persona.key === personaKey)?.note
            }
          </Text>
        </View>
        <View style={styles.snapshotPanel}>
          <Text style={styles.sectionTitle}>Public snapshot</Text>
          {loading ? (
            <ActivityIndicator color="#46d3a1" />
          ) : (
            <>
              <Text style={styles.snapshotText}>
                Backend: {state.health?.status ?? "unavailable"}
              </Text>
              <Text style={styles.snapshotText}>
                PostgreSQL: {state.health?.database ?? "unknown"} · Redis:{" "}
                {state.health?.redis ?? "unknown"}
              </Text>
              <Text style={styles.snapshotText}>
                Auth mode: {state.auth?.mode ?? "unknown"}
              </Text>
              <Text style={styles.snapshotText}>
                Web flow: {state.auth?.flows.web ?? "n/a"} · Mobile flow:{" "}
                {state.auth?.flows.mobile ?? "n/a"}
              </Text>
              <Text style={styles.snapshotText}>
                Mobile client: {state.auth?.clients.mobileClientId ?? "n/a"}
              </Text>
              {state.error ? (
                <Text style={styles.errorText}>{state.error}</Text>
              ) : null}
            </>
          )}
        </View>
        <View style={styles.snapshotPanel}>
          <Text style={styles.sectionTitle}>Authenticated snapshot</Text>
          {loading ? (
            <ActivityIndicator color="#46d3a1" />
          ) : (
            <>
              <Text style={styles.snapshotText}>
                Subject: {state.session?.subject ?? "n/a"}
              </Text>
              <Text style={styles.snapshotText}>
                Effective roles: {state.session?.effectiveRoles.join(", ") ?? "n/a"}
              </Text>
              <Text style={styles.snapshotText}>
                Active tenant: {state.session?.activeTenantId ?? "not selected"}
              </Text>
              <Text style={styles.snapshotText}>
                Organizations in scope: {state.organizations.length}
              </Text>
              <Text style={styles.snapshotText}>
                Role context: {state.roles?.effectiveRoles.join(", ") ?? "n/a"}
              </Text>
            </>
          )}
        </View>
        {state.adminBootstrap ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Admin bootstrap</Text>
            <Text style={styles.cardText}>
              Allowed areas: {state.adminBootstrap.allowedAreas.join(", ")}
            </Text>
          </View>
        ) : null}
        {state.workspace ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Workspace</Text>
            <Text style={styles.cardText}>
              Active tenant: {state.workspace.activeTenantId ?? "not selected"}
            </Text>
            <Text style={styles.cardText}>
              Memberships:{" "}
              {state.workspace.availableMemberships
                .map((membership) =>
                  `${membership.organizationId} (${membership.roles.join(", ")})`,
                )
                .join(" · ")}
            </Text>
          </View>
        ) : null}
        {state.users.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Users in scope</Text>
            {state.users.map((user) => (
              <Text key={user.id} style={styles.cardText}>
                {user.fullName} · {user.email}
              </Text>
            ))}
          </View>
        ) : null}
        {state.invitations.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Invitations</Text>
            {state.invitations.map((invitation) => (
              <Text key={invitation.id} style={styles.cardText}>
                {invitation.email} · {invitation.roles.join(", ")} · {invitation.status}
              </Text>
            ))}
          </View>
        ) : null}
        {state.restrictions.length > 0 ? (
          <View style={styles.snapshotPanel}>
            <Text style={styles.sectionTitle}>RBAC probes</Text>
            {state.restrictions.map((item) => (
              <Text key={item} style={styles.snapshotText}>
                {item}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0d1524",
  },
  container: {
    padding: 24,
    backgroundColor: "#0d1524",
    gap: 14,
  },
  eyebrow: {
    color: "#46d3a1",
    fontSize: 16,
    marginBottom: 12,
  },
  title: {
    color: "#f7fbff",
    fontSize: 34,
    fontWeight: "700",
  },
  subtitle: {
    color: "#c7d8ef",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  urlPanel: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#121d31",
    borderWidth: 1,
    borderColor: "#24324b",
  },
  sectionTitle: {
    color: "#f7fbff",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 12,
  },
  input: {
    borderRadius: 14,
    backgroundColor: "#0d1524",
    borderWidth: 1,
    borderColor: "#24324b",
    color: "#f7fbff",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  presetRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    flexWrap: "wrap",
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#1a2740",
  },
  presetButtonActive: {
    backgroundColor: "#22456d",
  },
  presetText: {
    color: "#dce8f8",
    fontSize: 14,
  },
  secondaryText: {
    color: "#a9bbd4",
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
  },
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#162136",
  },
  cardText: {
    color: "#dce8f8",
    fontSize: 17,
    marginBottom: 8,
  },
  snapshotPanel: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#121d31",
    borderWidth: 1,
    borderColor: "#24324b",
  },
  snapshotText: {
    color: "#dce8f8",
    fontSize: 15,
    marginBottom: 8,
  },
  errorText: {
    color: "#ff9f9f",
    fontSize: 14,
    marginTop: 8,
  },
});
