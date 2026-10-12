interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs: FAQItem[];
}

export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export const defaultFAQs: FAQItem[] = [
  {
    question: "What is TiCLearn?",
    answer:
      "TiCLearn is an AI-powered study platform designed specifically for Cameroonian GCE A-Level students. It helps you transform your study notes into interactive quizzes, prepare for exams with AI-generated mock tests, and track your progress over time.",
  },
  {
    question: "How does TiCLearn help with GCE A-Level preparation?",
    answer:
      "TiCLearn offers comprehensive GCE A-Level preparation through AI-generated quizzes from your notes, mock exam simulations, a 24/7 AI tutor (TiC) for instant help, and progress tracking with leaderboards to keep you motivated.",
  },
  {
    question: "Is TiCLearn free to use?",
    answer:
      "TiCLearn offers both free and premium plans. The free plan includes basic features like note uploading and limited quiz generation. Premium plans unlock unlimited access to AI features, mock exams, and advanced progress tracking.",
  },
  {
    question: "Which GCE A-Level subjects does TiCLearn cover?",
    answer:
      "TiCLearn covers all major GCE A-Level subjects including Computer Science, ICT, Mathematics, Further Mathematics, Biology, Chemistry, Physics, Economics, and more. We're continuously adding more subjects based on the Cameroon GCE syllabus.",
  },
  {
    question: "How is TiCLearn different from other study platforms?",
    answer:
      "TiCLearn is specifically tailored for the Cameroon GCE A-Level curriculum. Unlike generic study apps, we understand the local syllabus, exam patterns, and student needs. Our AI adapts to generate questions that match the difficulty and format of actual GCE exams.",
  },
  {
    question: "Who is behind TiCLearn?",
    answer:
      "TiCLearn is developed by Tic Foundation, a Cameroonian organization focused on using technology to improve education access and quality for students across Cameroon.",
  },
  {
    question: "How do I upload my study notes?",
    answer:
      "Simply sign up for an account, navigate to the upload section, and drag and drop your PDF files or images. Our AI will automatically extract the text, summarize key points, and prepare them for quiz generation.",
  },
  {
    question: "How does AI quiz generation work?",
    answer:
      "After uploading your notes, our AI analyzes the content and generates relevant multiple-choice questions based on the key concepts and topics covered. You can customize the number of questions and difficulty level.",
  },
  {
    question: "Can I practice past GCE exam papers?",
    answer:
      "Yes! TiCLearn offers mock GCE exam simulations for subjects like Computer Science, ICT, and Mathematics. These exams are designed to mirror the format and difficulty of actual GCE A-Level papers.",
  },
  {
    question: "What is the TiC AI tutor?",
    answer:
      "TiC is your personal 24/7 AI study assistant. You can ask TiC questions about any topic from your notes or the GCE syllabus, and get instant, detailed explanations to help you understand difficult concepts.",
  },
  {
    question: "How do leaderboards work?",
    answer:
      "Leaderboards track your performance based on quiz scores, points earned, and consistency. You can compete with other students across Cameroon and see how you rank in subjects you're studying.",
  },
  {
    question: "Can I track my progress over time?",
    answer:
      "Absolutely! TiCLearn provides detailed analytics showing your quiz scores, time spent studying, topics mastered, and areas that need more practice. This helps you identify weak points and improve systematically.",
  },
  {
    question: "What file formats can I upload?",
    answer:
      "TiCLearn supports PDF files and images (PNG, JPG, JPEG) of your handwritten or typed notes. We recommend clear, well-organized documents for the best AI extraction results.",
  },
  {
    question: "How do I reset my password?",
    answer:
      "Click on 'Forgot Password' on the sign-in page, enter your email address, and we'll send you a password reset link. Follow the instructions in the email to create a new password.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can reach our support team through the Contact page, by email, or through our WhatsApp channel. We're here to help Monday through Friday during business hours.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, we take data security seriously. Your personal information and study materials are encrypted and stored securely. We never share your data with third parties without your consent.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept mobile money payments through MTN MoMo and Orange Money, which are the most popular payment methods in Cameroon. This makes it easy for students to subscribe to premium features.",
  },
  {
    question: "How do I upgrade to premium?",
    answer:
      "Visit our Pricing page, select the plan that suits your needs, and follow the checkout process. Payment is processed securely through Fapshi, and you'll get instant access to premium features.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "We offer a 7-day money-back guarantee for premium subscriptions. If you're not satisfied with the service, contact our support team within 7 days of purchase for a full refund.",
  },
  {
    question: "What happens if payment fails?",
    answer:
      "If your payment fails, you'll be notified immediately. You can try again or contact our support team for assistance. Your account will remain active until the current subscription period ends.",
  },
];
