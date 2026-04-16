"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Loader2, Save, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  usePaymentSettings,
  useUpdatePaymentSettings,
} from "@/hooks/usePayment";

interface PaymentSettings {
  mtnNumber: string | null;
  mtnHolderName: string | null;
  orangeNumber: string | null;
  orangeHolderName: string | null;
}

export default function PaymentSettingsPage() {
  const { data: session, isPending: sessionLoading } = useSession();

  const [settings, setSettings] = useState<PaymentSettings>({
    mtnNumber: "",
    mtnHolderName: "",
    orangeNumber: "",
    orangeHolderName: "",
  });
  const { data, isPending: isLoading } = usePaymentSettings();
  const { mutateAsync: updateSettings, isPending: isSaving } =
    useUpdatePaymentSettings();

  useEffect(() => {
    if (!data) return;
    setSettings({
      ...data,
    });
  }, [data]);

  const handleSave = async () => {
    const payLoad = {
      mtnNumber: settings.mtnNumber ?? "",
      mtnHolderName: settings.mtnHolderName ?? "",
      orangeNumber: settings.orangeNumber ?? "",
      orangeHolderName: settings.orangeHolderName ?? "",
    };
    await updateSettings(payLoad);
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Phone className="h-8 w-8 text-purple-600" />
          Payment Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Set the MTN and Orange Money numbers for manual payments. These will
          be displayed to users on the subscription page.
        </p>
      </div>

      <div className="space-y-6">
        {/* MTN Money */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-yellow-600">MTN</span> Mobile Money
            </CardTitle>
            <CardDescription>
              Enter the MTN number users should send payments to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="mtnNumber">Phone Number</Label>
              <Input
                id="mtnNumber"
                placeholder="6XX XXX XXX"
                value={settings.mtnNumber || ""}
                onChange={(e) =>
                  setSettings({ ...settings, mtnNumber: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mtnHolderName">Account Holder Name</Label>
              <Input
                id="mtnHolderName"
                placeholder="Name as shown on MTN MoMo"
                value={settings.mtnHolderName || ""}
                onChange={(e) =>
                  setSettings({ ...settings, mtnHolderName: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Orange Money */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-orange-600">Orange</span> Money
            </CardTitle>
            <CardDescription>
              Enter the Orange number users should send payments to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="orangeNumber">Phone Number</Label>
              <Input
                id="orangeNumber"
                placeholder="6XX XXX XXX"
                value={settings.orangeNumber || ""}
                onChange={(e) =>
                  setSettings({ ...settings, orangeNumber: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="orangeHolderName">Account Holder Name</Label>
              <Input
                id="orangeHolderName"
                placeholder="Name as shown on Orange Money"
                value={settings.orangeHolderName || ""}
                onChange={(e) =>
                  setSettings({ ...settings, orangeHolderName: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Payment Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
