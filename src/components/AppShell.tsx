import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Building2,
  CalendarClock,
  FolderOpen,
  Handshake,
  HeartHandshake,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquareText,
  Plane,
  Receipt,
  Settings,
  Users,
  Waypoints,
  Wallet,
} from "lucide-react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";

const OFFICE_NAV = [
  { to: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/app/candidates", label: "Candidates", icon: Users },
  { to: "/app/pipeline", label: "Pipeline", icon: Waypoints },
  { to: "/app/documents", label: "Documents", icon: FolderOpen },
  { to: "/app/employers", label: "Employers", icon: Building2 },
  { to: "/app/partners", label: "Partners", icon: Handshake },
  { to: "/app/fees", label: "Fees", icon: Wallet },
  { to: "/app/expenses", label: "Expenses", icon: Receipt },
  { to: "/app/tasks", label: "Tasks", icon: ListChecks },
  { to: "/app/deadlines", label: "Deadlines", icon: CalendarClock },
  { to: "/app/travel", label: "Visa & travel", icon: Plane },
  { to: "/app/aftercare", label: "After-care", icon: HeartHandshake },
  { to: "/app/communications", label: "Messages", icon: MessageSquareText },
  { to: "/app/staff", label: "Staff", icon: BarChart3 },
  { to: "/app/activity", label: "Activity", icon: History },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const CLIENT_NAV = [{ to: "/app/client", label: "My orders", icon: Building2 }];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7 items-center justify-center rounded-[5px] bg-foreground text-background">
        <span className="font-display text-[13px] font-medium leading-none">
          M
        </span>
      </div>
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-tight">ManpowerPro</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Foreign employment
        </p>
      </div>
    </div>
  );
}

/** Shown when the signed-in account has no agency attached — every office
 *  query requires one, so we offer the demo logins instead of crashing. */
function NoAgency() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
          <Building2 className="size-5 text-muted-foreground" />
        </div>
        <h1 className="font-display mt-5 text-2xl font-normal tracking-tight">
          No office linked to this account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          ManpowerPro works inside an agency office. Sign in with one of the
          demo roles — owner, manager or staff — to see the pipeline, or use a
          real email if your agency account is already set up.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => navigate("/auth")}>Choose a demo login</Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
          >
            Back to the site
          </Button>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isClient = user?.role === "client";
  const onClientRoute = location.pathname.startsWith("/app/client");

  /* Role routing: clients only see the client portal, office roles only see
     the office. Redirect instead of rendering a foreign view. */
  if (isClient && !onClientRoute) {
    return <Navigate to="/app/client" replace />;
  }
  if (!isClient && onClientRoute) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (user && !user.agencyId) {
    return <NoAgency />;
  }

  const NAV = isClient ? CLIENT_NAV : OFFICE_NAV;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
      isActive && "bg-accent text-accent-foreground",
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/80 bg-sidebar lg:flex">
        <div className="px-5 pt-6">
          <NavLink to={isClient ? "/app/client" : "/app/dashboard"} className="inline-block">
            <Brand />
          </NavLink>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-0.5 px-3">
          <p className="text-label px-3 pb-2">
            {isClient ? "Your account" : "Office"}
          </p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              end={item.to === "/app/dashboard" || item.to === "/app/client"}
            >
              <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border/80 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {user?.name ?? "Agency staff"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground",
                )
              }
              end={item.to === "/app/dashboard" || item.to === "/app/client"}
            >
              <item.icon className="size-3.5" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Content */}
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AppShell() {
  return <Shell />;
}
