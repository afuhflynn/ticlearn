export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-3 sm:p-4">
      <div className="w-full max-w-md px-2 sm:px-0">{children}</div>
    </div>
  );
}
