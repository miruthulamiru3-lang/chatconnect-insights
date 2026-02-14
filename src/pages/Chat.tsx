import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getSession, getUserFriends, getConversation, sendMessage, markAsRead,
  addFriend, getUserById, setSession, type User, type Message
} from "@/lib/store";
import { Send, LogOut, UserPlus, Search, Check, CheckCheck, MessageCircle } from "lucide-react";

const Chat = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchError, setSearchError] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "user") {
      navigate("/auth");
      return;
    }
    setCurrentUser(session);
    setFriends(getUserFriends(session.id));
  }, [navigate]);

  useEffect(() => {
    if (!currentUser || !selectedFriend) return;
    const loadMessages = () => {
      const conv = getConversation(currentUser.id, selectedFriend.id);
      setMessages(conv);
      // Mark unread messages as read
      conv.filter(m => m.receiverId === currentUser.id && !m.readAt).forEach(m => markAsRead(m.id));
    };
    loadMessages();
    const interval = setInterval(loadMessages, 1000);
    return () => clearInterval(interval);
  }, [currentUser, selectedFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !currentUser || !selectedFriend) return;
    sendMessage(currentUser.id, selectedFriend.id, newMessage.trim());
    setNewMessage("");
    setMessages(getConversation(currentUser.id, selectedFriend.id));
  };

  const handleAddFriend = () => {
    if (!currentUser || !searchEmail.trim()) return;
    const result = addFriend(currentUser.id, searchEmail.trim());
    if (result !== "ok") {
      setSearchError(result);
      return;
    }
    setSearchError("");
    setSearchEmail("");
    setShowAddFriend(false);
    setFriends(getUserFriends(currentUser.id));
  };

  const handleLogout = () => {
    setSession(null);
    navigate("/auth");
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
        </div>

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <UserPlus className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No friends yet</p>
              <p className="text-xs">Add friends to start chatting</p>
            </div>
          ) : (
            friends.map((friend, i) => {
              const last = getLastMessage(friend.id);
              const unread = getUnreadCount(friend.id);
              return (
                <button
                  key={friend.id}
                  onClick={() => setSelectedFriend(friend)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${
                    selectedFriend?.id === friend.id ? "bg-primary/10 border-r-2 border-primary" : ""
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
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            {/* Chat header */}
            <div className="h-16 border-b border-border bg-card/60 backdrop-blur-sm flex items-center gap-3 px-5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                {selectedFriend.name[0]}
              </div>
              <div>
                <p className="font-semibold">{selectedFriend.name}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map(msg => {
                const isMine = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] ${isMine ? "text-white/70" : "text-muted-foreground"}`}>
                          {formatTime(msg.sentAt)}
                        </span>
                        {isMine && (
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
            <p className="text-sm">Choose a friend to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
