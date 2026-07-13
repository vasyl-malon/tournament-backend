export const InvitationTemplate = (token: string) => {
  const invitationUrl = `https://www.google.com/auth/invitation?token=${token}`;

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Запрошення в систему</h1>
      </div>
      
      <div style="padding: 30px;">
        <h2 style="color: #1e293b; margin-top: 0;">Вас запрошено!</h2>
        <p style="font-size: 16px; color: #475569;">
          Ви отримали доступ до <strong>Malion Company</strong>. Щоб почати роботу, вам потрібно встановити пароль для свого акаунта.
        </p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${invitationUrl}" 
             style="background-color: #2563eb; color: #ffffff; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; transition: background-color 0.3s;">
            Прийняти запрошення
          </a>
        </div>
        
        <p style="font-size: 14px; color: #64748b; background-color: #f8fafc; padding: 15px; border-radius: 6px;">
          <strong>Зверніть увагу:</strong> Це посилання дійсне протягом 24 годин. Якщо ви не очікували цього листа, просто ігноруйте його.
        </p>
      </div>

      <div style="padding: 15px; background-color: #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
        © ${new Date().getFullYear()} Malion Company · Secure business platform
      </div>
    </div>
  `;
};
