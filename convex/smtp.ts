"use node";

import nodemailer from "nodemailer";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable \`${name}\``);
  }

  return value;
}

function parsePort(value: string) {
  const port = Number.parseInt(value, 10);
  if (Number.isNaN(port)) {
    throw new Error("SMTP_PORT must be a valid number");
  }

  return port;
}

export const sendVerificationEmail = internalAction({
  args: {
    to: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, args) => {
    const host = requireEnv("SMTP_HOST");
    const port = parsePort(process.env.SMTP_PORT ?? "587");
    const from = requireEnv("SMTP_FROM");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure =
      process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1"
        ? true
        : port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass
        ? {
            auth: {
              user,
              pass,
            },
          }
        : {}),
    });

    await transporter.sendMail({
      from,
      to: args.to,
      subject: "Your FlowBoard verification code",
      text: `Your FlowBoard verification code is ${args.code}. It expires in 10 minutes.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
<p>Your FlowBoard verification code is:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:0.3em;margin:20px 0">${args.code}</p>
<p>This code expires in 10 minutes.</p>
</div>`,
    });

    return null;
  },
});

export const sendPasswordResetEmail = internalAction({
  args: {
    to: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, args) => {
    const host = requireEnv("SMTP_HOST");
    const port = parsePort(process.env.SMTP_PORT ?? "587");
    const from = requireEnv("SMTP_FROM");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure =
      process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1"
        ? true
        : port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass
        ? {
            auth: {
              user,
              pass,
            },
          }
        : {}),
    });

    await transporter.sendMail({
      from,
      to: args.to,
      subject: "Your FlowBoard password reset code",
      text: `Your FlowBoard password reset code is ${args.code}. It expires in 10 minutes.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
<p>You requested a password reset for FlowBoard.</p>
<p style="font-size:32px;font-weight:700;letter-spacing:0.3em;margin:20px 0">${args.code}</p>
<p>This code expires in 10 minutes.</p>
</div>`,
    });

    return null;
  },
});

export const sendBoardInviteEmail = internalAction({
  args: {
    to: v.string(),
    boardName: v.string(),
    inviterName: v.union(v.string(), v.null()),
    inviterEmail: v.union(v.string(), v.null()),
  },
  handler: async (_ctx, args) => {
    const host = requireEnv("SMTP_HOST");
    const port = parsePort(process.env.SMTP_PORT ?? "587");
    const from = requireEnv("SMTP_FROM");
    const siteUrl = requireEnv("SITE_URL");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure =
      process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1"
        ? true
        : port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass
        ? {
            auth: {
              user,
              pass,
            },
          }
        : {}),
    });

    const inviterLabel =
      args.inviterName ?? args.inviterEmail ?? "A FlowBoard user";

    await transporter.sendMail({
      from,
      to: args.to,
      subject: `${inviterLabel} invited you to ${args.boardName} on FlowBoard`,
      text:
        `${inviterLabel} invited you to join the board "${args.boardName}" on FlowBoard.\n\n` +
        `Sign in with ${args.to} to view and accept the invite:\n${siteUrl}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
<p><strong>${inviterLabel}</strong> invited you to join the board <strong>${args.boardName}</strong> on FlowBoard.</p>
<p>Sign in with <strong>${args.to}</strong> to view and accept the invite.</p>
<p style="margin:24px 0">
  <a href="${siteUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">
    Open FlowBoard
  </a>
</p>
</div>`,
    });

    return null;
  },
});
