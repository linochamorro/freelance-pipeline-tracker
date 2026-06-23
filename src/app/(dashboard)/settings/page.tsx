"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UserSettings = {
  leadStalenessDays: number;
  contactedStalenessDays: number;
  discussionStalenessDays: number;
  proposalStalenessDays: number;
  negotiationStalenessDays: number;
  acceptedStalenessDays: number;
  onHoldStalenessDays: number;
  developmentStalenessDays: number;
  notificationEnabled: boolean;
};

const STAGE_FIELDS: { key: keyof UserSettings; label: string }[] = [
  { key: "leadStalenessDays", label: "Lead" },
  { key: "contactedStalenessDays", label: "Contacted" },
  { key: "discussionStalenessDays", label: "In Discussion" },
  { key: "proposalStalenessDays", label: "Proposal Sent" },
  { key: "negotiationStalenessDays", label: "Negotiation" },
  { key: "acceptedStalenessDays", label: "Accepted" },
  { key: "onHoldStalenessDays", label: "On Hold" },
  { key: "developmentStalenessDays", label: "In Development" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSettings(json.data);
      });
  }, []);

  async function handleSave() {
    if (!settings) return;
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) {
    return <div className="p-8 text-center text-neutral-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Staleness thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-500">
            Cards not updated for more than this many days will show a stale
            indicator.
          </p>
          {STAGE_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="number"
                min={1}
                max={365}
                className="w-20"
                value={settings[key] as number}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    [key]: parseInt(e.target.value) || 7,
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notificationEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notificationEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-neutral-300"
            />
            <span className="text-sm">
              Enable follow-up reminders for stale opportunities
            </span>
          </label>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        {saved ? "Saved!" : "Save settings"}
      </Button>
    </div>
  );
}
