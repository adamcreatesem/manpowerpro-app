import { Button } from "@/components/ui/button";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-label">404</p>
      <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        This file left the building
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        The page you're after doesn't exist — it may have been moved, renamed,
        or never boarded in the first place.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link to="/">Back to the site</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/dashboard">Open the dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
