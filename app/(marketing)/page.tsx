import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Sparkles,
  FileText,
  Brain,
  MessageSquare,
  Trophy,
  Target,
  Zap,
  Users,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: FileText,
    title: "Smart Note Upload",
    description:
      "Upload PDFs or images of your study notes. Our AI extracts and organizes content for quiz generation.",
  },
  {
    icon: Brain,
    title: "AI Quiz Generation",
    description:
      "Transform any notes into multiple-choice quizzes instantly. Practice with questions tailored to your material.",
  },
  {
    icon: MessageSquare,
    title: "24/7 TiC assistance",
    description:
      "Stuck on a concept? Chat with TiC anytime, anywhere. Get explanations in plain language.",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    description:
      "Compete with fellow students. Track your progress and see how you rank against others.",
  },
  {
    icon: Target,
    title: "GCE Exam Prep",
    description:
      "Access past papers and mock exams for Computer Science and ICT. Prepare with realistic simulations.",
  },
  {
    icon: Zap,
    title: "Progress Tracking",
    description:
      "Visualize your learning journey with streaks, points, and detailed analytics.",
  },
];

const steps = [
  {
    step: "1",
    title: "Upload Your Notes",
    description:
      "Take a photo or upload a PDF of your study materials. Our AI processes everything automaTiClly.",
  },
  {
    step: "2",
    title: "Generate Quizzes",
    description:
      "Tell our AI what topics you want to practice. Get custom quizzes in seconds.",
  },
  {
    step: "3",
    title: "Practice & Improve",
    description:
      "Take quizzes, review explanations, and identify areas to improve.",
  },
  {
    step: "4",
    title: "Track Progress",
    description:
      "Watch your scores improve over time and climb the leaderboard.",
  },
];

const testimonials = [
  {
    name: "Amara N.",
    role: "GCE A-Level Student",
    image: "/testimonials/amara.jpg",
    quote:
      "TiCLearn helped me pass my Physics exam with an A! TiC explained concepts I was struggling with for weeks.",
  },
  {
    name: "Kevin T.",
    role: "GCE A-Level Student",
    image: "/testimonials/kevin.jpg",
    quote:
      "The quiz generator is amazing. I uploaded my Chemistry notes and got 50 practice questions instantly.",
  },
  {
    name: "Michelle F.",
    role: "GCE A-Level Student",
    image: "/testimonials/michelle.jpg",
    quote:
      "I went from 45% to 85% in Math just by using TiCLearn daily. The progress tracking keeps me motivated!",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "0",
    description: "Perfect for trying out TiCLearn",
    features: [
      "2 PDF uploads",
      "4 AI-generated quizzes",
      "A maximum of 20 quiz questions",
      "8 TiC messages",
      "Community access",
      "Progress tracking",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Standard",
    price: "5,000",
    description: "For serious learners",
    features: [
      "30 PDF uploads",
      "60 AI-generated quizzes",
      "A maximum of 80 quiz questions",
      "Unlimited TiC Chats",
      "GCE exam papers",
      "Priority support",
      "Analytics dashboard",
    ],
    cta: "Subscribe",
    popular: true,
  },
  {
    name: "Premium",
    price: "10,000",
    description: "Maximum learning power",
    features: [
      "Unlimited everything",
      "A maximum of 100 quiz questions",
      "Early access to new features",
      "1-on-1 tutoring sessions",
      "Custom study plans",
      "Dedicated mentor",
    ],
    cta: "Go Premium",
    popular: false,
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-[70vh] md:min-h-[80vh] py-16 md:py-20 px-3 md:px-4 text-center">
        <div className="mb-4 md:mb-6 inline-flex items-center gap-2 rounded-full border bg-background/50 px-3 py-1.5 text-sm backdrop-blur">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI-Powered Learning</span>
        </div>

        <h1 className="mb-4 md:mb-6 text-3xl md:text-5xl lg:text-7xl font-bold tracking-tight">
          Study Smarter,{" "}
          <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            Score Higher
          </span>
        </h1>

        <p className="mx-auto mb-6 md:mb-8 max-w-2xl text-base md:text-xl text-muted-foreground px-4">
          Transform your notes into quizzes, prepare for GCE A-Level exams,
          compete on leaderboards, and chat with TiC.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row w-full px-4 sm:px-0">
          <Button
            size="lg"
            className="gap-2 w-full sm:w-auto min-w-[180px]"
            asChild
          >
            <Link href="/sign-up">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto min-w-[140px]"
            asChild
          >
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>

        <div className="mt-12 md:mt-16 grid grid-cols-2 gap-6 md:gap-8 max-w-4xl px-4">
          <div className="text-center">
            <div className="text-2xl md:text-4xl font-bold text-primary">
              10x
            </div>
            <div className="text-sm text-muted-foreground">Faster Revision</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-4xl font-bold text-primary">
              95%
            </div>
            <div className="text-sm text-muted-foreground">Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-4xl font-bold text-primary">
              500+
            </div>
            <div className="text-sm text-muted-foreground">Quizzes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-4xl font-bold text-primary">
              24/7
            </div>
            <div className="text-sm text-muted-foreground">TiC</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
              Everything You Need to Ace Your Exams
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful AI tools designed specifically for Cameroonian GCE
              A-Level students.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col gap-4 p-6 rounded-xl border bg-background transition-shadow hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
              How TiCLearn Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in 4 simple steps
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Start Learning Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
              What Students Say
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of students transforming their grades with TiCLearn
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="flex flex-col gap-4 p-6 rounded-xl border bg-background"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground italic">
                  &quot;{testimonial.quote}&quot;
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your learning needs
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`flex flex-col gap-4 p-6 rounded-xl border bg-background ${
                  plan.popular ? "border-primary ring-2 ring-primary/20" : ""
                }`}
              >
                {plan.popular && (
                  <div className="text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 w-fit">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {plan.price === "0" ? "Free" : `XFA ${plan.price}`}
                  </span>
                  {plan.price !== "0" && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <ul className="flex flex-col gap-2 mt-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href="/sign-up">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4">
            Ready to Transform Your Grades?
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Join thousands of Cameroonian students already using TiCLearn to ace
            their A-Level exams.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <Link href="/sign-up">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
