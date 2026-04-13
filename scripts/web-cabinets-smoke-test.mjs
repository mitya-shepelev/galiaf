import { setTimeout as delay } from "node:timers/promises";

const coreApiUrl = process.env.CORE_API_URL ?? "http://127.0.0.1:4000/api/v1";
const adminPortalUrl = process.env.ADMIN_PORTAL_URL ?? "http://127.0.0.1:3001";
const managerCabinetUrl =
  process.env.MANAGER_CABINET_URL ?? "http://127.0.0.1:3002";
const employeeCabinetUrl =
  process.env.EMPLOYEE_CABINET_URL ?? "http://127.0.0.1:3003";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchWithRetry(url, options = {}, attempts = 20, delayMs = 500) {
  let lastError = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      await delay(delayMs);
    }
  }

  throw lastError ?? new Error(`Request to ${url} failed.`);
}

async function fetchHtml(url) {
  const response = await fetchWithRetry(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
    },
  });
  const html = await response.text();

  return {
    status: response.status,
    html,
  };
}

async function fetchHealth() {
  const response = await fetchWithRetry(`${coreApiUrl}/health`, {
    headers: {
      accept: "application/json",
    },
  });

  return response.json();
}

async function checkPage({ name, url, markers }) {
  const { status, html } = await fetchHtml(url);

  assert(status === 200, `${name} returned unexpected status ${status}.`);

  for (const marker of markers) {
    assert(
      html.includes(marker),
      `${name} page does not include expected marker: ${marker}`,
    );
  }

  return {
    name,
    url,
    markersChecked: markers.length,
    htmlLength: html.length,
  };
}

async function main() {
  const health = await fetchHealth();

  assert(health.status === "ok", "Core API healthcheck did not return ok status.");

  const results = await Promise.all([
    checkPage({
      name: "admin-portal",
      url: adminPortalUrl,
      markers: [
        "Platform Admin",
        "Единый центр управления платформой.",
        "Создать организацию",
        "Организации",
        "Пользователи платформы",
      ],
    }),
    checkPage({
      name: "manager-cabinet",
      url: managerCabinetUrl,
      markers: [
        "Company Manager",
        "Кабинет руководителя с live tenant-операциями.",
        "Создать приглашение",
        "Создать сотрудника",
        "Команда организации",
        "Ожидающие приглашения",
      ],
    }),
    checkPage({
      name: "employee-cabinet",
      url: employeeCabinetUrl,
      markers: [
        "Employee",
        "Рабочее пространство сотрудника.",
        "DB-backed memberships",
        "Организации сотрудника",
        "Границы доступа",
      ],
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        status: "ok",
        coreApiUrl,
        health,
        pages: results,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
