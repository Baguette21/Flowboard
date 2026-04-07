import type { Theme } from "@auth/core/types";
import { convexAuth } from "@convex-dev/auth/server";
import type {
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

const sendSmtpVerificationRequest = (async (
  { identifier, token }: Pick<VerificationRequestParams, "identifier" | "token">,
  ctx: GenericActionCtxWithAuthConfig<DataModel>,
) => {
  await ctx.runAction(internal.smtp.sendVerificationEmail, {
    to: identifier,
    code: token,
  });
}) as unknown as (params: VerificationRequestParams) => Promise<void>;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
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
    }),
  ],
});
