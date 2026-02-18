// Simple localStorage-based store for demo purposes
// NOTE: In production, use a real backend with proper auth

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string; // for group msgs, this is the group id
  content: string;
  sentAt: string;
  readAt: string | null;
  groupId?: string; // if set, this is a group message
}

export interface FriendRequest {
  id: string;
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Group {
  id: string;
  name: string;
  creatorId: string;
  memberIds: string[];
  createdAt: string;
}

export interface CallLog {
  id: string;
  callerId: string;
  receiverId: string; // or group id
  type: 'audio' | 'video';
  status: 'missed' | 'answered' | 'ended';
  startedAt: string;
  endedAt: string | null;
  duration: number; // seconds
  groupId?: string;
}

export interface CallSignal {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'answered' | 'ended' | 'rejected';
  startedAt: string;
  groupId?: string;
}

const USERS_KEY = 'chat_users';
const MESSAGES_KEY = 'chat_messages';
const FRIENDS_KEY = 'chat_friends';
const SESSION_KEY = 'chat_session';
const GROUPS_KEY = 'chat_groups';
const CALL_LOGS_KEY = 'chat_call_logs';
const CALL_SIGNAL_KEY = 'chat_call_signal';

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Seed demo users if empty
function seedIfEmpty() {
  const users = getUsers();
  if (users.length === 0) {
    const demoUsers: User[] = [
      { id: 'u1', name: 'Alice', email: 'alice@demo.com', password: 'pass123', role: 'user', createdAt: new Date().toISOString() },
      { id: 'u2', name: 'Bob', email: 'bob@demo.com', password: 'pass123', role: 'user', createdAt: new Date().toISOString() },
      { id: 'u3', name: 'Charlie', email: 'charlie@demo.com', password: 'pass123', role: 'user', createdAt: new Date().toISOString() },
      { id: 'admin1', name: 'Admin', email: 'admin@demo.com', password: 'admin123', role: 'admin', createdAt: new Date().toISOString() },
    ];
    set(USERS_KEY, demoUsers);
    const friends: FriendRequest[] = [
      { id: 'f1', fromId: 'u1', toId: 'u2', status: 'accepted' },
      { id: 'f2', fromId: 'u1', toId: 'u3', status: 'accepted' },
    ];
    set(FRIENDS_KEY, friends);
    const msgs: Message[] = [
      { id: 'm1', senderId: 'u1', receiverId: 'u2', content: 'Hey Bob! How are you?', sentAt: new Date(Date.now() - 3600000).toISOString(), readAt: new Date(Date.now() - 3500000).toISOString() },
      { id: 'm2', senderId: 'u2', receiverId: 'u1', content: "I'm great! What's up?", sentAt: new Date(Date.now() - 3400000).toISOString(), readAt: new Date(Date.now() - 3300000).toISOString() },
      { id: 'm3', senderId: 'u1', receiverId: 'u2', content: 'Want to grab lunch?', sentAt: new Date(Date.now() - 3200000).toISOString(), readAt: null },
      { id: 'm4', senderId: 'u1', receiverId: 'u3', content: 'Hi Charlie!', sentAt: new Date(Date.now() - 7200000).toISOString(), readAt: new Date(Date.now() - 7100000).toISOString() },
      { id: 'm5', senderId: 'u3', receiverId: 'u1', content: 'Hello Alice! Nice to hear from you.', sentAt: new Date(Date.now() - 7000000).toISOString(), readAt: null },
    ];
    set(MESSAGES_KEY, msgs);
    // Seed a demo group
    const groups: Group[] = [
      { id: 'g1', name: 'Team Chat', creatorId: 'u1', memberIds: ['u1', 'u2', 'u3'], createdAt: new Date().toISOString() },
    ];
    set(GROUPS_KEY, groups);
    // Seed group messages
    const groupMsgs: Message[] = [
      { id: 'gm1', senderId: 'u1', receiverId: 'g1', content: 'Welcome to the team chat!', sentAt: new Date(Date.now() - 1800000).toISOString(), readAt: null, groupId: 'g1' },
      { id: 'gm2', senderId: 'u2', receiverId: 'g1', content: 'Hey everyone!', sentAt: new Date(Date.now() - 1700000).toISOString(), readAt: null, groupId: 'g1' },
    ];
    const allMsgs = [...msgs, ...groupMsgs];
    set(MESSAGES_KEY, allMsgs);
  }
}

export function getUsers(): User[] {
  return get<User[]>(USERS_KEY, []);
}

export function getMessages(): Message[] {
  return get<Message[]>(MESSAGES_KEY, []);
}

export function getFriends(): FriendRequest[] {
  return get<FriendRequest[]>(FRIENDS_KEY, []);
}

export function getSession(): User | null {
  return get<User | null>(SESSION_KEY, null);
}

export function setSession(user: User | null) {
  set(SESSION_KEY, user);
}

export function register(name: string, email: string, password: string, role: UserRole): User | string {
  seedIfEmpty();
  const users = getUsers();
  if (users.find(u => u.email === email)) return 'Email already registered';
  const user: User = {
    id: crypto.randomUUID(),
    name,
    email,
    password,
    role,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  set(USERS_KEY, users);
  return user;
}

export function login(email: string, password: string): User | string {
  seedIfEmpty();
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return 'Invalid email or password';
  return user;
}

export function sendMessage(senderId: string, receiverId: string, content: string, groupId?: string): Message {
  const msgs = getMessages();
  const msg: Message = {
    id: crypto.randomUUID(),
    senderId,
    receiverId,
    content,
    sentAt: new Date().toISOString(),
    readAt: null,
    groupId,
  };
  msgs.push(msg);
  set(MESSAGES_KEY, msgs);
  return msg;
}

export function markAsRead(messageId: string) {
  const msgs = getMessages();
  const msg = msgs.find(m => m.id === messageId);
  if (msg && !msg.readAt) {
    msg.readAt = new Date().toISOString();
    set(MESSAGES_KEY, msgs);
  }
}

export function getConversation(userId1: string, userId2: string): Message[] {
  return getMessages().filter(
    m => !m.groupId && (
      (m.senderId === userId1 && m.receiverId === userId2) ||
      (m.senderId === userId2 && m.receiverId === userId1)
    )
  ).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

export function getGroupMessages(groupId: string): Message[] {
  return getMessages().filter(m => m.groupId === groupId)
    .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
}

export function getUserFriends(userId: string): User[] {
  const friends = getFriends();
  const users = getUsers();
  const friendIds = friends
    .filter(f => f.status === 'accepted' && (f.fromId === userId || f.toId === userId))
    .map(f => f.fromId === userId ? f.toId : f.fromId);
  return users.filter(u => friendIds.includes(u.id));
}

export function addFriend(userId: string, friendEmail: string): string {
  const users = getUsers();
  const friend = users.find(u => u.email === friendEmail && u.role === 'user');
  if (!friend) return 'User not found';
  if (friend.id === userId) return 'Cannot add yourself';
  const friends = getFriends();
  const existing = friends.find(f =>
    (f.fromId === userId && f.toId === friend.id) ||
    (f.fromId === friend.id && f.toId === userId)
  );
  if (existing) return 'Already friends or request pending';
  friends.push({ id: crypto.randomUUID(), fromId: userId, toId: friend.id, status: 'accepted' });
  set(FRIENDS_KEY, friends);
  return 'ok';
}

export function getUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

// Group functions
export function getGroups(): Group[] {
  return get<Group[]>(GROUPS_KEY, []);
}

export function getUserGroups(userId: string): Group[] {
  return getGroups().filter(g => g.memberIds.includes(userId));
}

export function createGroup(name: string, creatorId: string, memberIds: string[]): Group {
  const groups = getGroups();
  const group: Group = {
    id: crypto.randomUUID(),
    name,
    creatorId,
    memberIds: [...new Set([creatorId, ...memberIds])],
    createdAt: new Date().toISOString(),
  };
  groups.push(group);
  set(GROUPS_KEY, groups);
  return group;
}

export function addGroupMember(groupId: string, userId: string) {
  const groups = getGroups();
  const group = groups.find(g => g.id === groupId);
  if (group && !group.memberIds.includes(userId)) {
    group.memberIds.push(userId);
    set(GROUPS_KEY, groups);
  }
}

export function getGroupById(id: string): Group | undefined {
  return getGroups().find(g => g.id === id);
}

// Call log functions
export function getCallLogs(): CallLog[] {
  return get<CallLog[]>(CALL_LOGS_KEY, []);
}

export function addCallLog(log: Omit<CallLog, 'id'>): CallLog {
  const logs = getCallLogs();
  const entry: CallLog = { id: crypto.randomUUID(), ...log };
  logs.push(entry);
  set(CALL_LOGS_KEY, logs);
  return entry;
}

// Call signaling via localStorage
export function getCallSignal(): CallSignal | null {
  return get<CallSignal | null>(CALL_SIGNAL_KEY, null);
}

export function setCallSignal(signal: CallSignal | null) {
  set(CALL_SIGNAL_KEY, signal);
}

export function initiateCall(callerId: string, receiverId: string, type: 'audio' | 'video', groupId?: string): CallSignal {
  const signal: CallSignal = {
    id: crypto.randomUUID(),
    callerId,
    receiverId,
    type,
    status: 'ringing',
    startedAt: new Date().toISOString(),
    groupId,
  };
  setCallSignal(signal);
  return signal;
}

export function answerCall() {
  const signal = getCallSignal();
  if (signal) {
    signal.status = 'answered';
    setCallSignal(signal);
  }
}

export function endCall() {
  const signal = getCallSignal();
  if (signal) {
    const duration = Math.floor((Date.now() - new Date(signal.startedAt).getTime()) / 1000);
    addCallLog({
      callerId: signal.callerId,
      receiverId: signal.receiverId,
      type: signal.type,
      status: signal.status === 'answered' ? 'ended' : 'missed',
      startedAt: signal.startedAt,
      endedAt: new Date().toISOString(),
      duration: signal.status === 'answered' ? duration : 0,
      groupId: signal.groupId,
    });
    setCallSignal(null);
  }
}

export function rejectCall() {
  const signal = getCallSignal();
  if (signal) {
    addCallLog({
      callerId: signal.callerId,
      receiverId: signal.receiverId,
      type: signal.type,
      status: 'missed',
      startedAt: signal.startedAt,
      endedAt: new Date().toISOString(),
      duration: 0,
      groupId: signal.groupId,
    });
    setCallSignal(null);
  }
}

// Initialize seed data
seedIfEmpty();
