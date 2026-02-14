import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  getSession, getMessages, getUsers, setSession,
  type User, type Message
} from "@/lib/store";
import { LogOut, MessageSquare, Users, Eye, EyeOff, Search, Shield } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<User | null>(null);
  const [messages, setMsgs] = useState<Message[]>([]);
  const [users, setUsersState] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "read" | "unread">("all");

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
    };
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    setSession(null);
    navigate("/auth");
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || "Unknown";

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
        m.content.toLowerCase().includes(s)
      );
    })
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  const totalUsers = users.filter(u => u.role === "user").length;
  const totalMessages = messages.length;
  const unreadMessages = messages.filter(m => !m.readAt).length;

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Total Messages", value: totalMessages, icon: MessageSquare, color: "hsl(262, 83%, 58%)" },
            { label: "Active Users", value: totalUsers, icon: Users, color: "hsl(199, 89%, 48%)" },
            { label: "Unread Messages", value: unreadMessages, icon: EyeOff, color: "hsl(330, 81%, 60%)" },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-5 border" style={{ background: "hsl(230, 20%, 18%)", borderColor: "hsl(230, 15%, 25%)" }}>
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(220, 10%, 55%)" }} />
            <Input
              placeholder="Search by user or message..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-0 h-10"
              style={{ background: "hsl(230, 20%, 18%)", color: "hsl(220, 20%, 90%)" }}
            />
          </div>
          <div className="flex gap-1">
            {(["all", "read", "unread"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? "text-white" : ""
                }`}
                style={{
                  background: filter === f ? "hsl(160, 84%, 39%)" : "hsl(230, 20%, 18%)",
                  color: filter === f ? "white" : "hsl(220, 10%, 55%)",
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(230, 15%, 25%)" }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: "hsl(230, 20%, 15%)", borderColor: "hsl(230, 15%, 25%)" }}>
                <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Sender</TableHead>
                <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Receiver</TableHead>
                <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Message</TableHead>
                <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Sent</TableHead>
                <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Read</TableHead>
                <TableHead style={{ color: "hsl(220, 10%, 55%)" }}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10" style={{ color: "hsl(220, 10%, 55%)" }}>
                    No messages found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMessages.map(msg => (
                  <TableRow key={msg.id} style={{ borderColor: "hsl(230, 15%, 25%)" }} className="hover:bg-white/5">
                    <TableCell className="font-medium">{getUserName(msg.senderId)}</TableCell>
                    <TableCell>{getUserName(msg.receiverId)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{msg.content}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(msg.sentAt)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {msg.readAt ? formatDateTime(msg.readAt) : "—"}
                    </TableCell>
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
      </div>
    </div>
  );
};

export default AdminDashboard;
