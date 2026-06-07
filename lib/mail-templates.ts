export function verificationMail(input: { siteName: string; code: string; verifyUrl: string }) {
  const siteName = input.siteName || "api-proxy";
  return {
    subject: `验证你的 ${siteName} 账号`,
    text: `你的验证码是：${input.code}\n\n验证码 10 分钟内有效。\n\n也可以点击下面的链接完成验证：\n${input.verifyUrl}\n\n如果不是你本人操作，可以忽略这封邮件。`,
    html: baseMail({
      siteName,
      eyebrow: "邮箱验证",
      title: `验证你的 ${siteName} 账号`,
      intro: "使用下面的验证码完成注册。验证码 10 分钟内有效。",
      code: input.code,
      buttonText: "验证邮箱",
      url: input.verifyUrl,
      note: "如果不是你本人操作，可以忽略这封邮件。",
    }),
  };
}

export function smtpTestMail(siteName: string) {
  const name = siteName || "api-proxy";
  return {
    subject: `${name} SMTP 测试邮件`,
    text: `这是一封来自 ${name} 的 SMTP 测试邮件。`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#171614;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#ebe7dd;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#171614;padding:32px 16px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#211f1b;border:1px solid #474139;border-radius:14px;overflow:hidden;"><tr><td style="padding:26px 30px;"><div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#eac064;margin-bottom:12px;">SMTP 测试</div><div style="font-size:24px;font-weight:650;color:#f1ede4;">邮件服务已连通</div><div style="margin-top:10px;font-size:13px;line-height:1.7;color:#b9b1a5;">这是一封来自 ${escapeHtml(name)} 的测试邮件。收到它说明 SMTP 基础配置可以正常发送邮件。</div></td></tr></table></td></tr></table></body></html>`,
  };
}

export function resetPasswordMail(input: { siteName: string; code: string; resetUrl: string }) {
  const siteName = input.siteName || "api-proxy";
  return {
    subject: `重置你的 ${siteName} 密码`,
    text: `你的重置验证码是：${input.code}\n\n验证码 10 分钟内有效。\n\n也可以点击下面的链接重置密码：\n${input.resetUrl}\n\n如果不是你本人操作，可以忽略这封邮件。`,
    html: baseMail({
      siteName,
      eyebrow: "密码重置",
      title: `重置你的 ${siteName} 密码`,
      intro: "使用下面的验证码重置密码。验证码 10 分钟内有效。",
      code: input.code,
      buttonText: "重置密码",
      url: input.resetUrl,
      note: "如果不是你本人操作，可以忽略这封邮件。",
    }),
  };
}

function baseMail(input: { siteName: string; eyebrow: string; title: string; intro: string; code: string; buttonText: string; url: string; note: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#171614;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#ebe7dd;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#171614;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#211f1b;border:1px solid #474139;border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.32);">
            <tr>
              <td style="padding:26px 30px 20px;border-bottom:1px solid #3a352e;">
                <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#eac064;margin-bottom:12px;">${escapeHtml(input.eyebrow)}</div>
                <div style="font-size:24px;font-weight:650;letter-spacing:-.02em;color:#f1ede4;">${escapeHtml(input.title)}</div>
                <div style="margin-top:8px;font-size:13px;line-height:1.7;color:#b9b1a5;">${escapeHtml(input.intro)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 30px 8px;">
                <div style="border:1px solid #5a4c30;background:#2a251a;border-radius:12px;padding:22px;text-align:center;">
                  <div style="font-size:11px;color:#8f867a;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px;">Verification Code</div>
                  <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;line-height:1;font-weight:700;letter-spacing:.24em;color:#f0c76d;">${escapeHtml(input.code)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 30px 8px;">
                <a href="${escapeAttr(input.url)}" style="display:inline-block;background:#eac064;color:#21180a;text-decoration:none;border-radius:8px;padding:11px 18px;font-size:13px;font-weight:650;">${escapeHtml(input.buttonText)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 30px 26px;">
                <div style="font-size:12px;line-height:1.7;color:#8f867a;">按钮不可用时，复制下面的链接到浏览器打开：</div>
                <div style="margin-top:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.6;color:#c4baaa;word-break:break-all;background:#171614;border:1px solid #3a352e;border-radius:8px;padding:10px;">${escapeHtml(input.url)}</div>
                <div style="margin-top:18px;font-size:12px;line-height:1.7;color:#8f867a;">${escapeHtml(input.note)}</div>
              </td>
            </tr>
          </table>
          <div style="max-width:560px;margin-top:14px;font-size:11px;line-height:1.6;color:#766f66;text-align:center;">${escapeHtml(input.siteName)} 自动发送，请勿直接回复。</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] ?? ch));
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
