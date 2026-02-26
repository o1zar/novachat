export interface User {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_developer?: number | boolean;
  is_online?: boolean;
}

export type MessageType = 'text' | 'file' | 'voice';

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_display_name?: string;
  sender_avatar_url?: string;
  sender_is_dev?: number | boolean;
  receiver_id?: string;
  group_id?: string;
  content: string;
  type: MessageType;
  file_name?: string;
  file_size?: number;
  timestamp: string;
  is_global: boolean;
}

export type ChatType = 'global' | 'direct' | 'group';

export interface Chat {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  type: ChatType;
  is_developer?: number | boolean;
  is_online?: boolean;
  description?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
}
