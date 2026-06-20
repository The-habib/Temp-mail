import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { MailboxProvider, useMailboxStore } from "@/hooks/use-mailbox-store";
import WelcomePage from "@/pages/welcome";
import HomePage from "@/pages/home";
import CreatePage from "@/pages/create";
import ActivityPage from "@/pages/activity";
import SettingsPage from "@/pages/settings";
import { BottomNav, SideNav } from "@/components/bottom-nav";

const queryClient = new QueryClient();

function AppWrapper() {
  const { mailbox } = useMailboxStore();

  if (!mailbox) {
    return <WelcomePage />;
  }

  return (
    <Switch>
      <Route path="/create" component={CreatePage} />
      <Route>
        {/* Desktop: sidebar + content. Mobile: content + floating bottom nav */}
        <div className="flex h-full w-full overflow-hidden">
          <SideNav />
          <div className="flex-1 overflow-hidden relative min-w-0">
            <Switch>
              <Route path="/"          component={HomePage}    />
              <Route path="/activity"  component={ActivityPage} />
              <Route path="/settings"  component={SettingsPage} />
              <Route                   component={HomePage}    />
            </Switch>
            <BottomNav />
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <MailboxProvider>
          {/* Mobile: centered phone frame. Desktop: full viewport */}
          <div className="min-h-[100dvh] bg-[#E8E8D0] flex items-center justify-center">
            <div className="w-full bg-[#F4F4E4] flex flex-col overflow-hidden h-[100dvh] max-w-[430px] max-h-[900px] md:max-w-none md:max-h-none md:rounded-none">
              <AppWrapper />
            </div>
          </div>
        </MailboxProvider>
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
