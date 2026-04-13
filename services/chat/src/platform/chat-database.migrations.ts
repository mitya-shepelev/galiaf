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
];
