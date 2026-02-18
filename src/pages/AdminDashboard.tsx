import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  getSession, getMessages, getUsers, setSession, getCallLogs, getGroups, getUserById,
  type User, type Message, type CallLog, type Group
} from "@/lib/store";
import { LogOut, MessageSquare, Users, Eye, EyeOff, Search, Shield, Phone, Video } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<User | null>(null);
  const [messages, setMsgs] = useState<Message[]>([]);
  const [users, setUsersState] = useState<User[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [groups, setGroupsState] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");
  const [activeTab, setActiveTab] = useState<"messages" | "calls" | "groups">("messages");

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "admin") {
      navigate("/auth");
      return;
    }
    setAdmin(session);
    const loadData = () => {
      setMsgs(getMessages());
      setUsersState(getUsers());
      setCallLogs(getCallLogs());
      setGroupsState(getGroups());
    };
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => { setSession(null); navigate("/auth"); };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || "Unknown";
  const getGroupName = (id: string) => groups.find(g => g.id === id)?.name || "Unknown Group";

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (s: number) => {
    if (s === 0) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const filteredMessages = messages
    .filter(m => {
      if (filter === "read") return m.readAt !== null;
      if (filter === "unread") return m.readAt === null;
      return true;
    })
    .filter(m => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        getUserName(m.senderId).toLowerCase().includes(s) ||
        getUserName(m.receiverId).toLowerCase().includes(s) ||
        m.content.toLowerCase().includes(s) ||
        (m.groupId && getGroupName(m.groupId).toLowerCase().includes(s))
      );
    })
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  const filteredCalls = callLogs
    .filter(c => {
      if (!search) return true;
      const s = search.toLowerCase();
      return getUserName(c.callerId).toLowerCase().includes(s) || getUserName(c.receiverId).toLowerCase().includes(s);
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const totalUsers = users.filter(u => u.role === "user").length;
  const totalMessages = messages.length;
  const unreadMessages = messages.filter(m => !m.readAt).length;
  const totalCalls = callLogs.length;
  const totalGroups = groups.length;

  if (!admin) return null;

  return (
    <div className="min-h-screen" style={{ background: "hsl(230, 25%, 12%)", color: "hsl(220, 20%, 90%)" }}>
      {/* Top bar */}
      <div className="border-b flex items-center justify-between px-6 py-4" style={{ borderColor: "hsl(230, 15%, 25%)", background: "hsl(230, 20%, 15%)" }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(160, 84%, 39%)" }}>
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
            <p className="text-xs" style={{ color: "hsl(220, 10%, 55%)" }}>Communication Tracking System</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "hsl(220, 10%, 55%)" }}>{admin.name}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/70 hover:text-white hover:bg-white/10">
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: "Messages", value: totalMessages, icon: MessageSquare, color: "hsl(262, 83%, 58%)" },
            { label: "Users", value: totalUsers, icon: Users, color: "hsl(199, 89%, 48%)" },
            { label: "Unread", value: unreadMessages, icon: EyeOff, color: "hsl(330, 81%, 60%)" },
            { label: "Calls", value: totalCalls, icon: Phone, color: "hsl(160, 84%, 39%)" },
            { label: "Groups", value: totalGroups, icon: Users, color: "hsl(40, 90%, 55%)" },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-4 border" style={{ background: "hsl(230, 20%, 18%)", borderColor: "hsl(230, 15%, 25%)" }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: stat.color + "22" }}>
                  <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs" style={{ color: "hsl(220, 10%, 55%)" }}>{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab + Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 mr-4">
            {(["messages", "calls", "groups"] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: activeTab === t ? "hsl(262, 83%, 58%)" : "hsl(230, 20%, 18%)",
                  color: activeTab === t ? "white" : "hsl(220, 10%, 55%)",
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(220, 10%, 55%)" }} />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-0 h-10"
              style={{ background: "hsl(230, 20%, 18%)", color: "hsl(220, 20%, 90%)" }}
            />
          </div>
          {activeTab === "messages" && (
            <div className="flex gap-1">
              {(["all", "read", "unread"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: filter === f ? "hsl(160, 84%, 39%)" : "hsl(230, 20%, 18%)",
                    color: filter === f ? "white" : "hsl(220, 10%, 55%)",
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages Table */}
        {activeTab === "messages" && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(230, 15%, 25%)" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: "hsl(230, 20%, 15%)", borderColor: "hsl(230, 15%, 25%)" }}>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Sender</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Receiver / Group</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Message</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Sent</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Read</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10" style={{ color: "hsl(220, 10%, 55%)" }}>No messages found</TableCell></TableRow>
                ) : (
                  filteredMessages.map(msg => (
                    <TableRow key={msg.id} style={{ borderColor: "hsl(230, 15%, 25%)" }} className="hover:bg-white/5">
                      <TableCell className="font-medium">{getUserName(msg.senderId)}</TableCell>
                      <TableCell>
                        {msg.groupId ? (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {getGroupName(msg.groupId)}
                          </span>
                        ) : getUserName(msg.receiverId)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{msg.content}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatDateTime(msg.sentAt)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{msg.readAt ? formatDateTime(msg.readAt) : "—"}</TableCell>
                      <TableCell>
                        {msg.readAt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ background: "hsl(160, 84%, 39%, 0.15)", color: "hsl(160, 84%, 45%)" }}>
                            <Eye className="h-3 w-3" /> Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ background: "hsl(330, 81%, 60%, 0.15)", color: "hsl(330, 81%, 60%)" }}>
                            <EyeOff className="h-3 w-3" /> Unread
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Calls Table */}
        {activeTab === "calls" && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(230, 15%, 25%)" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: "hsl(230, 20%, 15%)", borderColor: "hsl(230, 15%, 25%)" }}>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Caller</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Receiver</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Type</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Status</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Started</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10" style={{ color: "hsl(220, 10%, 55%)" }}>No call logs yet</TableCell></TableRow>
                ) : (
                  filteredCalls.map(call => (
                    <TableRow key={call.id} style={{ borderColor: "hsl(230, 15%, 25%)" }} className="hover:bg-white/5">
                      <TableCell className="font-medium">{getUserName(call.callerId)}</TableCell>
                      <TableCell>
                        {call.groupId ? (
                          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {getGroupName(call.groupId)}</span>
                        ) : getUserName(call.receiverId)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          {call.type === 'video' ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                          {call.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          call.status === 'ended' ? 'bg-green-500/15 text-green-400' :
                          call.status === 'missed' ? 'bg-red-500/15 text-red-400' :
                          'bg-yellow-500/15 text-yellow-400'
                        }`}>
                          {call.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatDateTime(call.startedAt)}</TableCell>
                      <TableCell>{formatDuration(call.duration)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Groups Table */}
        {activeTab === "groups" && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(230, 15%, 25%)" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: "hsl(230, 20%, 15%)", borderColor: "hsl(230, 15%, 25%)" }}>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Group Name</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Creator</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Members</TableHead>
                  <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10" style={{ color: "hsl(220, 10%, 55%)" }}>No groups yet</TableCell></TableRow>
                ) : (
                  groups.map(group => (
                    <TableRow key={group.id} style={{ borderColor: "hsl(230, 15%, 25%)" }} className="hover:bg-white/5">
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>{getUserName(group.creatorId)}</TableCell>
                      <TableCell>{group.memberIds.map(id => getUserName(id)).join(', ')}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatDateTime(group.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
