import "@testing-library/jest-dom";
import { vi } from "vitest";

// ============================================================
// Next.js Navigation Mock
// ============================================================
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// ============================================================
// Clerk Authentication Mock
// ============================================================
vi.mock("@clerk/nextjs", () => ({
  auth: vi.fn(() => ({
    userId: "test-user-id",
    sessionId: "test-session-id",
    orgId: null,
  })),
  currentUser: vi.fn(() => ({
    id: "test-user-id",
    emailAddresses: [{ emailAddress: "test@example.com" }],
    firstName: "Test",
    lastName: "User",
    username: "testuser",
    imageUrl: "https://example.com/avatar.png",
  })),
  useUser: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: "test-user-id",
      firstName: "Test",
      lastName: "User",
      emailAddresses: [{ emailAddress: "test@example.com" }],
    },
  })),
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    userId: "test-user-id",
    sessionId: "test-session-id",
    orgId: null,
    getToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  })),
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: (_props: { children: React.ReactNode }) => null,
  UserButton: () => <div data-testid="mock-user-button" />,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ============================================================
// Suppress console.log in tests (keep console.error for debugging)
// ============================================================
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = vi.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
});
