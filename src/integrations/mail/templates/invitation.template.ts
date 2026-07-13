export const InvitationTemplate = (token: string) => {
  const invitationUrl = `https://tournament-frontend-d48p.vercel.app/register?token=${token}`;

  return `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #059669; padding: 25px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">
          Tournament Invite
        </h1>
      </div>    
      <div style="padding: 30px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #475569; margin-bottom: 24px;">
          You have been invited to join the football tournament. It's time to lock in your predictions and claim the top spot on the leaderboard.
        </p>        
        <div style="margin: 35px 0; text-align: center;">
          <a href="${invitationUrl}" 
             style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); transition: all 0.3s ease;">
            Join the Tournament
          </a>
        </div>
        <p style="font-size: 14px; color: #64748b; background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #059669; margin-top: 30px;">
          <strong>Please note:</strong> This invitation link is valid for 24 hours. If you were not expecting this email, you can safely ignore it.
        </p>
      </div>
      <div style="padding: 20px; background-color: #f1f5f9; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        © ${new Date().getFullYear()} May the best pundit win 🏆
      </div>
    </div>
  `;
};
