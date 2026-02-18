import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createGroup, getUserFriends, type User, type Group
} from "@/lib/store";
import { Users, Plus, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";

interface CreateGroupDialogProps {
  currentUser: User;
  onCreated: (group: Group) => void;
}

const CreateGroupDialog = ({ currentUser, onCreated }: CreateGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const friends = getUserFriends(currentUser.id);

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!name.trim() || selectedMembers.length === 0) return;
    const group = createGroup(name.trim(), currentUser.id, selectedMembers);
    onCreated(group);
    setName("");
    setSelectedMembers([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Create Group">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
          <DialogDescription>Add a name and select friends to include</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Group name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="rounded-xl"
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Select members</p>
            {friends.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add friends first</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {friends.map(friend => (
                  <button
                    key={friend.id}
                    onClick={() => toggleMember(friend.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                      selectedMembers.includes(friend.id)
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
                      {friend.name[0]}
                    </div>
                    <span className="text-sm">{friend.name}</span>
                    {selectedMembers.includes(friend.id) && (
                      <span className="ml-auto text-primary text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || selectedMembers.length === 0}
            className="w-full rounded-xl bg-gradient-to-r from-primary to-accent"
          >
            <Plus className="h-4 w-4 mr-1" /> Create Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
