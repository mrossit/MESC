import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/hooks/use-navigate";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingNotificationBellProps {
  className?: string;
}

export function FloatingNotificationBell({ className }: FloatingNotificationBellProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Fetch unread count
  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Handle scroll to show/hide floating button
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Don't show if no unread notifications
  if (!unreadCount || unreadCount.count === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-300 md:hidden",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
        className
      )}
    >
      <Button
        size="lg"
        className="relative h-14 w-14 rounded-full bg-neutral-accentWarm hover:bg-neutral-accentWarm/90 shadow-lg hover:shadow-xl transition-all"
        onClick={() => navigate("/communication")}
      >
        <Bell className="h-6 w-6 text-white" />
        <Badge 
          className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center bg-red-500 text-white text-xs animate-pulse"
        >
          {unreadCount.count > 9 ? "9+" : unreadCount.count}
        </Badge>
        <span className="sr-only">
          {unreadCount.count} notificações não lidas
        </span>
      </Button>
      
      {/* Ripple effect for attention */}
      <div className="absolute inset-0 -z-10">
        <div className="h-14 w-14 rounded-full bg-neutral-accentWarm/30 animate-ping" />
      </div>
    </div>
  );
}