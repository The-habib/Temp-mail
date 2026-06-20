import React, { useEffect, useState, useMemo, useRef } from "react";
import { 
  useGetDomains, 
  useCreateMailbox, 
  useGetMessages, 
  useGetMessage, 
  useDeleteMessage,
  getGetMessagesQueryKey,
  getGetMessageQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, Plus, Inbox, Trash2, Shield, X, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

function generateRandomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length);
}

export default function Home() {
  const { mailbox, setMailbox } = useMailboxStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: domains, isLoading: isLoadingDomains } = useGetDomains();
  const createMailbox = useCreateMailbox();
  
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!mailbox && domains && domains.length > 0 && !createMailbox.isPending) {
      handleCreateMailbox();
    }
  }, [mailbox, domains]);

  const handleCreateMailbox = () => {
    if (!domains || domains.length === 0) return;
    const domain = domains[0].domain;
    const username = generateRandomString(8);
    const address = `${username}@${domain}`;
    const password = generateRandomString(12);

    createMailbox.mutate(
      { data: { address, password } },
      {
        onSuccess: (data) => {
          setMailbox(data);
          setSelectedMessageId(null);
          toast({
            title: "Mailbox created",
            description: `Ready to receive emails at ${data.address}`,
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to create mailbox",
            variant: "destructive",
          });
        }
      }
    );
  };

  const { data: messages = [], isLoading: isLoadingMessages, isFetching: isFetchingMessages, refetch } = useGetMessages(
    mailbox?.id ?? "",
    {
      query: {
        enabled: !!mailbox?.id,
        refetchInterval: 5000,
        queryKey: getGetMessagesQueryKey(mailbox?.id ?? "")
      }
    }
  );

  const { data: selectedMessage, isLoading: isLoadingMessage } = useGetMessage(
    mailbox?.id ?? "",
    selectedMessageId ?? "",
    {
      query: {
        enabled: !!mailbox?.id && !!selectedMessageId,
        queryKey: getGetMessageQueryKey(mailbox?.id ?? "", selectedMessageId ?? "")
      }
    }
  );

  const deleteMessage = useDeleteMessage();

  const copyToClipboard = () => {
    if (mailbox?.address) {
      navigator.clipboard.writeText(mailbox.address);
      toast({
        title: "Copied!",
        description: "Email address copied to clipboard.",
      });
    }
  };

  const handleDeleteMessage = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mailbox?.id) return;
    
    deleteMessage.mutate(
      { id: mailbox.id, messageId },
      {
        onSuccess: () => {
          queryClient.setQueryData(getGetMessagesQueryKey(mailbox.id), (old: any) => 
            old ? old.filter((m: any) => m.id !== messageId) : old
          );
          if (selectedMessageId === messageId) {
            setSelectedMessageId(null);
          }
          toast({
            title: "Deleted",
            description: "Message has been deleted.",
          });
        }
      }
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden font-mono">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/20 z-10 flex-none">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-6 w-6" />
            <span className="font-bold text-lg tracking-tight uppercase">TempMail</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="https://github.com/replit" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-2 transition-colors">
              <span className="hidden sm:inline">Secure. Private. Ephemeral.</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col container mx-auto px-4 py-6 gap-6 min-h-0">
        
        {/* Address Banner */}
        <div className="bg-card border border-border p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 flex-none relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="flex flex-col items-center md:items-start gap-2 z-10">
            <span className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">Your temporary address</span>
            {mailbox ? (
              <div className="text-2xl md:text-3xl font-bold text-foreground break-all flex items-center gap-3">
                {mailbox.address}
                <Button variant="ghost" size="icon" onClick={copyToClipboard} className="text-primary hover:text-primary hover:bg-primary/10 transition-colors" data-testid="button-copy">
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <Skeleton className="h-10 w-64" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 z-10">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              disabled={isFetchingMessages || !mailbox}
              className="gap-2 border-primary/20 hover:border-primary/50 text-foreground"
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isFetchingMessages ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button 
              onClick={handleCreateMailbox} 
              disabled={createMailbox.isPending || isLoadingDomains}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-new-address"
            >
              <Plus className="h-4 w-4" />
              New Address
            </Button>
          </div>
        </div>

        {/* Inbox Area */}
        <div className="flex-1 min-h-0 border border-border rounded-lg bg-card overflow-hidden flex flex-col shadow-lg">
          <ResizablePanelGroup direction="horizontal">
            {/* Message List */}
            <ResizablePanel defaultSize={selectedMessageId ? 40 : 100} minSize={30} className="flex flex-col">
              <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-muted/20 flex-none">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Inbox className="h-4 w-4 text-primary" />
                  <span>INBOX</span>
                  {messages.length > 0 && (
                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">
                      {messages.length}
                    </span>
                  )}
                </div>
                {isFetchingMessages && <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />}
              </div>
              
              <ScrollArea className="flex-1">
                {isLoadingMessages ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground min-h-[300px]">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground mb-2">Waiting for incoming emails</p>
                    <p className="text-sm max-w-sm">Auto-refresh is active. Emails sent to your address will appear here instantly.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {messages.map((msg, idx) => (
                      <button
                        key={msg.id}
                        onClick={() => setSelectedMessageId(msg.id)}
                        data-testid={`message-item-${msg.id}`}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-colors relative group animate-in slide-in-from-bottom-2 fade-in duration-300 ${
                          selectedMessageId === msg.id ? "bg-muted/50 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary" : ""
                        }`}
                        style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}
                      >
                        <div className="flex items-start justify-between mb-1 gap-2">
                          <div className="flex items-center gap-2 truncate">
                            {!msg.seen && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                            <span className="font-semibold text-foreground truncate">{msg.from.name || msg.from.address}</span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-foreground mb-1 truncate pr-8">
                          {msg.subject || "No Subject"}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 pr-8">
                          {msg.intro}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteMessage(msg.id, e)}
                          data-testid={`button-delete-${msg.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </ResizablePanel>

            {/* Message Detail */}
            {selectedMessageId && (
              <>
                <ResizableHandle withHandle className="bg-border" />
                <ResizablePanel defaultSize={60} className="flex flex-col bg-card/50">
                  {isLoadingMessage ? (
                    <div className="p-6 space-y-6 flex-1 flex flex-col">
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <Skeleton className="flex-1 w-full rounded-md" />
                    </div>
                  ) : selectedMessage ? (
                    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
                      <div className="p-6 border-b border-border flex-none">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <h2 className="text-xl font-bold text-foreground break-words">{selectedMessage.subject || "No Subject"}</h2>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedMessageId(null)} className="text-muted-foreground shrink-0">
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                        
                        <div className="flex flex-col gap-1 text-sm bg-muted/30 p-3 rounded border border-border/50">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground font-semibold w-12">From:</span>
                            <span className="text-foreground break-all">
                              {selectedMessage.from.name ? `${selectedMessage.from.name} <${selectedMessage.from.address}>` : selectedMessage.from.address}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground font-semibold w-12">To:</span>
                            <span className="text-foreground break-all">
                              {selectedMessage.to.map(t => t.address).join(", ")}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground font-semibold w-12">Date:</span>
                            <span className="text-foreground">
                              {new Date(selectedMessage.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 bg-white dark:bg-zinc-950 p-6 overflow-auto">
                        {selectedMessage.html ? (
                          <div 
                            className="prose dark:prose-invert max-w-none prose-sm sm:prose-base font-sans"
                            dangerouslySetInnerHTML={{ __html: selectedMessage.html }} 
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap font-sans text-sm">{selectedMessage.text || "No content"}</pre>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      Message not found
                    </div>
                  )}
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </main>
    </div>
  );
}
