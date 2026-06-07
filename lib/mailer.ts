import net from "node:net";
import tls from "node:tls";
import type { AppSettings } from "@/lib/settings";

type Mail = { to: string; subject: string; text: string; html?: string };

export async function sendMail(settings: AppSettings, mail: Mail) {
  if (!settings.smtpEnabled) throw new Error("SMTP 未启用");
  if (!settings.smtpHost || !settings.smtpFromEmail) throw new Error("SMTP 配置不完整");
  const socket = await connect(settings);
  const client = new SmtpClient(socket);
  try {
    await client.ready();
    await client.cmd(`EHLO localhost`);
    if (settings.smtpSecure === "starttls") {
      await client.cmd("STARTTLS");
      client.upgrade(settings.smtpHost);
      await client.cmd(`EHLO localhost`);
    }
    if (settings.smtpUser) {
      await client.cmd("AUTH LOGIN");
      await client.cmd(Buffer.from(settings.smtpUser).toString("base64"));
      await client.cmd(Buffer.from(settings.smtpPassword).toString("base64"));
    }
    await client.cmd(`MAIL FROM:<${settings.smtpFromEmail}>`);
    await client.cmd(`RCPT TO:<${mail.to}>`);
    await client.cmd("DATA");
    await client.writeData(message(settings, mail));
    await client.cmd("QUIT").catch(() => null);
  } finally {
    socket.destroy();
  }
}

function connect(settings: AppSettings) {
  return new Promise<net.Socket>((resolve, reject) => {
    const onError = (err: Error) => reject(err);
    const socket = settings.smtpSecure === "ssl"
      ? tls.connect({ port: settings.smtpPort, host: settings.smtpHost }, () => resolve(socket))
      : net.connect(settings.smtpPort, settings.smtpHost, () => resolve(socket));
    socket.once("error", onError);
  });
}

function message(settings: AppSettings, mail: Mail) {
  const fromName = settings.smtpFromName || "api-proxy";
  const parts = [
    `From: ${fromName} <${settings.smtpFromEmail}>`,
    `To: ${mail.to}`,
    `Subject: ${mail.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    mail.html ?? mail.text.replace(/\n/g, "<br>"),
    ".",
    "",
  ];
  return parts.join("\r\n");
}

class SmtpClient {
  private buffer = "";

  constructor(private socket: net.Socket) {
    socket.on("data", chunk => { this.buffer += chunk.toString("utf8"); });
  }

  upgrade(host: string) {
    this.socket = tls.connect({ socket: this.socket, servername: host });
    this.buffer = "";
    this.socket.on("data", chunk => { this.buffer += chunk.toString("utf8"); });
  }

  ready() { return this.read(); }

  async cmd(command: string) {
    this.socket.write(`${command}\r\n`);
    return this.read();
  }

  async writeData(data: string) {
    this.socket.write(data);
    return this.read();
  }

  private read() {
    return new Promise<string>((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (/^\d{3} /m.test(this.buffer)) {
          const text = this.buffer;
          this.buffer = "";
          clearInterval(timer);
          if (/^[45]\d\d /m.test(text)) reject(new Error(text.trim().slice(0, 240)));
          else resolve(text);
        } else if (Date.now() - started > 15000) {
          clearInterval(timer);
          reject(new Error("SMTP 响应超时"));
        }
      }, 20);
    });
  }
}
