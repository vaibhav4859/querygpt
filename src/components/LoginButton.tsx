import { LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const LoginButton = () => {
  const { user, loading, signInWithGoogle, signOut, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <User className="w-5 h-5 animate-pulse" />
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={signInWithGoogle}
        className="gap-2"
      >
        <LogIn className="w-4 h-4" />
        Sign in with Google
      </Button>
    );
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-popover border-border" align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user?.user_metadata?.full_name && (
              <p className="font-medium text-sm text-foreground">
                {user.user_metadata.full_name}
              </p>
            )}
            <p className="text-xs text-muted-foreground truncate w-40">
              {user?.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LoginButton;
