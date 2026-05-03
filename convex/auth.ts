import type { Theme } from "@auth/core/types";
import { convexAuth } from "@convex-dev/auth/server";
import type {
  ConvexAuthConfig,
  EmailConfig,
  GenericActionCtxWithAuthConfig,
} from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type VerificationRequestParams = {
  identifier: string;
  url: string;
  expires: Date;
  provider: EmailConfig;
  token: string;
  theme: Theme;
  request: Request;
};

function buildUserData(
  profile: Record<string, unknown> & {
    emailVerified?: boolean;
    phoneVerified?: boolean;
  },
) {
  const {
    emailVerified,
    phoneVerified,
    ...userProfile
  } = profile;

  return {
    ...(emailVerified ? { emailVerificationTime: Date.now() } : null),
    ...(phoneVerified ? { phoneVerificationTime: Date.now() } : null),
    ...userProfile,
  };
}

const sendSmtpVerificationRequest = (async (
  { identifier, token }: Pick<VerificationRequestParams, "identifier" | "token">,
  ctx: GenericActionCtxWithAuthConfig<DataModel>,
) => {
  try {
    await ctx.runAction(internal.smtp.sendVerificationEmail, {
      to: identifier,
      code: token,
    });
  } catch (error) {
    console.error("Failed to send verification email", error);
    throw new Error("EmailDeliveryFailed");
  }
}) as unknown as (params: VerificationRequestParams) => Promise<void>;

const sendSmtpPasswordResetRequest = (async (
  { identifier, token }: Pick<VerificationRequestParams, "identifier" | "token">,
  ctx: GenericActionCtxWithAuthConfig<DataModel>,
) => {
  try {
    await ctx.runAction(internal.smtp.sendPasswordResetEmail, {
      to: identifier,
      code: token,
    });
  } catch (error) {
    console.error("Failed to send password reset email", error);
    throw new Error("PasswordResetDeliveryFailed");
  }
}) as unknown as (params: VerificationRequestParams) => Promise<void>;

const authConfig: ConvexAuthConfig = {
  providers: [
    Password({
      profile(params) {
        const email = params.email;
        if (typeof email !== "string" || email.trim().length === 0) {
          throw new Error("Email is required");
        }

        const name =
          typeof params.name === "string" && params.name.trim().length > 0
            ? params.name.trim()
            : undefined;

        return {
          email: normalizeEmail(email),
          ...(name ? { name } : {}),
        };
      },
      verify: Email({
        id: "email",
        maxAge: 10 * 60,
        async generateVerificationToken() {
          return generateOtpCode();
        },
        sendVerificationRequest: sendSmtpVerificationRequest,
      }),
      reset: Email({
        id: "password-reset",
        maxAge: 10 * 60,
        async generateVerificationToken() {
          return generateOtpCode();
        },
        sendVerificationRequest: sendSmtpPasswordResetRequest,
      }),
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const userData = buildUserData(args.profile);

      if (args.existingUserId) {
        const existingUser = await ctx.db.get(args.existingUserId);
        if (existingUser) {
          await ctx.db.patch(args.existingUserId, userData);
          return args.existingUserId;
        }
      }

      if (typeof args.profile.email === "string") {
        const existingUserByEmail = await (ctx.db as any)
          .query("users")
          .withIndex("email", (q: any) => q.eq("email", args.profile.email!))
          .unique();

        if (existingUserByEmail) {
          await ctx.db.patch(existingUserByEmail._id, userData);
          return existingUserByEmail._id;
        }
      }

      return await ctx.db.insert("users", userData);
    },
  },
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth(authConfig);
