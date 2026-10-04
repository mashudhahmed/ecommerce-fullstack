// components/chat/VendorChatDrawer.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services/chat.service';
import { useAuth } from '@/hooks/useAuth';
import { User, ChatMessage } from '@/types';
import { 
  MessageSquare, 
  Send, 
  X, 
  Loader2, 
  Store, 
  User as UserIcon, 
  Minimize2, 
  Maximize2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

interface VendorChatDrawerProps {
  partner: User;
  orderId?: number;
  productId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function VendorChatDrawer({
  partner,
  orderId,
  productId,
  isOpen,
  onClose,
}: VendorChatDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll conversation every 3.5s for real-time feel
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['chat', 'conversation', partner.id],
    queryFn: () => chatService.getConversation(partner.id),
    enabled: isOpen && !!partner.id,
    refetchInterval: isOpen ? 3500 : false,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      chatService.sendMessage({
        recipientId: partner.id,
        content: text,
        orderId,
        productId,
      }),
    onSuccess: (newMsg) => {
      setContent('');
      queryClient.setQueryData<ChatMessage[]>(
        ['chat', 'conversation', partner.id],
        (old = []) => [...old, newMsg]
      );
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to send message');
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sendMutation.isPending) return;
    sendMutation.mutate(content.trim());
  };

  const partnerName = partner.vendorBusinessName || partner.name || 'Merchant';

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] h-[520px] bg-card border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="bg-zinc-950 text-white p-3.5 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
            <Store className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate">{partnerName}</h3>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              Direct Marketplace Messaging
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-muted/10">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-semibold text-foreground">No messages yet</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Ask about product specs, shipping timelines, or delivery updates.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender.id === user?.id;
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm",
                    isMe
                      ? "bg-orange-600 text-white rounded-br-none"
                      : "bg-card border border-border text-foreground rounded-bl-none"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {formatDateTime(msg.createdAt)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-card border-t border-border flex items-center gap-2">
        <Input
          placeholder="Type your message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={sendMutation.isPending}
          className="h-9 text-xs rounded-full border-border/80 focus-visible:ring-orange-500"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!content.trim() || sendMutation.isPending}
          className="h-9 w-9 rounded-full bg-orange-600 hover:bg-orange-700 text-white shrink-0"
        >
          {sendMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
