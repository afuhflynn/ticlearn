export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "EducationWebSite",
    name: "TiCLearn",
    url: "https://ticlearn.ticsummit.org",
    logo: "https://ticlearn.ticsummit.org/icons/icon-512.png",
    description:
      "Study platform for Cameroonian university students. Upload lecture notes, generate quizzes from them, and learn with Tip, the AI tutor.",
    sameAs: ["https://www.linkedin.com/company/tic-foundation"],
    parentOrganization: {
      "@type": "Organization",
      name: "Tic Foundation",
      url: "https://ticsummit.org",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "French"],
    },
    areaServed: {
      "@type": "Country",
      name: "Cameroon",
    },
    serviceType: ["Educational Software", "Online Learning Platform"],
    potentialAction: {
      "@type": "UseAction",
      target: "https://ticlearn.ticsummit.org/sign-up",
      name: "Sign Up",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
