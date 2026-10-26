"use client";

import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEVELS } from "@/constants/levels";
import { useSession } from "@/lib/auth-client";

const UNIVERSITIES = [
  "University of Yaounde I",
  "University of Buea",
  "University of Douala",
  "University of Dschang",
  "University of Bamenda",
  "University of Maroua",
  "Catholic University of Central Africa",
  "Other Institution",
];

const FACULTIES = [
  "Faculty of Science",
  "Faculty of Engineering (ENSPY / ENSET)",
  "Faculty of Medicine & Biomedical Sciences (FMSB)",
  "Faculty of Arts, Letters & Social Sciences",
  "Faculty of Laws & Political Science",
  "Faculty of Economics & Management (FSEG)",
  "Higher Technical / Commercial Institute",
  "Other Faculty",
];

const GOALS = [
  "Semester & Final Exams",
  "Higher National Diploma (HND)",
  "Professional Certifications",
  "General Academic Revision",
];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [institution, setInstitution] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [targetGoal, setTargetGoal] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  const calculateAge = (dob: Date) => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!institution && !!faculty;
      case 1:
        return !!program && !!targetGoal;
      case 2: {
        if (!dateOfBirth) return false;
        const age = calculateAge(dateOfBirth);
        return age >= 15 && age <= 50;
      }
      case 3:
        return !!selectedLevel;
      default:
        return false;
    }
  };

  const handleFinish = async () => {
    if (!selectedLevel || !dateOfBirth) return;
    setSaving(true);
    setError(null);

    const age = calculateAge(dateOfBirth);
    if (age < 15 || age > 50) {
      setError("Age must be between 15 and 50 years old.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/onboarding/level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: selectedLevel,
          institution,
          faculty,
          program,
          targetGoal,
          gender,
          dateOfBirth: dateOfBirth.toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to save");
      }

      router.push("/upload");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  if (!session) return null;

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-4">
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>
            Step {step + 1} of {totalSteps}
          </span>
          <span>
            {step === 0 && "Institution"}
            {step === 1 && "Programme & Goal"}
            {step === 2 && "Demographics"}
            {step === 3 && "Study Year"}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">Where do you study?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Select your university and faculty so Tip can provide tailored
                guidance.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="onboarding-institution">
                  University / Institution
                </Label>
                <Select
                  onValueChange={setInstitution}
                  value={institution || undefined}
                >
                  <SelectTrigger
                    className="h-12 w-full rounded-xl"
                    id="onboarding-institution"
                  >
                    <SelectValue placeholder="Select your university..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIVERSITIES.map((uni) => (
                      <SelectItem key={uni} value={uni}>
                        {uni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="onboarding-faculty">
                  Faculty or Department
                </Label>
                <Select onValueChange={setFaculty} value={faculty || undefined}>
                  <SelectTrigger
                    className="h-12 w-full rounded-xl"
                    id="onboarding-faculty"
                  >
                    <SelectValue placeholder="Select your faculty..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FACULTIES.map((fac) => (
                      <SelectItem key={fac} value={fac}>
                        {fac}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">Your Programme and Goal</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                What major are you studying and what is your primary target?
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="onboarding-program">
                  Programme / Major Name
                </Label>
                <Input
                  className="h-12 rounded-xl"
                  id="onboarding-program"
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="e.g. Computer Science, Law, Medicine"
                  type="text"
                  value={program}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="onboarding-goal">Primary Target Goal</Label>
                <Select
                  onValueChange={setTargetGoal}
                  value={targetGoal || undefined}
                >
                  <SelectTrigger
                    className="h-12 w-full rounded-xl"
                    id="onboarding-goal"
                  >
                    <SelectValue placeholder="Select your goal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((goal) => (
                      <SelectItem key={goal} value={goal}>
                        {goal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">A little about you</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We induce your age from your date of birth (must be between 15
                and 50 years old).
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 block text-sm font-medium">Gender</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["MALE", "FEMALE"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`rounded-xl border-2 py-3 text-sm font-medium transition-all ${
                        gender === g
                          ? "border-primary bg-primary/5 font-semibold text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {g === "MALE" && "Male"}
                      {g === "FEMALE" && "Female"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 block text-sm font-medium">Date of Birth</p>
                <DatePicker
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  placeholder="Select your birth date"
                  className="h-12 w-full rounded-xl"
                />
                {dateOfBirth && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Calculated age: {calculateAge(dateOfBirth)} years old
                    {calculateAge(dateOfBirth) < 15 ||
                    calculateAge(dateOfBirth) > 50 ? (
                      <span className="ml-2 font-semibold text-red-500">
                        (Must be between 15 and 50)
                      </span>
                    ) : null}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">What year are you in?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Tip uses your study level to explain things at the right depth.
              </p>
            </div>

            <div className="space-y-3">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setSelectedLevel(level.value)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    selectedLevel === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <p className="font-semibold">{level.label}</p>
                  <p className="text-xs text-muted-foreground">{level.blurb}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            disabled={step === 0 || saving}
            onClick={() => setStep((s) => s - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>

          {step < 3 ? (
            <Button
              disabled={!canProceed()}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button disabled={!selectedLevel || saving} onClick={handleFinish}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
