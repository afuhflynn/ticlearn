// ===========================================
// FAQ Types
// ===========================================

export interface FAQ {
  question: string;
  answer: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is TiCLearn?",
    answer:
      "TiCLearn is an AI-powered study platform designed specifically for Cameroonian GCE A-Level students. It helps you transform notes into quizzes, practice with past exams, compete on leaderboards, and get help from an TiC.",
  },
  {
    question: "How does the AI quiz generator work?",
    answer:
      "Simply upload your study notes or paste text, and our AI will automaTiClly generate relevant multiple-choice quizzes. You can customize the number of questions, difficulty level, and topics covered.",
  },
  {
    question: "Is TiCLearn free to use?",
    answer:
      "Yes! TiCLearn offers a free tier with basic features including note uploading, quiz generation, and access to the TiC. We also offer premium plans with advanced features like unlimited quizzes, exam papers, and priority support.",
  },
  {
    question: "What subjects do you support?",
    answer:
      "We support all GCE A-Level subjects including Mathematics, Physics, Chemistry, Biology, Computer Science, Economics, Geography, Literature, and more. Our AI is continuously learning to improve accuracy across all subjects.",
  },
  {
    question: "How do I subscribe to premium?",
    answer:
      "Visit our pricing page to view available plans. Subscriptions can be paid via Fapshi (mobile money) or credit card. Once subscribed, you'll get instant access to all premium features.",
  },
  {
    question: "Can I use TiCLearn on my phone?",
    answer:
      "Yes! TiCLearn is fully responsive and works on desktop, tablet, and mobile devices. You can study anywhere, anytime.",
  },
  {
    question: "How does the affiliate program work?",
    answer:
      "Share your unique referral link with friends and earn rewards when they subscribe. You'll earn 20% of their subscription fees for life. Track your earnings in your dashboard.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. We take data privacy seriously. Your notes and study data are encrypted and stored securely. We never share your personal information with third parties.",
  },
  {
    question: "How do I reset my password?",
    answer:
      "Go to the sign-in page and click 'Forgot Password'. Enter your email address and we'll send you a reset link.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
  },
  {
    question: "How can I contact support?",
    answer:
      "You can reach us via email at hello@ticlearn.com, use our contact form, or send a message through the app. We typically respond within 24 hours.",
  },
  {
    question: "Do you offer group/school subscriptions?",
    answer:
      "Yes! We offer special pricing for schools and organizations. Contact us at hello@ticlearn.com for more information.",
  },
];
