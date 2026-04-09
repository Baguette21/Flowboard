"use node";

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

function formatRetryAfter(retryAfterMs: number) {
  const totalMinutes = Math.max(1, Math.ceil(retryAfterMs / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable \`${name}\``);
  }

  return value;
}

function createR2Client() {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export const createUploadUrl = action({
  args: {
    cardId: v.id("cards"),
    fileName: v.string(),
    contentType: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ key: string; uploadUrl: string }> => {
    if (!args.contentType.startsWith("image/")) {
      throw new Error("Only image uploads are allowed");
    }

    const card: Doc<"cards"> | null = await ctx.runQuery(api.cards.get, {
      cardId: args.cardId,
    });
    if (!card) {
      throw new Error("Task not found or access denied");
    }

    const allowance = await ctx.runQuery(api.cardAttachments.getUploadAllowance, {});
    if (allowance.role !== "PRO" && (allowance.remaining ?? 0) <= 0) {
      throw new Error(
        `Upload limit reached. Free users can upload ${allowance.limit} images every 6 hours. Try again in ${formatRetryAfter(allowance.retryAfterMs)} or ask an admin to set your user role to PRO in the Convex dashboard.`,
      );
    }

    const bucket = requireEnv("R2_BUCKET");
    const client = createR2Client();
    const key: string =
      `cards/${card.boardId}/${card._id}/${Date.now()}-${sanitizeFileName(args.fileName)}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: args.contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return { key, uploadUrl };
  },
});

export const getDownloadUrl = action({
  args: { attachmentId: v.id("cardAttachments") },
  handler: async (
    ctx,
    { attachmentId },
  ): Promise<{ url: string }> => {
    const attachment: Doc<"cardAttachments"> | null = await ctx.runQuery(
      api.cardAttachments.getForAccess,
      { attachmentId },
    );
    if (!attachment) {
      throw new Error("Attachment not found or access denied");
    }

    const bucket = requireEnv("R2_BUCKET");
    const client = createR2Client();
    const command: GetObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: attachment.key,
      ResponseContentType: attachment.mimeType,
    });

    const url: string = await getSignedUrl(client, command, { expiresIn: 3600 });
    return { url };
  },
});

export const deleteObject = action({
  args: { attachmentId: v.id("cardAttachments") },
  handler: async (ctx, { attachmentId }): Promise<null> => {
    const attachment: Doc<"cardAttachments"> | null = await ctx.runQuery(
      api.cardAttachments.getForAccess,
      { attachmentId },
    );
    if (!attachment) {
      throw new Error("Attachment not found or access denied");
    }

    const bucket = requireEnv("R2_BUCKET");
    const client = createR2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: attachment.key,
      }),
    );

    return null;
  },
});
