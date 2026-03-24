'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
    >
      <LogOut className="w-4 h-4" />
      Logout
    </Button>
  );
}
