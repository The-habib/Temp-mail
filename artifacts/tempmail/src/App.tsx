import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useMailboxStore } from "@/hooks/use-mailbox-store";
import WelcomePage from "@/pages/welcome";
import HomePage from "@/pages/home";
import CreatePage from "@/pages/create";
import ActivityPage from "@/pages/activity";
import SettingsPage from "@/pages/settings";
import { BottomNav } from "@/components/bottom-nav";

const queryClient = new QueryClient();

function AppWrapper() {
  const { mailbox, setMailbox } = useMailboxStore();

  if (!mailbox) {
    return <WelcomePage onMailboxCreated={(m) => setMailbox(m)} />;
  }

  return (
    <Switch>
      <Route path="/create" component={CreatePage} />
      <Route>
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/activity" component={ActivityPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={HomePage} />
            </Switch>
          </div>
          <BottomNav />
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <div className="min-h-[100dvh] bg-[#E8E8D0] flex items-center justify-center">
          <div
            className="w-full bg-[#F4F4E4] flex flex-col overflow-hidden"
            style={{ maxWidth: "430px", height: "100dvh", maxHeight: "900px" }}
          >
            <AppWrapper />
          </div>
        </div>
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
