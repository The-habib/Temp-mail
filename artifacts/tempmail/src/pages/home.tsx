import { useEffect, useState } from "react";
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
import { RefreshCw, Copy, Plus, Trash2, X, Mail, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

function generateRandomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length);
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
}

export default function Home() {
  const { mailbox, setMailbox } = useMailboxStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  
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
          setMobileView("list");
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
            setMobileView("list");
          }
          toast({
            title: "Deleted",
            description: "Message has been deleted.",
          });
        }
      }
    );
  };

  const handleSelectMessage = (id: string) => {
    setSelectedMessageId(id);
    if (isMobile) {
      setMobileView("detail");
    }
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-muted/30 text-foreground overflow-hidden font-sans">
      {/* Slim Header */}
      <header className="flex-none bg-background border-b border-border z-10">
        <div className="container mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <span className="font-semibold text-sm tracking-tight">TempMail</span>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            Secure & Ephemeral
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col container mx-auto px-4 py-6 gap-6 min-h-0">
        
        {/* Address Banner */}
        {(!isMobile || mobileView === "list") && (
          <div className="flex-none flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="flex-1 bg-background border border-border rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Your Address</span>
                {mailbox ? (
                  <span 
                    className="text-base md:text-lg font-semibold text-foreground truncate cursor-pointer"
                    onClick={copyToClipboard}
                    title="Click to copy"
                  >
                    {mailbox.address}
                  </span>
                ) : (
                  <Skeleton className="h-6 w-48" />
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={copyToClipboard} 
                className="text-muted-foreground hover:text-foreground shrink-0 ml-2" 
                data-testid="button-copy"
                disabled={!mailbox}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-row items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => refetch()} 
                disabled={isFetchingMessages || !mailbox}
                className="gap-2 bg-background flex-1 md:flex-none shadow-sm"
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingMessages ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button 
                onClick={handleCreateMailbox} 
                disabled={createMailbox.isPending || isLoadingDomains}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 flex-1 md:flex-none shadow-sm"
                data-testid="button-new-address"
              >
                <Plus className="h-4 w-4" />
                <span>New Address</span>
              </Button>
            </div>
          </div>
        )}

        {/* Two Column Layout (or Mobile Views) */}
        <div className="flex-1 min-h-0 flex flex-row gap-6">
          
          {/* List Column */}
          {(!isMobile || mobileView === "list") && (
            <div className={`${isMobile ? "w-full" : "w-[380px] min-w-[35%]"} flex-none flex flex-col bg-background border border-border rounded-xl shadow-sm overflow-hidden`}>
              <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-muted/10 flex-none">
                <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                  <span>Inbox</span>
                  {messages.length > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {messages.length} messages
                    </span>
                  )}
                </div>
                {isFetchingMessages && <RefreshCw className="h-3 w-3 text-muted-foreground animate-spin" />}
              </div>
              
              <ScrollArea className="flex-1">
                {isLoadingMessages ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex flex-col gap-2 p-3 border border-border rounded-lg">
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground min-h-[300px]">
                    <Mail className="h-12 w-12 text-border mb-4 stroke-1" />
                    <p className="font-medium text-foreground mb-1">No messages yet</p>
                    <p className="text-sm">Emails sent to your address will appear here.</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {messages.map((msg) => (
                      <button
                         key={msg.id}
                         onClick={() => handleSelectMessage(msg.id)}
                         data-testid={`message-item-${msg.id}`}
                         className={`w-full text-left p-3 rounded-lg border transition-all relative group flex flex-col gap-1 ${
                           selectedMessageId === msg.id && !isMobile
                             ? "bg-primary/5 border-primary/20 shadow-sm" 
                             : "bg-background border-transparent hover:bg-muted/50"
                         }`}
                      >
                         <div className="flex items-center justify-between gap-2 w-full">
                           <div className="flex items-center gap-2 truncate flex-1">
                             {!msg.seen && (
                               <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                             )}
                             <span className="font-semibold text-sm text-foreground truncate">
                               {msg.from.name || msg.from.address}
                             </span>
                           </div>
                           <span className="text-xs text-muted-foreground flex-shrink-0">
                             {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                           </span>
                         </div>
                         
                         <div className="text-sm font-medium text-foreground truncate w-full pr-6">
                           {msg.subject || "No Subject"}
                         </div>
                         
                         <div className="text-xs text-muted-foreground truncate w-full pr-6">
                           {msg.intro}
                         </div>
                         
                         <Button
                           variant="ghost"
                           size="icon"
                           className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ${
                             isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                           } transition-opacity`}
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
            </div>
          )}

          {/* Detail Pane */}
          {(!isMobile || mobileView === "detail") && (
            <div className={`${isMobile ? "w-full" : "flex-1"} flex flex-col bg-background border border-border rounded-xl shadow-sm overflow-hidden min-w-0`}>
              {selectedMessageId ? (
                <>
                  {isLoadingMessage ? (
                    <div className="p-8 space-y-8 flex-1 flex flex-col">
                      <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-1/3" />
                        </div>
                      </div>
                      <div className="space-y-2 mt-8">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </div>
                  ) : selectedMessage ? (
                    <div className="flex flex-col h-full overflow-hidden">
                      {/* Detail Header */}
                      <div className="p-6 border-b border-border flex-none bg-background sticky top-0 z-10">
                        <div className="flex items-start justify-between gap-4 mb-6">
                          <div className="flex items-center gap-3">
                            {isMobile && (
                              <Button variant="ghost" size="icon" onClick={handleBackToList} className="shrink-0 -ml-2 text-muted-foreground">
                                <ChevronLeft className="h-5 w-5" />
                              </Button>
                            )}
                            <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight break-words">
                              {selectedMessage.subject || "No Subject"}
                            </h2>
                          </div>
                          {!isMobile && (
                            <Button variant="ghost" size="icon" onClick={() => setSelectedMessageId(null)} className="text-muted-foreground shrink-0 -mr-2">
                              <X className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
                          <span className="text-muted-foreground text-right">From</span>
                          <span className="text-foreground font-medium break-all">
                            {selectedMessage.from.name ? `${selectedMessage.from.name} <${selectedMessage.from.address}>` : selectedMessage.from.address}
                          </span>
                          
                          <span className="text-muted-foreground text-right">To</span>
                          <span className="text-foreground break-all">
                            {selectedMessage.to.map(t => t.address).join(", ")}
                          </span>
                          
                          <span className="text-muted-foreground text-right">Date</span>
                          <span className="text-foreground">
                            {new Date(selectedMessage.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Email Body */}
                      <div className="flex-1 overflow-auto bg-white dark:bg-white p-6 md:p-8 flex flex-col">
                        {selectedMessage.html ? (
                          <iframe
                            srcDoc={selectedMessage.html}
                            sandbox="allow-same-origin"
                            title="Email content"
                            className="w-full flex-1 border-0"
                            style={{ minHeight: "400px" }}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-900 leading-relaxed max-w-3xl">
                            {selectedMessage.text || "No content"}
                          </pre>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      Message not found
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 bg-muted/10">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center mb-6 shadow-sm">
                    <Mail className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-foreground mb-2">Select a message to read</p>
                  <p className="text-sm max-w-sm text-center">Choose an email from the list to view its contents here.</p>
                </div>
              )}
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}