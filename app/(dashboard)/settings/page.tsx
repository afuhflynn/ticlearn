"use client";

import {
  Bell,
  Camera,
  Check,
  KeyRound,
  LogOut,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSettings, useUpdateProfile, useUpdateSettings } from "@/hooks";
import { signOut, useSession } from "@/lib/auth-client";
import { useUploadThing } from "@/lib/uploadthing";
import { SettingsSkeleton } from "../student-skeletons";

/**
 * Settings is three real things: who you are, how you sign in, and what we are
 * allowed to send you. Every control here changes something the server stores.
 * Nothing is a placeholder.
 */
export default function SettingsPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { settings, isLoading: settingsLoading } = useSettings();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  const { startUpload, isUploading } = useUploadThing("profileImage", {
    onUploadError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (!sessionPending && !session?.user) {
      router.push("/sign-in");
      return;
    }

    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setImage(session.user.image || null);
    }
  }, [session, sessionPending, router]);

  useEffect(() => {
    if (!settings) return;
    setEmailNotifications(settings.emailNotifications);
    setPushNotifications(settings.pushNotifications);
  }, [settings]);

  const profileChanged = session?.user
    ? name.trim() !== (session.user.name || "")
    : false;

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Your name cannot be empty.");
      return;
    }

    try {
      await updateProfile.mutateAsync({ name: name.trim() });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The profile was not saved.",
      );
    }
  };

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }

    try {
      const uploaded = await startUpload([file]);
      const uploadedFile = uploaded?.[0];
      if (!uploadedFile?.url) {
        toast.error("The photo was not uploaded.");
        return;
      }
      setImage(uploadedFile.url);
      await updateProfile.mutateAsync({ image: uploadedFile.url });
    } catch {
      toast.error("The photo was not uploaded.");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Fill in all three password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("The two new passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.message || data?.error || "The password was not changed.",
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The password was not changed.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotification = async (
    key: "emailNotifications" | "pushNotifications",
    value: boolean,
  ) => {
    if (key === "emailNotifications") setEmailNotifications(value);
    else setPushNotifications(value);

    try {
      await updateSettings.mutateAsync({ [key]: value });
    } catch {
      if (key === "emailNotifications") setEmailNotifications(!value);
      else setPushNotifications(!value);
      toast.error("That preference was not saved.");
    }
  };

  if (sessionPending || settingsLoading) {
    return <SettingsSkeleton />;
  }

  const initial = (name || email || "?").charAt(0).toUpperCase();
  const passwordReady =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Your account, your password, and what we are allowed to send you.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                This name is what Tip and your quiz pages call you.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <Avatar className="size-16">
                    <AvatarImage src={image ?? ""} alt="" />
                    <AvatarFallback className="text-lg">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="icon"
                    className="absolute -right-1 -bottom-1 size-7 rounded-full"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="size-3.5" />
                    <span className="sr-only">Change profile photo</span>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhoto}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{name || "Learner"}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isUploading
                      ? "Uploading the photo…"
                      : "A photo is optional. Up to 2 MB."}
                  </p>
                </div>
              </div>

              <Separator />

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="settings-name">Name</FieldLabel>
                  <Input
                    id="settings-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="settings-email">Email</FieldLabel>
                  <Input
                    id="settings-email"
                    type="email"
                    value={email}
                    readOnly
                    disabled
                  />
                  <FieldDescription>
                    Your email is how you sign in, so it cannot be changed here.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>

            <CardFooter className="justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending || !profileChanged}
              >
                {updateProfile.isPending ? (
                  "Saving…"
                ) : (
                  <>
                    <Check className="mr-2 size-4" />
                    Save profile
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" />
                Password
              </CardTitle>
              <CardDescription>
                Use at least 8 characters. You stay signed in on this device.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="current-password">
                    Current password
                  </FieldLabel>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="new-password">New password</FieldLabel>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Repeat it
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                    />
                  </Field>
                </div>
              </FieldGroup>

              {newPassword.length > 0 && newPassword.length < 8 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {8 - newPassword.length} more character
                  {8 - newPassword.length === 1 ? "" : "s"} needed.
                </p>
              ) : null}
              {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
                <p className="mt-3 text-sm text-destructive">
                  The two new passwords do not match.
                </p>
              ) : null}
            </CardContent>

            <CardFooter className="justify-end">
              <Button
                variant="outline"
                onClick={handleChangePassword}
                disabled={isChangingPassword || !passwordReady}
              >
                {isChangingPassword ? "Changing…" : "Change password"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4 text-muted-foreground" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choose what reaches you outside the app.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    Account news, and a reminder when your exam is close.
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={(checked) =>
                    void handleNotification("emailNotifications", checked)
                  }
                  disabled={updateSettings.isPending}
                />
              </div>

              <Separator />

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">In the app</p>
                  <p className="text-sm text-muted-foreground">
                    A note finishes processing, or a quiz is ready.
                  </p>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={(checked) =>
                    void handleNotification("pushNotifications", checked)
                  }
                  disabled={updateSettings.isPending}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Where you stand right now.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4" />
                  Sign in
                </span>
                <span className="max-w-[60%] truncate text-sm">{email}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="size-4" />
                  Account
                </span>
                <Badge variant="outline" className="capitalize">
                  {(session?.user as { role?: string })?.role?.toLowerCase() ||
                    "student"}
                </Badge>
              </div>

              <Separator />

              <Button asChild variant="outline" className="w-full">
                <Link href="/subscription">
                  <Sparkles className="mr-2 size-4" />
                  Plan, credits and usage
                </Link>
              </Button>

              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
              >
                <LogOut className="mr-2 size-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
