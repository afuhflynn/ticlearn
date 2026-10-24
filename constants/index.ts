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
      "TiCLearn is a study platform for Cameroonian university students. You upload your own lecture notes, turn them into quizzes, and learn with Tip, an AI tutor that teaches from your material instead of handing you answers.",
  },
  {
    question: "Who is TiCLearn for?",
    answer:
      "University students in Cameroon, whether at a public university like Buea or Bamenda or a private one. You pick your year of study once, and Tip explains things at the right depth for it.",
  },
  {
    question: "What does Tip do differently?",
    answer:
      "Tip teaches instead of answering. It quotes your own note back to you, asks you a checking question before explaining, and refuses to just hand over a finished answer. That is how the material actually sticks.",
  },
  {
    question: "Is TiCLearn free to use?",
    answer:
      "TiCLearn offers a free plan and paid plans. The free plan covers a real but limited number of notes, quizzes and tutor messages. Paid plans lift those limits.",
  },
  {
    question: "How do I upload my study notes?",
    answer:
      "Sign up, open the upload section, and drop in a PDF, a Word document or a photo of your handout. Tip extracts the text, summarises the key points, and pulls out the topics it will track for you.",
  },
  {
    question: "How does AI quiz generation work?",
    answer:
      "After uploading a note, you generate a quiz from that note alone. Every question traces back to the part of your material it came from, so a quiz never invents a topic you never studied.",
  },
  {
    question: "Can I track my progress over time?",
    answer:
      "Your quiz attempts are kept, so you can open a past quiz and see the answers you missed. Tip can also report your study progress in chat. There is no separate progress dashboard.",
  },
  {
    question: "What file formats can I upload?",
    answer:
      "PDF files, Word documents and images (PNG, JPG, JPEG) of your handwritten or typed notes. Clear, well-organised documents give the best extraction results.",
  },
  {
    question: "How do leaderboards work?",
    answer:
      "TiCLearn does not have a leaderboard. Your quiz scores are private to your account, and the review page shows what you missed so you know what to revisit.",
  },
  {
    question: "How do I reset my password?",
    answer:
      "Go to the sign-in page and click 'Forgot Password'. Enter your email address and we'll send you a reset link.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can reach our support team through the Contact page, by email, or through our app. We're here to help Monday through Friday during business hours.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, we take data security seriously. Your personal information and study materials are encrypted and stored securely. We never share your data with third parties without your consent.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept mobile money payments through MTN MoMo and Orange Money, which are the most popular payment methods in Cameroon.",
  },
  {
    question: "How do I upgrade?",
    answer:
      "Visit our Pricing page, select the plan that suits your needs, and follow the checkout process. Payment is processed securely through Fapshi, and you'll get instant access to the higher limits.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "We offer a 7-day money-back guarantee for paid subscriptions. If you're not satisfied with the service, contact our support team within 7 days of purchase for a full refund.",
  },
  {
    question: "What happens if payment fails?",
    answer:
      "If your payment fails, you'll be notified immediately. You can try again or contact our support team for assistance. Your account will remain active until the current subscription period ends.",
  },
  {
    question: "How much data does TiCLearn use?",
    answer:
      "TiCLearn is designed to be light on data. Note uploads are compressed, quiz generation uses minimal context, and the AI tutor streams responses rather than sending large payloads. You can study your notes offline once they're downloaded.",
  },
  {
    question: "Can I use TiCLearn offline?",
    answer:
      "Yes. Once notes are uploaded and processed, you can access them and your quizzes offline. The AI tutor features require an internet connection, but your study materials are available anytime without data costs.",
  },
];

export const MAX_CHARACTERS_FOR_QUIZ_NOTE_CONTEXT = 999_999;
