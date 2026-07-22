export const InvitationTemplate = (token: string) => {
  const invitationUrl = `https://predict-the-win.vercel.app/register?token=${token}`;
  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tournament Invitation</title>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #161b22; border: 1px solid #232a35; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
        
        <!-- HEADER -->
        <div style="background-color: #12161f; padding: 28px 24px; text-align: center; border-bottom: 1px solid #232a35;">
          <div style="display: inline-block; padding: 4px 12px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 20px; color: #34d399; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
            ⚽ Predict The Win
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">
            You're Invited to Compete!
          </h1>
        </div>

        <!-- MAIN BODY -->
        <div style="padding: 32px 28px; background-color: #161b22;">
          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-top: 0; margin-bottom: 16px;">
            You have been invited to join the football tournament on <strong style="color: #ffffff;">Predict The Win</strong>.
          </p>

          <p style="font-size: 15px; color: #94a3b8; line-height: 1.6; margin-bottom: 28px;">
            Lock in your predictions, score points for exact results, and battle for the top spot on the leaderboard.
          </p>

          <!-- CTA BUTTON -->
          <div style="margin: 32px 0; text-align: center;">
            <a href="${invitationUrl}"
               target="_blank"
               style="background-color: #10b981; color: #022c22; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
              Accept Invitation & Join
            </a>
          </div>

          <!-- EXPIRATION / WARNING NOTE -->
          <div style="background-color: #0f131a; padding: 16px; border-radius: 8px; border-left: 3px solid #f59e0b; margin-top: 28px;">
            <p style="font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5;">
              <strong style="color: #fbbf24;">Please note:</strong> This invitation link is active for <strong style="color: #e2e8f0;">24 hours</strong>. If you weren't expecting this email, you can safely ignore it.
            </p>
          </div>

          <!-- RAW LINK FALLBACK -->
          <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #232a35;">
            <p style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
              Button not working? Copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #34d399; word-break: break-all; margin: 0; font-family: monospace;">
              ${invitationUrl}
            </p>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="padding: 20px; background-color: #0f131a; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #232a35;">
          © ${currentYear} Predict The Win • May the best pundit win 🏆
        </div>

      </div>
    </body>
    </html>
  `;
};
