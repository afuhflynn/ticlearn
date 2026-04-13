import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || "TiCLearn <no-reply@ticlearn.com>",
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });
    return { success: true };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error };
  }
}

const BRAND_COLORS = {
  primary: "#7c3aed",
  primaryLight: "#8b5cf6",
  primaryDark: "#6d28d9",
  gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
};

const emailStyles = `
  body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .card { background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); overflow: hidden; }
  .header { background: ${BRAND_COLORS.gradient}; padding: 40px 30px; text-align: center; }
  .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
  .header .logo { font-size: 32px; margin-bottom: 8px; }
  .content { padding: 32px; }
  .otp-box { background: #f3e8ff; border: 2px dashed ${BRAND_COLORS.primary}; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
  .otp-code { font-size: 36px; font-weight: 800; color: ${BRAND_COLORS.primary}; letter-spacing: 6px; }
  .footer { padding: 24px 32px; text-align: center; color: #6b7280; font-size: 14px; background: #f9fafb; }
  .footer a { color: ${BRAND_COLORS.primary}; text-decoration: none; }
  .button { display: inline-block; background: ${BRAND_COLORS.primary}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
  .button:hover { background: ${BRAND_COLORS.primaryDark}; }
  .highlight { color: ${BRAND_COLORS.primary}; font-weight: 600; }
  .features { margin: 24px 0; padding: 0; list-style: none; }
  .features li { padding: 8px 0; display: flex; align-items: center; gap: 12px; }
  .features-icon { color: ${BRAND_COLORS.primary}; }
`;

export async function sendVerificationEmail({
  email,
  name,
  otp,
}: {
  email: string;
  name: string;
  otp: string;
}) {
  const subject = "Verify your TiCLearn account";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">🎓</div>
        <h1>TiCLearn</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Verify Your Email</h2>
        <p>Hi <span class="highlight">${name || "there"}</span>,</p>
        <p>Welcome to TiCLearn! To complete your account setup, please use the verification code below:</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p style="color: #6b7280; font-size: 14px;">⏱️ This code will expire in 5 minutes.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">If you didn't create an account, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
        <p>Made with ❤️ for Cameroonian students</p>
        <p><a href="https://ticlearn.com">ticlearn.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return sendEmail({ to: email, subject, html });
}

export async function sendSignInEmail({
  email,
  name,
  otp,
}: {
  email: string;
  name: string;
  otp: string;
}) {
  const subject = "Your TiCLearn sign-in code";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in code</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">🎓</div>
        <h1>TiCLearn</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Sign In Code</h2>
        <p>Hi <span class="highlight">${name || "there"}</span>,</p>
        <p>Your sign-in code is:</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p style="color: #6b7280; font-size: 14px;">⏱️ This code will expire in 5 minutes.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">If you didn't try to sign in, please ignore this email or change your password.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
        <p><a href="https://ticlearn.com">ticlearn.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return sendEmail({ to: email, subject, html });
}

export async function sendPasswordResetEmail({
  email,
  name,
  otp,
}: {
  email: string;
  name: string;
  otp: string;
}) {
  const subject = "Reset your TiCLearn password";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset password</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">🎓</div>
        <h1>TiCLearn</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Reset Your Password</h2>
        <p>Hi <span class="highlight">${name || "there"}</span>,</p>
        <p>You requested to reset your password. Use this code:</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p style="color: #6b7280; font-size: 14px;">⏱️ This code will expire in 5 minutes.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">If you didn't request a password reset, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
        <p><a href="https://ticlearn.com">ticlearn.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return sendEmail({ to: email, subject, html });
}

export async function sendWelcomeEmail({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  const subject = "Welcome to TiCLearn! 🎓";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to TiCLearn</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">🎓</div>
        <h1>TiCLearn</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Welcome aboard, ${name || "Student"}!</h2>
        <p>Your TiCLearn account is now active and ready to help you ace your GCE A-Level exams!</p>

        <h3 style="color: #1f2937; margin-top: 24px;">Here's what you can do:</h3>
        <ul class="features">
          <li><span class="features-icon">📝</span> <strong>Upload Notes</strong> - Transform your study materials</li>
          <li><span class="features-icon">🧠</span> <strong>AI Quizzes</strong> - Generate quizzes from your notes</li>
          <li><span class="features-icon">💬</span> <strong>TiC</strong> - Get help anytime with our AI</li>
          <li><span class="features-icon">🏆</span> <strong>Leaderboard</strong> - Compete with other students</li>
          <li><span class="features-icon">📚</span> <strong>GCE Exams</strong> - Practice with past papers</li>
        </ul>

        <a href="https://ticlearn.com/dashboard" class="button" style="display: block; text-align: center; width: fit-content; margin: 32px auto 0;">
          Go to Dashboard →
        </a>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
        <p>Made with ❤️ for Cameroonian students</p>
        <p><a href="https://ticlearn.com">ticlearn.com</a> • <a href="https://ticlearn.com/support">Support</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return sendEmail({ to: email, subject, html });
}
export async function sendAdminInvitationEmail({
  email,
  inviterName,
  inviteLink,
}: {
  email: string;
  inviterName: string;
  inviteLink: string;
}) {
  const subject = "Invitation to become an Admin on TiCLearn 🛡️";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Invitation</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">🛡️</div>
        <h1>TiCLearn Admin</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">You've been invited!</h2>
        <p>Hi there,</p>
        <p><span class="highlight">${inviterName}</span> has invited you to become an <span class="highlight">Administrator</span> on TiCLearn.</p>

        <p>As an admin, you'll have the power to manage users, content, and platform settings to ensure our students get the best learning experience.</p>

        <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0; color: #4b5563; font-size: 14px;">This invitation is for <strong style="color: ${BRAND_COLORS.primary};">${email}</strong>.</p>
        </div>

        <a href="${inviteLink}" class="button" style="display: block; text-align: center; width: fit-content; margin: 32px auto 0;">
          Accept Invitation →
        </a>

        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">If you don't have an account yet, you'll be asked to create one first. This invitation will expire in 7 days.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
        <p>Made with ❤️ for Cameroonian students</p>
        <p><a href="https://ticlearn.com">ticlearn.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return sendEmail({ to: email, subject, html });
}

export async function sendRoleUpdateEmail({
  email,
  name,
  newRole,
}: {
  email: string;
  name: string;
  newRole: string;
}) {
  const subject = `Your TiCLearn account role has been updated to ${newRole} 🛡️`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Role Updated</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">🛡️</div>
        <h1>TiCLearn Security</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Role Updated</h2>
        <p>Hi <span class="highlight">${name || "Student"}</span>,</p>
        <p>Your account role on TiCLearn has been updated to <span class="highlight">${newRole}</span> by an administrator.</p>

        ${
          newRole === "ADMIN"
            ? `<p>You now have access to the administrative dashboard and can manage platform content and users.</p>
             <a href="https://ticlearn.com/admin" class="button" style="display: block; text-align: center; width: fit-content; margin: 32px auto 0;">
               Go to Admin Dashboard →
             </a>`
            : `<p>Your administrative privileges have been revoked. You still have full access to all student features on TiCLearn.</p>
             <a href="https://ticlearn.com/dashboard" class="button" style="display: block; text-align: center; width: fit-content; margin: 32px auto 0;">
               Go to Dashboard →
             </a>`
        }

        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">If you believe this change was made in error, please contact our support team.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
        <p><a href="https://ticlearn.com">ticlearn.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return sendEmail({ to: email, subject, html });
}

export async function sendUnverifiedWarningEmail({
  name,
  daysLeft,
  email,
}: {
  email: string;
  name: string;
  daysLeft: number;
}) {
  const subject = "Action Required: Verify your TiCLearn account";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your account</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">⚠️</div>
        <h1>TiCLearn</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Verify Your Email</h2>
        <p>Hi <span class="highlight">${name || "Student"}</span>,</p>
        <p>We noticed you haven't verified your TiCLearn account email yet. Your account is scheduled for deletion in <strong style="color: ${BRAND_COLORS.primary};">${daysLeft} days</strong> if you don't verify it.</p>

        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
          <p style="margin: 0; color: #92400e; font-weight: 600;">⚠️ Your account will be deleted in ${daysLeft} days</p>
          <p style="margin: 8px 0 0 0; color: #b45309; font-size: 14px;">Verify now to keep your account and continue using TiCLearn for free!</p>
        </div>

        <p style="color: #6b7280; font-size: 14px;">To verify your account, use the verification code from your original signup email or request a new one.</p>

        <a href="https://ticlearn.com/sign-in" class="button" style="display: block; text-align: center; width: fit-content; margin: 32px auto 0;">
          Sign In to Verify →
        </a>

        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">Having trouble? Contact our support team at support@ticlearn.com</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
        <p>Made with ❤️ for Cameroonian students</p>
        <p><a href="https://ticlearn.com">ticlearn.com</a> • <a href="https://ticlearn.com/support">Support</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return sendEmail({ to: email, subject, html });
}

export async function sendPaymentSuccessEmail({
  email,
  name,
  planLabel,
  amount,
  transId,
}: {
  email: string;
  name: string;
  planLabel: string;
  amount: number;
  transId: string;
}) {
  const subject = `✅ Payment Confirmed — ${planLabel}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">🚀</div>
        <h1>TiCLearn</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Payment Successful!</h2>
        <p>Hi <span class="highlight">${name || "there"}</span>,</p>
        <p>Your payment has been confirmed and your <span class="highlight">${planLabel}</span> is now active. You have full access to all premium features!</p>

        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e5e7eb;">
          <h3 style="margin-top: 0; font-size: 16px; color: #6b7280; text-transform: uppercase;">Receipt Details</h3>
          <p style="margin: 8px 0;"><strong>Plan:</strong> ${planLabel}</p>
          <p style="margin: 8px 0;"><strong>Amount:</strong> ${amount.toLocaleString()} FCFA</p>
          <p style="margin: 8px 0;"><strong>Transaction ID:</strong> <code style="background: #eee; padding: 2px 4px;">${transId}</code></p>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Go to Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
        <p>Questions? Reply to this email or visit our help center.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return sendEmail({ to: email, subject, html });
}

export async function sendPaymentFailedEmail({
  email,
  name,
  planLabel,
  status, // "FAILED" or "EXPIRED"
}: {
  email: string;
  name: string;
  planLabel: string;
  status: string;
}) {
  const isExpired = status === "EXPIRED";
  const subject = `⚠️ Payment ${isExpired ? "Expired" : "Failed"}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);">
        <div class="logo">⚠️</div>
        <h1>TiCLearn</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Payment Unsuccessful</h2>
        <p>Hi <span class="highlight">${name || "there"}</span>,</p>
        <p>Unfortunately, your payment attempt for the <span class="highlight">${planLabel}</span> was ${isExpired ? "not completed in time and has expired" : "declined by the provider"}.</p>

        <p>Don't worry, your account is safe! You can try the payment again using the button below:</p>

        <div style="text-align: center; margin-top: 32px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" class="button" style="background: #ef4444;">Try Again</a>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return sendEmail({ to: email, subject, html });
}

export async function sendAdminPaymentAlert({
  adminEmail,
  userName,
  userEmail,
  planLabel,
  amount,
}: {
  adminEmail: string;
  userName: string;
  userEmail: string;
  planLabel: string;
  amount: number;
}) {
  const subject = `💰 New Sale: ${planLabel} — ${userName}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #10b981;">New Payment Received!</h2>
      <p><strong>Customer:</strong> ${userName} (${userEmail})</p>
      <p><strong>Plan:</strong> ${planLabel}</p>
      <p><strong>Amount:</strong> ${amount.toLocaleString()} FCFA</p>
      <hr />
      <p style="font-size: 12px; color: #999;">Notification sent from TiCLearn Billing System</p>
    </div>
  `;
  return sendEmail({ to: adminEmail, subject, html });
}

export async function sendPlatformUpdateEmail({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  const subject =
    "🎓 Big News: Your Study Just Got Easier! New Features Inside";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Platform Updates</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">🎓</div>
        <h1>TiCLearn</h1>
      </div>
      <div class="content">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Big News: Your Study Just Got Easier!</h2>
        <p>Hi <span class="highlight">${name || "Student"}</span>,</p>
        <p>We've been working hard to make TiCLearn even better for you. Here are some exciting updates:</p>

        <h3 style="color: #1f2937; margin-top: 28px; margin-bottom: 12px;">🚀 What's New</h3>
        <ul class="features">
          <li><span class="features-icon">📄</span> <strong>More File Types</strong> - Now you can upload not just PDFs, but also <strong>Word documents</strong> and <strong>images</strong> directly!</li>
          <li><span class="features-icon">🔍</span> <strong>Smart OCR Technology</strong> - Even scanned documents and photos of your lecture notes are now readable. Our AI extracts text automatically.</li>
          <li><span class="features-icon">🎯</span> <strong>Instant Start</strong> - New users now get 3 default quizzes to start practicing immediately!</li>
          <li><span class="features-icon">👥</span> <strong>Better Navigation</strong> - Our sidebar is now cleaner and easier to navigate.</li>
        </ul>

        <h3 style="color: #1f2937; margin-top: 28px; margin-bottom: 12px;">🔔 Coming Soon</h3>
        <ul class="features">
          <li><span class="features-icon">📊</span> <strong>Excel Support</strong> - Upload and practice with spreadsheet data</li>
          <li><span class="features-icon">📽️</span> <strong>PowerPoint Support</strong> - Convert presentations to quizzes</li>
          <li><span class="features-icon">📱</span> <strong>Mobile App</strong> - Study anywhere with our soon-to-launch mobile app</li>
          <li><span class="features-icon">👥</span> <strong>Study Groups</strong> - Collaborate with classmates</li>
          <li><span class="features-icon">🎓</span> <strong>Certificates</strong> - Earn completion certificates</li>
        </ul>

        <a href="https://ticlearn.com/dashboard" class="button" style="display: block; text-align: center; width: fit-content; margin: 32px auto 0;">
          Explore Now →
        </a>

        <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.primary};">
            Join 5,000+ students already acing their GCE exams!
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          Have questions or need help? Reply to this email - we're here to help you succeed!
        </p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} TiCLearn. All rights reserved.</p>
        <p>Made with ❤️ for Cameroonian students</p>
        <p><a href="https://ticlearn.com">ticlearn.com</a> • <a href="https://ticlearn.com/support">Support</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return sendEmail({ to: email, subject, html });
}
