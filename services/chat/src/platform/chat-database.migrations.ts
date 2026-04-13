export interface ChatDatabaseMigration {
  id: string;
  sql: string;
}

export const chatDatabaseMigrations: ChatDatabaseMigration[] = [
  {
    id: "0001_chat_messages",
    sql: `
      create table if not exists chat_messages (
        id text primary key,
        room_id text not null,
        author_subject text not null,
        author_name text,
        text text not null,
        created_at timestamptz not null default now(),
        delivery_status text not null check (delivery_status in ('queued', 'delivered'))
      );

      create index if not exists chat_messages_room_created_idx
        on chat_messages (room_id, created_at desc);
    `,
  },
  {
    id: "0002_chat_message_receipts",
    sql: `
      create table if not exists chat_message_receipts (
        message_id text not null references chat_messages(id) on delete cascade,
        subject text not null,
        delivered_at timestamptz,
        read_at timestamptz,
        primary key (message_id, subject)
      );

      create index if not exists chat_message_receipts_message_idx
        on chat_message_receipts (message_id);
    `,
  },
];
