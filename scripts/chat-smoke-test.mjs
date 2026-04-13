import { setTimeout as delay } from "node:timers/promises";
import { io } from "socket.io-client";

const managerChatBaseUrl =
  process.env.CHAT_SERVICE_URL_MANAGER ??
  process.env.CHAT_SERVICE_URL ??
  "http://127.0.0.1:4010/chat";
const employeeChatBaseUrl =
  process.env.CHAT_SERVICE_URL_EMPLOYEE ??
  process.env.CHAT_SERVICE_URL ??
  managerChatBaseUrl;
const roomId = process.env.CHAT_ROOM_ID ?? "org:org_alpha";

const managerIdentity = {
  sub: "demo-manager-alpha",
  email: "manager.alpha@galiaf.local",
  name: "Manager Alpha",
  issuer: "dev-bypass",
  audiences: [],
  scopes: [],
  clientId: "galiaf-manager-cabinet",
  activeTenantId: "org_alpha",
  platformRoles: [],
  tenantMemberships: [
    {
      organizationId: "org_alpha",
      roles: ["company_manager"],
    },
  ],
  effectiveRoles: ["company_manager"],
  rawClaims: {},
};

const employeeIdentity = {
  sub: "demo-employee-alpha",
  email: "employee.alpha@galiaf.local",
  name: "Employee Alpha",
  issuer: "dev-bypass",
  audiences: [],
  scopes: [],
  clientId: "galiaf-employee-cabinet",
  activeTenantId: "org_alpha",
  platformRoles: [],
  tenantMemberships: [
    {
      organizationId: "org_alpha",
      roles: ["employee"],
    },
  ],
  effectiveRoles: ["employee"],
  rawClaims: {},
};

function createClient(chatBaseUrl, identity) {
  return io(chatBaseUrl, {
    autoConnect: false,
    transports: ["websocket"],
    auth: {
      devAuthContext: JSON.stringify(identity),
    },
  });
}

async function waitFor(socket, eventName, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    function onEvent(payload) {
      clearTimeout(timer);
      resolve(payload);
    }

    socket.once(eventName, onEvent);
  });
}

async function main() {
  const manager = createClient(managerChatBaseUrl, managerIdentity);
  const employee = createClient(employeeChatBaseUrl, employeeIdentity);
  const testMessage = `smoke:${Date.now()}`;

  try {
    const managerConnected = waitFor(manager, "connect");
    const employeeConnected = waitFor(employee, "connect");

    manager.connect();
    employee.connect();

    await Promise.all([managerConnected, employeeConnected]);

    const managerJoin = await manager.timeout(4000).emitWithAck("chat:join-room", {
      roomId,
    });
    const employeeJoin = await employee.timeout(4000).emitWithAck("chat:join-room", {
      roomId,
    });

    if (managerJoin.participantCount !== 1) {
      throw new Error(
        `Unexpected manager participant count: expected 1, got ${managerJoin.participantCount}.`,
      );
    }

    if (employeeJoin.participantCount !== 2) {
      throw new Error(
        `Unexpected employee participant count: expected 2, got ${employeeJoin.participantCount}.`,
      );
    }

    const managerMessagePromise = waitFor(manager, "chat:message");
    const employeeMessagePromise = waitFor(employee, "chat:message");

    await manager.timeout(4000).emitWithAck("chat:send-message", {
      roomId,
      text: testMessage,
    });

    const [managerMessage, employeeMessage] = await Promise.all([
      managerMessagePromise,
      employeeMessagePromise,
    ]);

    if (managerMessage.text !== testMessage || employeeMessage.text !== testMessage) {
      throw new Error("Message payload mismatch between manager and employee.");
    }

    let unauthorizedJoinBlocked = false;

    try {
      await employee.timeout(3000).emitWithAck("chat:join-room", {
        roomId: "org:org_bravo",
      });
    } catch {
      unauthorizedJoinBlocked = true;
    }

    console.log(
      JSON.stringify(
        {
          status: "ok",
          managerChatBaseUrl,
          employeeChatBaseUrl,
          roomId,
          managerJoin,
          employeeJoin,
          managerMessage,
          employeeMessage,
          unauthorizedJoinBlocked,
        },
        null,
        2,
      ),
    );
  } finally {
    await delay(100);
    manager.disconnect();
    employee.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
