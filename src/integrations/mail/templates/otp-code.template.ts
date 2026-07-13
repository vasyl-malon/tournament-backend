export const OtpCodeTemplate = (otp: string) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e1e1e1; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Ваш код входу</h1>
      </div>
      <div style="padding: 30px; text-align: center;">
        <p style="font-size: 16px;">Привіт! Використовуйте цей код для підтвердження входу в систему:</p>
        <div style="margin: 30px 0; padding: 15px; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #64748b;">Код дійсний лише 5 хвилин. Нікому не передавайте цей код.</p>
      </div>
      <div style="padding: 15px; background-color: #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
        © ${new Date().getFullYear()} CRM System. Усі права захищені.
      </div>
    </div>
  `;
};