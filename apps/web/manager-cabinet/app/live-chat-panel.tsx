"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessageRecord, RequestIdentity } from "@galiaf/types";
import { io, type Socket } from "socket.io-client";

type LiveChatPanelProps = {
  chatBaseUrl: string;
  roomId: string;
  title: string;
  subtitle: string;
  identity: RequestIdentity;
  bridgeToken?: string;
};

type JoinAck = {
  roomId: string;
  socketId: string;
  participantCount: number;
  history: ChatMessageRecord[];
};

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, "");
}

function upsertMessage(
  current: ChatMessageRecord[],
  payload: ChatMessageRecord,
): ChatMessageRecord[] {
  const next = [...current.filter((item) => item.id !== payload.id), payload];

  return next.slice(-12);
}

function formatReceipts(message: ChatMessageRecord): string {
  const delivered = message.receipts.filter((item) => item.deliveredAt).length;
  const read = message.receipts.filter((item) => item.readAt).length;

  return `delivery: ${message.deliveryStatus} · delivered: ${delivered} · read: ${read}`;
}

export function LiveChatPanel({
  chatBaseUrl,
  roomId,
  title,
  subtitle,
  identity,
  bridgeToken,
}: LiveChatPanelProps) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState("connecting");
  const [input, setInput] = useState("Manager smoke message");
  const [socketId, setSocketId] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const socket = io(`${normalizeBaseUrl(chatBaseUrl)}/chat`, {
      autoConnect: false,
      transports: ["websocket"],
      auth: bridgeToken
        ? {
            token: bridgeToken,
          }
        : {
            devAuthContext: JSON.stringify(identity),
          },
    });

    socketRef.current = socket;
    setStatus("connecting");

    socket.on("connect", () => {
      setStatus("connected");
      setEvents((current) => [
        `connected:${socket.id}`,
        ...current,
      ].slice(0, 8));

      socket
        .timeout(3000)
        .emit("chat:join-room", { roomId }, (error: Error | null, ack: JoinAck) => {
          if (error) {
            setEvents((current) => [
              `join-error:${error.message}`,
              ...current,
            ].slice(0, 8));
            return;
          }

          setParticipantCount(ack.participantCount);
          setMessages(ack.history);
          setSocketId(ack.socketId);
          setEvents((current) => [
            `joined:${ack.roomId}:${ack.participantCount}`,
            ...current,
          ].slice(0, 8));
        });
    });

    socket.on("disconnect", (reason) => {
      setStatus(`disconnected:${reason}`);
    });

    socket.on(
      "chat:connected",
      (payload: {
        socketId: string;
        subject: string;
        personalRoomId: string;
      }) => {
        setSocketId(payload.socketId);
        setEvents((current) => [
          `ready:${payload.subject}:${payload.personalRoomId}`,
          ...current,
        ].slice(0, 8));
      },
    );

    socket.on("chat:message", (payload: ChatMessageRecord) => {
      setMessages((current) => upsertMessage(current, payload));

      if (payload.authorSubject !== identity.sub) {
        socket.timeout(3000).emit("chat:ack-delivered", {
          messageId: payload.id,
        });
        socket.timeout(3000).emit("chat:ack-read", {
          messageId: payload.id,
        });
      }
    });

    socket.on("chat:message-updated", (payload: ChatMessageRecord) => {
      setMessages((current) => upsertMessage(current, payload));
    });

    socket.on(
      "chat:presence",
      (payload: { subject: string; state: "online" | "offline"; roomId: string }) => {
        setEvents((current) => [
          `presence:${payload.subject}:${payload.state}:${payload.roomId}`,
          ...current,
        ].slice(0, 8));
      },
    );

    socket.on("chat:error", (payload: { message: string }) => {
      setEvents((current) => [`error:${payload.message}`, ...current].slice(0, 8));
    });

    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [bridgeToken, chatBaseUrl, identity, roomId]);

  function sendMessage() {
    const socket = socketRef.current;

    if (!socket || input.trim().length === 0) {
      return;
    }

    socket.timeout(3000).emit(
      "chat:send-message",
      {
        roomId,
        text: input.trim(),
      },
      (error: Error | null) => {
        if (error) {
          setEvents((current) => [
            `send-error:${error.message}`,
            ...current,
          ].slice(0, 8));
          return;
        }

        setInput("");
      },
    );
  }

  return (
    <section
      style={{
        marginTop: "16px",
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "24px",
        padding: "22px",
      }}
    >
      <p style={{ color: "var(--muted)", marginTop: 0 }}>{title}</p>
      <p style={{ marginTop: 0, color: "var(--muted)" }}>{subtitle}</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        {[
          `status: ${status}`,
          `socket: ${socketId ?? "pending"}`,
          `room: ${roomId}`,
          `participants: ${participantCount}`,
        ].map((item) => (
          <div
            key={item}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "12px",
            }}
          >
            {item}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: "16px",
        }}
      >
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "18px",
            padding: "14px",
            minHeight: "220px",
          }}
        >
          <p style={{ marginTop: 0, color: "var(--muted)" }}>Message feed</p>
          <div style={{ display: "grid", gap: "10px" }}>
            {messages.length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted)" }}>No messages yet.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "14px",
                    padding: "12px",
                  }}
                >
                  <strong>{message.authorName ?? message.authorSubject}</strong>
                  <p style={{ margin: "6px 0" }}>{message.text}</p>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    {formatReceipts(message)} · {message.createdAt}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "18px",
            padding: "14px",
          }}
        >
          <p style={{ marginTop: 0, color: "var(--muted)" }}>Send message</p>
          <textarea
            onChange={(event) => setInput(event.target.value)}
            rows={6}
            style={{
              width: "100%",
              resize: "vertical",
              borderRadius: "14px",
              border: "1px solid var(--line)",
              background: "rgba(255,255,255,0.58)",
              padding: "12px",
              font: "inherit",
              color: "inherit",
            }}
            value={input}
          />
          <button
            onClick={sendMessage}
            style={{
              marginTop: "10px",
              border: 0,
              borderRadius: "999px",
              padding: "12px 18px",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
            }}
            type="button"
          >
            Send into room
          </button>
          <p style={{ color: "var(--muted)", marginBottom: "6px", marginTop: "16px" }}>
            Recent events
          </p>
          <div style={{ display: "grid", gap: "6px" }}>
            {events.map((event) => (
              <code key={event} style={{ fontSize: "12px", color: "var(--muted)" }}>
                {event}
              </code>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
