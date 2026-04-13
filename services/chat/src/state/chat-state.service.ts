import { Injectable } from "@nestjs/common";
import type {
  ChatPresenceEvent,
  ChatRoomReference,
  RequestIdentity,
} from "@galiaf/types";

@Injectable()
export class ChatStateService {
  private readonly connections = new Map<
    string,
    {
      socketId: string;
      identity: RequestIdentity;
      joinedRooms: Set<string>;
      connectedAt: string;
    }
  >();

  public registerConnection(socketId: string, identity: RequestIdentity) {
    this.connections.set(socketId, {
      socketId,
      identity,
      joinedRooms: new Set<string>([`user:${identity.sub}`]),
      connectedAt: new Date().toISOString(),
    });
  }

  public unregisterConnection(socketId: string): {
    joinedRooms: string[];
    presenceEvents: ChatPresenceEvent[];
  } {
    const connection = this.connections.get(socketId);

    if (!connection) {
      return {
        joinedRooms: [],
        presenceEvents: [],
      };
    }

    this.connections.delete(socketId);

    const joinedRooms = Array.from(connection.joinedRooms);
    const organizationRooms = joinedRooms.filter((roomId) =>
      roomId.startsWith("org:"),
    );

    return {
      joinedRooms,
      presenceEvents: organizationRooms.map((roomId) => ({
        roomId,
        subject: connection.identity.sub,
        state: "offline" as const,
        timestamp: new Date().toISOString(),
      })),
    };
  }

  public joinRoom(socketId: string, roomId: string): boolean {
    const connection = this.connections.get(socketId);

    if (!connection) {
      return false;
    }

    const hadRoom = connection.joinedRooms.has(roomId);
    connection.joinedRooms.add(roomId);

    return !hadRoom;
  }

  public getJoinedRooms(socketId: string): string[] {
    const connection = this.connections.get(socketId);

    if (!connection) {
      return [];
    }

    return Array.from(connection.joinedRooms);
  }

  public countParticipants(roomId: string): number {
    let total = 0;

    for (const connection of this.connections.values()) {
      if (connection.joinedRooms.has(roomId)) {
        total += 1;
      }
    }

    return total;
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getSnapshot() {
    return {
      connections: this.connections.size,
      organizationRooms: Array.from(
        new Set(
          Array.from(this.connections.values())
            .flatMap((connection) => Array.from(connection.joinedRooms))
            .filter((roomId) => roomId.startsWith("org:")),
        ),
      ),
      rooms: Array.from(
        new Set(
          Array.from(this.connections.values()).flatMap((connection) =>
            Array.from(connection.joinedRooms),
          ),
        ),
      ),
    };
  }

  public parseRoom(roomId: string): ChatRoomReference | null {
    const [scope, value] = roomId.split(":");

    if (scope === "org" && value) {
      return {
        id: roomId,
        scope: "organization",
        organizationId: value,
      };
    }

    if (scope === "user" && value) {
      return {
        id: roomId,
        scope: "direct",
        subject: value,
      };
    }

    return null;
  }
}
