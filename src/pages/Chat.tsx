import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSession, getUserFriends, getConversation, sendMessage, markAsRead,
  addFriend, getUserById, setSession, getUserGroups, getGroupMessages,
  getCallSignal, initiateCall, type User, type Message, type Group
} from "@/lib/store";
import {
  Send, LogOut, UserPlus, Check, CheckCheck, MessageCircle,
  Phone, Video, Users
} from "lucide-react";
import CreateGroupDialog from "@/components/chat/GroupChatPanel";
import CallScreen from "@/components/chat/CallScreen";

type ChatTarget = { type: 'friend'; user: User } | { type: 'group'; group: Group };

const Chat = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<ChatTarget | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchError, setSearchError] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [tab, setTab] = useState<'chats' | 'groups'>('chats');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "user") {
      navigate("/auth");
      return;
    }
    setCurrentUser(session);
    setFriends(getUserFriends(session.id));
    setGroups(getUserGroups(session.id));
  }, [navigate]);

  // Poll for incoming calls
  useEffect(() => {
    if (!currentUser) return;
    const poll = setInterval(() => {
      const sig = getCallSignal();
      if (sig && (sig.receiverId === currentUser.id || sig.callerId === currentUser.id)) {
        setShowCall(true);
      }
    }, 1000);
    return () => clearInterval(poll);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !selected) return;
    const loadMessages = () => {
      if (selected.type === 'friend') {
        const conv = getConversation(currentUser.id, selected.user.id);
        setMessages(conv);
        conv.filter(m => m.receiverId === currentUser.id && !m.readAt).forEach(m => markAsRead(m.id));
      } else {
        setMessages(getGroupMessages(selected.group.id));
      }
    };
    loadMessages();
    const interval = setInterval(loadMessages, 1000);
    return () => clearInterval(interval);
  }, [currentUser, selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Refresh groups list
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      setGroups(getUserGroups(currentUser.id));
      setFriends(getUserFriends(currentUser.id));
    }, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleSend = () => {
    if (!newMessage.trim() || !currentUser || !selected) return;
    if (selected.type === 'friend') {
      sendMessage(currentUser.id, selected.user.id, newMessage.trim());
    } else {
      sendMessage(currentUser.id, selected.group.id, newMessage.trim(), selected.group.id);
    }
    setNewMessage("");
  };

  const handleAddFriend = () => {
    if (!currentUser || !searchEmail.trim()) return;
    const result = addFriend(currentUser.id, searchEmail.trim());
    if (result !== "ok") { setSearchError(result); return; }
    setSearchError("");
    setSearchEmail("");
    setShowAddFriend(false);
    setFriends(getUserFriends(currentUser.id));
  };

  const handleLogout = () => { setSession(null); navigate("/auth"); };

  const handleCall = (type: 'audio' | 'video') => {
    if (!currentUser || !selected) return;
    const receiverId = selected.type === 'friend' ? selected.user.id : selected.group.id;
    initiateCall(currentUser.id, receiverId, type, selected.type === 'group' ? selected.group.id : undefined);
    setShowCall(true);
  };

  const getUnreadCount = (friendId: string) => {
    if (!currentUser) return 0;
    return getConversation(currentUser.id, friendId).filter(m => m.receiverId === currentUser.id && !m.readAt).length;
  };

  const getLastMessage = (friendId: string) => {
    if (!currentUser) return null;
    const conv = getConversation(currentUser.id, friendId);
    return conv.length > 0 ? conv[conv.length - 1] : null;
  };

  const getLastGroupMessage = (groupId: string) => {
    const msgs = getGroupMessages(groupId);
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const colors = [
    "from-primary to-secondary",
    "from-accent to-primary",
    "from-secondary to-accent",
    "from-primary to-accent",
  ];

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Call screen overlay */}
      {showCall && <CallScreen currentUser={currentUser} onClose={() => setShowCall(false)} />}

      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card/60 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
                {currentUser.name[0]}
              </div>
              <div>
                <p className="font-semibold text-sm">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
            <div className="flex gap-1">
              <CreateGroupDialog currentUser={currentUser} onCreated={(g) => { setGroups(getUserGroups(currentUser.id)); setSelected({ type: 'group', group: g }); }} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAddFriend(!showAddFriend)}>
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showAddFriend && (
            <div className="space-y-2 p-3 bg-muted rounded-xl">
              <p className="text-xs font-medium">Add friend by email</p>
              <div className="flex gap-2">
                <Input
                  placeholder="friend@email.com"
                  value={searchEmail}
                  onChange={e => { setSearchEmail(e.target.value); setSearchError(""); }}
                  className="rounded-lg h-8 text-sm"
                />
                <Button size="sm" className="h-8 rounded-lg" onClick={handleAddFriend}>Add</Button>
              </div>
              {searchError && <p className="text-xs text-destructive">{searchError}</p>}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setTab('chats')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'chats' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setTab('groups')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'groups' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Groups ({groups.length})
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'chats' ? (
            friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <UserPlus className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No friends yet</p>
                <p className="text-xs">Add friends to start chatting</p>
              </div>
            ) : (
              friends.map((friend, i) => {
                const last = getLastMessage(friend.id);
                const unread = getUnreadCount(friend.id);
                const isSelected = selected?.type === 'friend' && selected.user.id === friend.id;
                return (
                  <button
                    key={friend.id}
                    onClick={() => setSelected({ type: 'friend', user: friend })}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${
                      isSelected ? "bg-primary/10 border-r-2 border-primary" : ""
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {friend.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-sm truncate">{friend.name}</p>
                        {last && <span className="text-[10px] text-muted-foreground">{formatTime(last.sentAt)}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {last ? last.content : "No messages yet"}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="h-5 min-w-[20px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center px-1">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )
          ) : (
            groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                <Users className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No groups yet</p>
                <p className="text-xs">Create a group to start</p>
              </div>
            ) : (
              groups.map((group, i) => {
                const last = getLastGroupMessage(group.id);
                const isSelected = selected?.type === 'group' && selected.group.id === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => setSelected({ type: 'group', group })}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${
                      isSelected ? "bg-primary/10 border-r-2 border-primary" : ""
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-sm truncate">{group.name}</p>
                        {last && <span className="text-[10px] text-muted-foreground">{formatTime(last.sentAt)}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {last ? `${getUserById(last.senderId)?.name || '?'}: ${last.content}` : "No messages yet"}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{group.memberIds.length} members</span>
                  </button>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            {/* Chat header */}
            <div className="h-16 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                  {selected.type === 'friend' ? selected.user.name[0] : <Users className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-semibold">
                    {selected.type === 'friend' ? selected.user.name : selected.group.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.type === 'friend' ? 'Online' : `${selected.group.memberIds.length} members`}
                  </p>
                </div>
              </div>
              {/* Call buttons */}
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleCall('audio')} title="Voice Call">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleCall('video')} title="Video Call">
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map(msg => {
                const isMine = msg.senderId === currentUser.id;
                const senderName = selected.type === 'group' && !isMine ? getUserById(msg.senderId)?.name : null;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                      {senderName && (
                        <p className="text-xs font-semibold mb-1 opacity-70">{senderName}</p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] ${isMine ? "text-white/70" : "text-muted-foreground"}`}>
                          {formatTime(msg.sentAt)}
                        </span>
                        {isMine && !msg.groupId && (
                          msg.readAt
                            ? <CheckCheck className="h-3 w-3 text-white/70" />
                            : <Check className="h-3 w-3 text-white/50" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card/60 backdrop-blur-sm">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  className="rounded-xl flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim()}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
              <MessageCircle className="h-10 w-10 text-primary" />
            </div>
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a friend or group to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
