// app/admin/admins/page.tsx
'use client';

import { useState } from 'react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, Loader2, Search, ShieldAlert, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const createAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type CreateAdminForm = z.infer<typeof createAdminSchema>;

export default function AdminAdminsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { admins, adminsLoading, createAdmin, deleteAdmin } = useSuperAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm<CreateAdminForm>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  // Guard: Only Super Admin can manage administrative staff
  if (!authLoading && user?.role !== 'superadmin') {
    return (
      <div className="mx-auto max-w-md py-20 px-4 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Super Admin Restricted</h2>
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
          Admin team governance, role assignment, and credentials management require Root Super Administrator privileges.
        </p>
        <Button className="mt-6 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 gap-2" asChild>
          <Link href="/admin">
            <LayoutDashboard className="h-4 w-4" />
            Return to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const filteredAdmins = admins?.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = async (data: CreateAdminForm) => {
    setIsSubmitting(true);
    try {
      await createAdmin(data);
      setDialogOpen(false);
      form.reset();
    } catch (error) {
      // handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this admin?')) return;
    setDeletingId(id);
    try {
      await deleteAdmin(id);
    } catch (error) {
      // handled in hook
    } finally {
      setDeletingId(null);
    }
  };

  if (adminsLoading || authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Admin team management</h1>
          <p className="text-muted-foreground">Create and manage operational platform administrators</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800">
              <Plus className="mr-2 h-4 w-4" />
              Add admin
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create new admin</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Admin name" className="rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin@example.com"
                          type="email"
                          className="rounded-xl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="••••••••"
                          type="password"
                          className="rounded-xl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating…' : 'Create admin'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search admins…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 rounded-full border-border bg-muted/40 pl-10 focus-visible:border-orange-300"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Email
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Role
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Created
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdmins?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  No admins found
                </TableCell>
              </TableRow>
            ) : (
              filteredAdmins?.map((admin) => (
                <TableRow key={admin.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell className="text-muted-foreground">{admin.email}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/30 dark:text-violet-400">
                      {admin.role || 'Admin'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {formatDate(admin.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
                        onClick={() => handleDelete(admin.id)}
                        disabled={deletingId === admin.id}
                        aria-label={`Delete ${admin.name}`}
                      >
                        {deletingId === admin.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
