'use client';

import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { users, usersLoading, deleteUser } = useAdmin();

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <div>Access denied</div>;
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    try {
      await deleteUser(id);
      toast.success('User deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete user');
    }
  };

  if (usersLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge 
                    variant={u.role === 'admin' ? 'default' : 'secondary'}
                  >
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={u.isVerified ? 'default' : 'destructive'}
                  >
                    {u.isVerified ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(u.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {u.role !== 'superadmin' && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(u.id, u.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}