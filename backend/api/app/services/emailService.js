const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
    constructor() {
        // Sprawdź czy jest środowisko testowe
        this.isTestMode = process.env.EMAIL_TEST_MODE === 'true' || 
                         process.env.SMTP_PASS === 'MUSISZ-WYGENEROWAC-HASLO-APLIKACJI' ||
                         process.env.SMTP_PASS === 'your-app-password';

        if (this.isTestMode) {
            this.transporter = null;
        } else {
            // Konfiguracja NodeMailer dla produkcji
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER || 'wbukowski1985@gmail.com',
                    pass: process.env.SMTP_PASS || 'your-app-password'
                }
            });
        }
    }

    async sendVerificationCode(email, code) {
        try {
            // TRYB TESTOWY - loguj do konsoli zamiast wysyłać
            if (this.isTestMode) {
                console.log('\n' + '='.repeat(60));
                console.log('📧 TESTOWY EMAIL 2FA');
                console.log('='.repeat(60));
                console.log(`📤 DO: ${email}`);
                console.log(`🔐 KOD WERYFIKACYJNY: ${code}`);
                console.log(`⏰ WAŻNY PRZEZ: 5 minut`);
                console.log('='.repeat(60));
                console.log('💡 UWAGA: To jest tryb testowy. Email nie został wysłany.');
                console.log('💡 Użyj kodu powyżej do weryfikacji 2FA.');
                console.log('💡 Aby wysyłać prawdziwe emaile, skonfiguruj Gmail w .env');
                console.log('='.repeat(60) + '\n');
                
                return { 
                    success: true, 
                    messageId: 'test-mode-' + Date.now(),
                    testMode: true
                };
            }

            // TRYB PRODUKCYJNY - wysyłaj prawdziwy email
            const fromAddress = process.env.EMAIL_FROM || 'BukowskiApp <bukowskiapp.system@gmail.com>';
            
            const mailOptions = {
                from: fromAddress,
                to: email,
                subject: 'Kod weryfikacyjny - BukowskiApp',
                replyTo: 'BukowskiApp <bukowskiapp.system@gmail.com>',
                headers: {
                    'X-Sender': 'BukowskiApp',
                    'X-Application': 'BukowskiApp 2FA System'
                },
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #333; text-align: center; margin-bottom: 30px;">🔐 Kod weryfikacyjny - BukowskiApp</h2>
                            <p style="color: #666; font-size: 16px; line-height: 1.5;">
                                Otrzymujesz ten email, ponieważ ktoś próbuje zalogować się do panelu administracyjnego BukowskiApp.
                            </p>
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                                <p style="color: #333; font-size: 18px; margin-bottom: 10px;">Twój kod weryfikacyjny:</p>
                                <h1 style="color: #007bff; font-size: 36px; font-weight: bold; letter-spacing: 5px; margin: 0;">${code}</h1>
                            </div>
                            <p style="color: #666; font-size: 14px; line-height: 1.5;">
                                Kod jest ważny przez <strong>5 minut</strong>. Jeśli to nie Ty próbujesz się zalogować, zignoruj tę wiadomość.
                            </p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                            <p style="color: #999; font-size: 12px; text-align: center;">
                                Wiadomość wygenerowana automatycznie przez BukowskiApp - nie odpowiadaj na ten email.
                            </p>
                        </div>
                    </div>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error('❌ Error sending email:', error);
            return { success: false, error: error.message };
        }
    }

    // Test połączenia SMTP
    async testConnection() {
        if (this.isTestMode) {
            return true;
        }

        try {
            await this.transporter.verify();
            console.log('✅ SMTP connection verified successfully');
            return true;
        } catch (error) {
            console.error('❌ SMTP connection failed:', error);
            return false;
        }
    }

    // Sprawdź tryb pracy
    getMode() {
        return {
            isTestMode: this.isTestMode,
            smtpHost: process.env.SMTP_HOST,
            smtpUser: process.env.SMTP_USER,
            hasPassword: !!process.env.SMTP_PASS && process.env.SMTP_PASS !== 'your-app-password'
        };
    }
}

module.exports = new EmailService();