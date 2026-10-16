export interface LayoutProps {
  children: string;
  preheader: string;
  appUrl: string;
}

const INK = "#1A1523";
const INK_MUTED = "#5B5468";
const INK_FAINT = "#8A8396";
const ACCENT = "#6D28D9";
const SURFACE = "#FFFFFF";
const CANVAS = "#F5F3F7";
const LINE = "#E5E1EC";
const ACCENT_TINT = "#F3E8FF";
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function layout({ children, preheader, appUrl }: LayoutProps): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TiCLearn</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:${SANS};color:${INK};">
  <!-- Preheader: hidden text shown in the inbox preview next to the subject. -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${INK_FAINT};mso-hide:all;">
    ${preheader}
    &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>
  <!--[if mso]>
  <table width="600" align="center"><tr><td>
  <![endif]-->
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 24px;">
        <table role="presentation" width="100%" style="border-collapse:collapse;">
          ${children}
        </table>
      </td>
    </tr>
  </table>
  <!--[if mso]>
  </td></tr></table>
  <![endif]-->
</body>
</html>`;
}

export function header(): string {
  return `
    <tr>
      <td align="center" style="padding:32px 24px;border-bottom:1px solid ${LINE};background:${SURFACE};">
        <img src="cid:logo@ticlearn.ticsummit.org" width="120" height="40" alt="TiCLearn" style="display:block;" />
      </td>
    </tr>`;
}

export function footer(appUrl: string): string {
  return `
    <tr>
      <td style="padding:32px 24px;border-top:1px solid ${LINE};background:${SURFACE};">
        <p style="margin:0 0 8px 0;font-size:14px;color:${INK_FAINT};font-family:${SANS};line-height:1.5;">
          &copy; ${new Date().getFullYear()} TiCLearn. All rights reserved.<br>
          Made with &hearts; for Cameroonian students
        </p>
        <p style="margin:0;font-size:12px;color:${INK_FAINT};font-family:${SANS};">
          <a href="${appUrl}" style="color:${ACCENT};text-decoration:none;">${appUrl}</a>
        </p>
      </td>
    </tr>`;
}

export function card(children: string): string {
  return `
    <tr>
      <td style="padding:0;">
        <table role="presentation" width="100%" style="border-collapse:collapse;background:${SURFACE};border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
          ${children}
        </table>
      </td>
    </tr>`;
}

export function section(children: string, style: string = ""): string {
  return `<tr><td style="padding:32px 24px;${style}">${children}</td></tr>`;
}

export function button(href: string, label: string, primary = true): string {
  const bg = primary ? ACCENT : SURFACE;
  const color = primary ? "#FFFFFF" : ACCENT;
  const border = primary ? "none" : `1px solid ${LINE}`;
  return `
    <tr>
      <td align="center" style="padding:16px 0;">
        <table role="presentation" align="center" style="border-collapse:collapse;">
          <tr>
            <td align="center" style="background:${bg};border:${border};border-radius:12px;">
              <a href="${escapeAttr(href)}" style="display:inline-block;background:${bg};border:${border};border-radius:12px;color:${color};font-family:${SANS};font-size:16px;font-weight:600;line-height:20px;padding:14px 32px;text-decoration:none;min-width:180px;text-align:center;">
                ${escapeHtml(label)}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function divider(color: string = LINE): string {
  return `<tr><td height="${1}" style="height:1px;line-height:1px;font-size:1px;background:${color};border:none;padding:0;margin:0;width:100%;"></td></tr>`;
}

export function codeBlock(code: string): string {
  const spaced = escapeHtml(code).split("").join(" ");
  return `
    <tr>
      <td align="center" style="padding:24px 0;">
        <table role="presentation" align="center" style="border-collapse:collapse;">
          <tr>
            <td align="center" style="background:${ACCENT_TINT};border:2px dashed ${ACCENT};border-radius:12px;padding:24px;">
              <div style="font-family:${MONO};font-size:36px;font-weight:800;color:${ACCENT};letter-spacing:6px;line-height:1.2;text-align:center;">
                ${spaced}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function statRow(
  stats: { value: string | number; label: string }[],
): string {
  const cells = stats
    .map(
      (s) => `<td width="33%" align="center" style="padding:8px 4px;">
        <table role="presentation" width="100%" style="border-collapse:collapse;background:${ACCENT_TINT};border-radius:12px;">
          <tr><td align="center" style="padding:16px;">
            <div style="font-size:24px;font-weight:800;color:${ACCENT};line-height:1.2;">${s.value}</div>
            <div style="font-size:12px;color:${INK_MUTED};margin-top:4px;line-height:1.5;">${s.label}</div>
          </td></tr>
        </table>
      </td>`,
    )
    .join("");
  return `<tr><td><table role="presentation" width="100%" style="border-collapse:collapse;"><tr>${cells}</tr></table></td></tr>`;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(str: string): string {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function text(
  content: string,
  opts: { size?: number; color?: string; weight?: number; align?: string } = {},
): string {
  const size = opts.size ?? 16;
  const color = opts.color ?? INK;
  const weight = opts.weight ?? 400;
  const align = opts.align ?? "left";
  return `<p style="margin:0 0 16px 0;font-size:${size}px;color:${color};font-weight:${weight};text-align:${align};font-family:${SANS};line-height:1.6;">${escapeHtml(content)}</p>`;
}

export function h1(content: string): string {
  return `<p style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:${INK};font-family:${SANS};line-height:1.3;">${escapeHtml(content)}</p>`;
}

export function h2(content: string): string {
  return `<p style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:${INK};font-family:${SANS};line-height:1.3;">${escapeHtml(content)}</p>`;
}

export function link(url: string, label: string): string {
  return `<a href="${escapeAttr(url)}" style="color:${ACCENT};text-decoration:none;word-break:break-all;">${escapeHtml(label)}</a>`;
}
