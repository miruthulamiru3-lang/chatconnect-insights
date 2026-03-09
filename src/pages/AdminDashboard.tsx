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
import { LogOut, MessageSquare, Users, Eye, EyeOff, Search, Shield, Phone, Video, Activity, TrendingUp } from "lucide-react";

const ExpandableText = ({ text, maxLength = 80 }: { text: string; maxLength?: number }) => {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxLength) return <span className="whitespace-pre-wrap break-words">{text}</span>;
  return (
    <div className="whitespace-pre-wrap break-words" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
      {expanded ? text : text.slice(0, maxLength) + "..."}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="ml-1 text-xs font-semibold underline underline-offset-2 transition-colors inline"
        style={{ color: "hsl(262, 83%, 65%)" }}
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
};

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

  // Find groups assigned to this admin
  const assignedGroups = groups.filter(g => g.adminEmail === admin?.email);
  const assignedGroupIds = assignedGroups.map(g => g.id);
  const hasAssignedGroups = assignedGroupIds.length > 0;

  const filteredMessages = messages
    .filter(m => {
      if (hasAssignedGroups) {
        return m.groupId && assignedGroupIds.includes(m.groupId);
      }
      return true;
    })
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

  const displayGroups = hasAssignedGroups ? assignedGroups : groups;
  const totalUsers = users.filter(u => u.role === "user").length;
  const totalMessages = filteredMessages.length;
  const unreadMessages = filteredMessages.filter(m => !m.readAt).length;
  const totalCalls = filteredCalls.length;
  const totalGroups = displayGroups.length;

  if (!admin) return null;

  const stats = [
    { label: "Messages", value: totalMessages, icon: MessageSquare, gradient: "from-purple-500 to-indigo-600", glow: "hsl(262 83% 58% / 0.2)" },
    { label: "Users", value: totalUsers, icon: Users, gradient: "from-cyan-500 to-blue-600", glow: "hsl(199 89% 48% / 0.2)" },
    { label: "Unread", value: unreadMessages, icon: EyeOff, gradient: "from-pink-500 to-rose-600", glow: "hsl(330 81% 60% / 0.2)" },
    { label: "Calls", value: totalCalls, icon: Phone, gradient: "from-emerald-500 to-teal-600", glow: "hsl(160 84% 39% / 0.2)" },
    { label: "Groups", value: totalGroups, icon: Activity, gradient: "from-amber-500 to-orange-600", glow: "hsl(40 90% 55% / 0.2)" },
  ];

  const tabItems = [
    { key: "messages" as const, label: "Messages", icon: MessageSquare },
    { key: "calls" as const, label: "Calls", icon: Phone },
    { key: "groups" as const, label: "Groups", icon: Users },
  ];

  const tableHeaderStyle = "text-[11px] uppercase tracking-wider font-semibold";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, hsl(230 25% 10%), hsl(230 25% 14%), hsl(240 20% 12%))", color: "hsl(220, 20%, 90%)" }}>
      {/* Top bar */}
      <div className="border-b flex items-center justify-between px-6 py-4" style={{ borderColor: "hsl(230, 15%, 20%)", background: "hsla(230, 20%, 13%, 0.8)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, hsl(160, 84%, 39%), hsl(160, 84%, 30%))" }}>
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-[11px] font-medium" style={{ color: "hsl(220, 10%, 50%)" }}>
              {hasAssignedGroups
                ? `Tracking: ${assignedGroups.map(g => g.name).join(', ')}`
                : 'Communication Tracking System'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "hsl(230, 20%, 18%)" }}>
            <div className="h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(262 83% 48%))" }}>
              {admin.name[0]}
            </div>
            <span className="text-xs font-medium" style={{ color: "hsl(220, 10%, 65%)" }}>{admin.name}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            className="rounded-xl text-xs font-medium transition-all"
            style={{ color: "hsl(220, 10%, 55%)", background: "transparent" }}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-2xl p-5 border relative overflow-hidden transition-all hover:scale-[1.02] cursor-default animate-slide-up"
              style={{ 
                background: "hsl(230, 20%, 16%)", 
                borderColor: "hsl(230, 15%, 22%)",
                boxShadow: `0 8px 32px ${stat.glow}`,
                animationDelay: `${i * 80}ms`,
                animationFillMode: "both",
              }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10" style={{ background: `linear-gradient(135deg, ${stat.glow}, transparent)`, transform: "translate(30%, -30%)" }} />
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-extrabold tracking-tight">{stat.value}</p>
                  <p className="text-[11px] font-medium tracking-wide uppercase" style={{ color: "hsl(220, 10%, 50%)" }}>{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab + Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 p-1 rounded-2xl mr-4" style={{ background: "hsl(230, 20%, 15%)" }}>
            {tabItems.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: activeTab === t.key ? "linear-gradient(135deg, hsl(262 83% 58%), hsl(262 83% 48%))" : "transparent",
                  color: activeTab === t.key ? "white" : "hsl(220, 10%, 50%)",
                  boxShadow: activeTab === t.key ? "0 4px 20px hsl(262 83% 58% / 0.3)" : "none",
                }}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(220, 10%, 45%)" }} />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 rounded-xl border h-11 text-sm font-medium"
              style={{ background: "hsl(230, 20%, 16%)", color: "hsl(220, 20%, 90%)", borderColor: "hsl(230, 15%, 22%)" }}
            />
          </div>
          {activeTab === "messages" && (
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(230, 20%, 15%)" }}>
              {(["all", "read", "unread"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all uppercase tracking-wider"
                  style={{
                    background: filter === f ? "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 30%))" : "transparent",
                    color: filter === f ? "white" : "hsl(220, 10%, 50%)",
                    boxShadow: filter === f ? "0 4px 16px hsl(160 84% 39% / 0.25)" : "none",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages Table */}
        {activeTab === "messages" && (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(230, 15%, 20%)", background: "hsl(230, 20%, 14%)" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: "hsl(230, 20%, 12%)", borderColor: "hsl(230, 15%, 20%)" }}>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Sender</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Receiver / Group</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Message</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Sent</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Read</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-sm" style={{ color: "hsl(220, 10%, 40%)" }}>No messages found</TableCell></TableRow>
                ) : (
                  filteredMessages.map(msg => (
                    <TableRow key={msg.id} style={{ borderColor: "hsl(230, 15%, 18%)" }} className="transition-colors hover:bg-white/[0.03]">
                      <TableCell className="font-semibold text-sm">{getUserName(msg.senderId)}</TableCell>
                      <TableCell className="text-sm">
                        {msg.groupId ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "hsl(262 83% 58% / 0.1)", color: "hsl(262 83% 70%)" }}>
                            <Users className="h-3 w-3" /> {getGroupName(msg.groupId)}
                          </span>
                        ) : getUserName(msg.receiverId)}
                      </TableCell>
                      <TableCell className="text-sm" style={{ maxWidth: "300px", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                        <ExpandableText text={msg.content} maxLength={80} />
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap font-medium" style={{ color: "hsl(220, 10%, 50%)" }}>{formatDateTime(msg.sentAt)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap font-medium" style={{ color: "hsl(220, 10%, 50%)" }}>{msg.readAt ? formatDateTime(msg.readAt) : "—"}</TableCell>
                      <TableCell>
                        {msg.readAt ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: "hsl(160, 84%, 39%, 0.12)", color: "hsl(160, 84%, 50%)" }}>
                            <Eye className="h-3 w-3" /> Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: "hsl(330, 81%, 60%, 0.12)", color: "hsl(330, 81%, 65%)" }}>
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
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(230, 15%, 20%)", background: "hsl(230, 20%, 14%)" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: "hsl(230, 20%, 12%)", borderColor: "hsl(230, 15%, 20%)" }}>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Caller</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Receiver</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Type</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Status</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Started</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-sm" style={{ color: "hsl(220, 10%, 40%)" }}>No call logs yet</TableCell></TableRow>
                ) : (
                  filteredCalls.map(call => (
                    <TableRow key={call.id} style={{ borderColor: "hsl(230, 15%, 18%)" }} className="transition-colors hover:bg-white/[0.03]">
                      <TableCell className="font-semibold text-sm">{getUserName(call.callerId)}</TableCell>
                      <TableCell className="text-sm">
                        {call.groupId ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "hsl(262 83% 58% / 0.1)", color: "hsl(262 83% 70%)" }}>
                            <Users className="h-3 w-3" /> {getGroupName(call.groupId)}
                          </span>
                        ) : getUserName(call.receiverId)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                          {call.type === 'video' ? <Video className="h-3.5 w-3.5" style={{ color: "hsl(199 89% 55%)" }} /> : <Phone className="h-3.5 w-3.5" style={{ color: "hsl(160 84% 50%)" }} />}
                          {call.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          call.status === 'ended' ? '' :
                          call.status === 'missed' ? '' : ''
                        }`} style={{
                          background: call.status === 'ended' ? 'hsl(160 84% 39% / 0.12)' : call.status === 'missed' ? 'hsl(0 84% 60% / 0.12)' : 'hsl(40 90% 55% / 0.12)',
                          color: call.status === 'ended' ? 'hsl(160 84% 50%)' : call.status === 'missed' ? 'hsl(0 84% 65%)' : 'hsl(40 90% 60%)',
                        }}>
                          {call.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap font-medium" style={{ color: "hsl(220, 10%, 50%)" }}>{formatDateTime(call.startedAt)}</TableCell>
                      <TableCell className="text-sm font-mono font-medium">{formatDuration(call.duration)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Groups Table */}
        {activeTab === "groups" && (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(230, 15%, 20%)", background: "hsl(230, 20%, 14%)" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: "hsl(230, 20%, 12%)", borderColor: "hsl(230, 15%, 20%)" }}>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Group Name</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Creator</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Members</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Admin Email</TableHead>
                  <TableHead className={tableHeaderStyle} style={{ color: "hsl(220, 10%, 45%)" }}>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayGroups.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-sm" style={{ color: "hsl(220, 10%, 40%)" }}>No groups yet</TableCell></TableRow>
                ) : (
                  displayGroups.map(group => (
                    <TableRow key={group.id} style={{ borderColor: "hsl(230, 15%, 18%)" }} className="transition-colors hover:bg-white/[0.03]">
                      <TableCell className="font-semibold text-sm">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(262 83% 48%))" }}>
                            {group.name[0]}
                          </span>
                          {group.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{getUserName(group.creatorId)}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-wrap gap-1">
                          {group.memberIds.slice(0, 3).map(id => (
                            <span key={id} className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "hsl(230, 15%, 22%)", color: "hsl(220, 10%, 65%)" }}>
                              {getUserName(id)}
                            </span>
                          ))}
                          {group.memberIds.length > 3 && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "hsl(230, 15%, 22%)", color: "hsl(220, 10%, 50%)" }}>
                              +{group.memberIds.length - 3} more
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {group.adminEmail ? (
                          <span className="px-2 py-1 rounded-lg text-[11px] font-semibold" style={{ background: "hsl(160 84% 39% / 0.1)", color: "hsl(160 84% 50%)" }}>
                            {group.adminEmail}
                          </span>
                        ) : (
                          <span style={{ color: "hsl(220, 10%, 35%)" }}>—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap font-medium" style={{ color: "hsl(220, 10%, 50%)" }}>{formatDateTime(group.createdAt)}</TableCell>
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
