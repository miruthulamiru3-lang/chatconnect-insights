import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getSession, getUserFriends, getConversation, sendMessage, markAsRead,
  addFriend, getUserById, setSession, getUserGroups, getGroupMessages,
  getCallSignal, initiateCall, updateMessage, deleteMessage,
  type User, type Message, type Group, type Attachment
} from "@/lib/store";
import {
  Send, LogOut, UserPlus, Check, CheckCheck, MessageCircle,
  Phone, Video, Users, Pencil, Trash2, MoreVertical, X, Share2,
  Paperclip, Image, FileText, Sparkles, Search
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CreateGroupDialog from "@/components/chat/GroupChatPanel";
import CallScreen from "@/components/chat/CallScreen";

type ChatTarget = { type: 'friend'; user: User } | { type: 'group'; group: Group };

const ChatExpandableText = ({ text, isMine, maxLength = 300 }: { text: string; isMine: boolean; maxLength?: number }) => {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxLength) return <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{text}</p>;
  return (
    <div>
      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
        {expanded ? text : text.slice(0, maxLength) + "..."}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`text-xs font-semibold mt-1.5 underline underline-offset-2 transition-colors ${isMine ? 'text-white/80 hover:text-white' : 'text-primary hover:text-primary/80'}`}
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
};

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
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [shareMsg, setShareMsg] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      setGroups(getUserGroups(currentUser.id));
      setFriends(getUserFriends(currentUser.id));
    }, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: reader.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSend = () => {
    if ((!newMessage.trim() && attachments.length === 0) || !currentUser || !selected) return;
    const atts = attachments.length > 0 ? attachments : undefined;
    if (selected.type === 'friend') {
      sendMessage(currentUser.id, selected.user.id, newMessage.trim(), undefined, atts);
    } else {
      sendMessage(currentUser.id, selected.group.id, newMessage.trim(), selected.group.id, atts);
    }
    setNewMessage("");
    setAttachments([]);
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

  const avatarColors = [
    "from-primary to-secondary",
    "from-accent to-primary",
    "from-secondary to-accent",
    "from-primary to-accent",
    "from-secondary to-primary",
  ];

  const filteredFriends = friends.filter(f => 
    !sidebarSearch || f.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );
  const filteredGroups = groups.filter(g => 
    !sidebarSearch || g.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-background gradient-mesh">
      {/* Call screen overlay */}
      {showCall && <CallScreen currentUser={currentUser} onClose={() => setShowCall(false)} />}

      {/* Sidebar */}
      <div className="w-80 border-r border-border/50 glass flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm shadow-glow relative">
                {currentUser.name[0]}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
              </div>
              <div>
                <p className="font-semibold text-sm tracking-tight">{currentUser.name}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" /> Online
                </p>
              </div>
            </div>
            <div className="flex gap-0.5">
              <CreateGroupDialog currentUser={currentUser} onCreated={(g) => { setGroups(getUserGroups(currentUser.id)); setSelected({ type: 'group', group: g }); }} />
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 transition-all" onClick={() => setShowAddFriend(!showAddFriend)}>
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showAddFriend && (
            <div className="space-y-2 p-3 bg-primary/5 rounded-2xl border border-primary/10 mb-3 animate-scale-in">
              <p className="text-xs font-semibold text-primary">Add friend by email</p>
              <div className="flex gap-2">
                <Input
                  placeholder="friend@email.com"
                  value={searchEmail}
                  onChange={e => { setSearchEmail(e.target.value); setSearchError(""); }}
                  className="rounded-xl h-9 text-sm border-primary/20 focus-visible:ring-primary/30"
                />
                <Button size="sm" className="h-9 rounded-xl bg-primary hover:bg-primary/90 shadow-glow" onClick={handleAddFriend}>Add</Button>
              </div>
              {searchError && <p className="text-xs text-destructive font-medium">{searchError}</p>}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-sm bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
            <button
              onClick={() => setTab('chats')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === 'chats' ? 'bg-primary text-primary-foreground shadow-glow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              💬 Chats
            </button>
            <button
              onClick={() => setTab('groups')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === 'groups' ? 'bg-primary text-primary-foreground shadow-glow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              👥 Groups ({groups.length})
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'chats' ? (
            filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-3 animate-float">
                  <UserPlus className="h-7 w-7 text-primary/60" />
                </div>
                <p className="text-sm font-medium">No friends yet</p>
                <p className="text-xs text-center mt-1">Add friends to start chatting</p>
              </div>
            ) : (
              filteredFriends.map((friend, i) => {
                const last = getLastMessage(friend.id);
                const unread = getUnreadCount(friend.id);
                const isSelected = selected?.type === 'friend' && selected.user.id === friend.id;
                return (
                  <button
                    key={friend.id}
                    onClick={() => setSelected({ type: 'friend', user: friend })}
                    className={`w-full flex items-center gap-3 p-3.5 transition-all duration-200 text-left relative group ${
                      isSelected 
                        ? "bg-primary/10 border-l-[3px] border-l-primary" 
                        : "hover:bg-muted/50 border-l-[3px] border-l-transparent"
                    }`}
                  >
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md transition-transform group-hover:scale-105`}>
                      {friend.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-sm truncate">{friend.name}</p>
                        {last && <span className="text-[10px] text-muted-foreground font-medium">{formatTime(last.sentAt)}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {last ? (last.attachments?.length ? '📎 Attachment' : last.content) : "Start a conversation"}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="h-5 min-w-[20px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center px-1.5 shadow-sm animate-scale-in">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )
          ) : (
            filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                <div className="h-16 w-16 rounded-3xl bg-secondary/10 flex items-center justify-center mb-3 animate-float">
                  <Users className="h-7 w-7 text-secondary/60" />
                </div>
                <p className="text-sm font-medium">No groups yet</p>
                <p className="text-xs text-center mt-1">Create a group to start</p>
              </div>
            ) : (
              filteredGroups.map((group, i) => {
                const last = getLastGroupMessage(group.id);
                const isSelected = selected?.type === 'group' && selected.group.id === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => setSelected({ type: 'group', group })}
                    className={`w-full flex items-center gap-3 p-3.5 transition-all duration-200 text-left relative group ${
                      isSelected 
                        ? "bg-primary/10 border-l-[3px] border-l-primary" 
                        : "hover:bg-muted/50 border-l-[3px] border-l-transparent"
                    }`}
                  >
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white shrink-0 shadow-md transition-transform group-hover:scale-105`}>
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-sm truncate">{group.name}</p>
                        {last && <span className="text-[10px] text-muted-foreground font-medium">{formatTime(last.sentAt)}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {last ? `${getUserById(last.senderId)?.name || '?'}: ${last.content}` : "No messages yet"}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full font-medium">{group.memberIds.length}</span>
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
            <div className="h-[70px] border-b border-border/30 glass flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-glow">
                  {selected.type === 'friend' ? selected.user.name[0] : <Users className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-bold tracking-tight">
                    {selected.type === 'friend' ? selected.user.name : selected.group.name}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {selected.type === 'friend' ? (
                      <><span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" /> Online</>
                    ) : (
                      `${selected.group.memberIds.length} members`
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-green-500/10 hover:text-green-600 transition-all" onClick={() => handleCall('audio')} title="Voice Call">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-blue-500/10 hover:text-blue-600 transition-all" onClick={() => handleCall('video')} title="Video Call">
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isMine = msg.senderId === currentUser.id;
                const senderName = selected.type === 'group' && !isMine ? getUserById(msg.senderId)?.name : null;
                const showAvatar = !isMine && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);
                return (
                  <div key={msg.id} className={`flex items-end gap-2 group animate-fade-in ${isMine ? "justify-end" : "justify-start"}`}>
                    {!isMine && (
                      <div className="flex items-end gap-1">
                        {showAvatar ? (
                          <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white text-[10px] font-bold mb-1 shrink-0">
                            {senderName?.[0] || '?'}
                          </div>
                        ) : <div className="w-7 shrink-0" />}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted">
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-36 rounded-xl">
                            <DropdownMenuItem onClick={() => setShareMsg(msg)} className="rounded-lg">
                              <Share2 className="h-3.5 w-3.5 mr-2" /> Share
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    {isMine && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted">
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-xl">
                          <DropdownMenuItem onClick={() => setShareMsg(msg)} className="rounded-lg">
                            <Share2 className="h-3.5 w-3.5 mr-2" /> Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditingMsg(msg.id); setEditContent(msg.content); }} className="rounded-lg">
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive rounded-lg" onClick={() => { deleteMessage(msg.id); }}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <div className={`max-w-[65%] rounded-2xl px-4 py-3 shadow-sm transition-all ${
                      isMine
                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-glow"
                        : "bg-card text-foreground rounded-bl-md border border-border/30"
                    }`}>
                      {senderName && showAvatar && (
                        <p className="text-[11px] font-bold mb-1.5 opacity-80 text-secondary">{senderName}</p>
                      )}
                      {editingMsg === msg.id ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                updateMessage(msg.id, editContent);
                                setEditingMsg(null);
                              }
                            }}
                            className="h-8 text-sm bg-white/20 border-0 text-inherit rounded-lg"
                            autoFocus
                          />
                          <button onClick={() => { updateMessage(msg.id, editContent); setEditingMsg(null); }} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditingMsg(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {msg.content && <ChatExpandableText text={msg.content} isMine={isMine} />}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {msg.attachments.map((att, i) =>
                                att.type.startsWith('image/') ? (
                                  <img key={i} src={att.data} alt={att.name} className="max-w-[220px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm" onClick={() => window.open(att.data, '_blank')} />
                                ) : (
                                  <a key={i} href={att.data} download={att.name} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${isMine ? 'bg-white/15 hover:bg-white/25' : 'bg-muted/80 hover:bg-muted'}`}>
                                    <FileText className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{att.name}</span>
                                  </a>
                                )
                              )}
                            </div>
                          )}
                        </>
                      )}
                      <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] font-medium ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
                          {formatTime(msg.sentAt)}
                        </span>
                        {isMine && !msg.groupId && (
                          msg.readAt
                            ? <CheckCheck className="h-3 w-3 text-white/70" />
                            : <Check className="h-3 w-3 text-white/40" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/30 glass">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 animate-scale-in">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group/att">
                      {att.type.startsWith('image/') ? (
                        <img src={att.data} alt={att.name} className="h-16 w-16 rounded-xl object-cover shadow-sm" />
                      ) : (
                        <div className="h-16 px-3 rounded-xl bg-muted/80 flex items-center gap-2 text-xs border border-border/30">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="max-w-[80px] truncate font-medium">{att.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover/att:opacity-100 transition-all shadow-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl shrink-0 h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  className="rounded-xl flex-1 h-10 bg-muted/40 border-border/30 focus-visible:ring-1 focus-visible:ring-primary/30 transition-all"
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() && attachments.length === 0}
                  className="rounded-xl h-10 w-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow transition-all disabled:opacity-40 disabled:shadow-none"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-fade-in">
            <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mb-5 shadow-glow animate-float">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground tracking-tight">Select a conversation</p>
            <p className="text-sm mt-1.5">Choose a friend or group to start chatting</p>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={!!shareMsg} onOpenChange={() => setShareMsg(null)}>
        <DialogContent className="sm:max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Share message to</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {friends.filter(f => f.id !== currentUser?.id).map((friend, i) => (
              <button
                key={friend.id}
                onClick={() => {
                  if (shareMsg && currentUser) {
                    sendMessage(currentUser.id, friend.id, `📩 Shared: "${shareMsg.content}"`);
                    setShareMsg(null);
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/80 transition-all text-left group"
              >
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-105`}>
                  {friend.name[0]}
                </div>
                <span className="text-sm font-semibold">{friend.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chat;
