'use client';

import { SignIn } from '@clerk/nextjs';
import type { JSX } from 'react';

export default function SignInPage(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignIn fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
