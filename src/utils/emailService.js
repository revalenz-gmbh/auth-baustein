import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email-Transporter konfigurieren
const createTransporter = () => {
  // Für Entwicklung: SMTP (Gmail)
  if (process.env.NODE_ENV === 'development' || process.env.SMTP_USER) {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Für Produktion: SendGrid EU (empfohlen)
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransporter({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }
  
  // Fallback: Mailgun EU
  if (process.env.MAILGUN_EU_API_KEY) {
    return nodemailer.createTransporter({
      host: 'smtp.eu.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILGUN_EU_API_KEY,
        pass: process.env.MAILGUN_EU_API_KEY
      }
    });
  }
  
  // Letzter Fallback: Gmail SMTP
  return nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Verifizierungs-Token generieren
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Verifizierungs-Email senden
export const sendVerificationEmail = async (email, name, token) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'https://revalenz.de'}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@revalenz.de',
      to: email,
      subject: 'E-Mail-Adresse bestätigen - Revalenz',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>E-Mail bestätigen</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .logo { max-width: 150px; height: auto; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${process.env.FRONTEND_URL || 'https://revalenz.de'}/logo-revalenzblau.png" alt="Revalenz" class="logo">
            <h1>Willkommen bei Revalenz!</h1>
          </div>
          <div class="content">
            <h2>Hallo ${name || 'Liebe/r Nutzer/in'}!</h2>
            <p>vielen Dank für Ihre Registrierung bei Revalenz. Um Ihr Konto zu aktivieren und unsere Services nutzen zu können, bestätigen Sie bitte Ihre E-Mail-Adresse.</p>
            
            <p><strong>Warum ist das wichtig?</strong></p>
            <ul>
              <li>Sicherheit: Wir stellen sicher, dass nur Sie Zugriff auf Ihr Konto haben</li>
              <li>Kommunikation: Wir können Ihnen wichtige Updates und Informationen senden</li>
              <li>Workshop-Anmeldungen: Sie können sich für unsere KIckstart Workshops anmelden</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">E-Mail-Adresse bestätigen</a>
            </div>
            
            <p><strong>Datenschutz-Hinweis:</strong></p>
            <p>Mit der Bestätigung Ihrer E-Mail-Adresse stimmen Sie zu, dass Revalenz GmbH Ihre Daten gemäß unserer <a href="${process.env.FRONTEND_URL || 'https://revalenz.de'}/datenschutz">Datenschutzerklärung</a> verarbeitet. Sie können Ihre Einwilligung jederzeit widerrufen.</p>
            
            <p>Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:</p>
            <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">${verificationUrl}</p>
            
            <p>Dieser Link ist 24 Stunden gültig.</p>
            
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung!</p>
            <p>Ihr Revalenz-Team</p>
          </div>
          <div class="footer">
            <p>Revalenz GmbH | Innovationsberatung & KI-Workshops</p>
            <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Willkommen bei Revalenz!
        
        Hallo ${name || 'Liebe/r Nutzer/in'}!
        
        Vielen Dank für Ihre Registrierung bei Revalenz. Um Ihr Konto zu aktivieren, bestätigen Sie bitte Ihre E-Mail-Adresse:
        
        ${verificationUrl}
        
        Mit der Bestätigung stimmen Sie zu, dass Revalenz GmbH Ihre Daten gemäß unserer Datenschutzerklärung verarbeitet.
        
        Dieser Link ist 24 Stunden gültig.
        
        Bei Fragen stehen wir Ihnen gerne zur Verfügung!
        
        Ihr Revalenz-Team
        Revalenz GmbH | Innovationsberatung & KI-Workshops
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Willkommens-Email nach Verifizierung senden
export const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@revalenz.de',
      to: email,
      subject: 'Willkommen bei Revalenz - Ihr Konto ist aktiviert!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Willkommen bei Revalenz</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .logo { max-width: 150px; height: auto; }
            .feature { background-color: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #1e40af; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${process.env.FRONTEND_URL || 'https://revalenz.de'}/logo-revalenzblau.png" alt="Revalenz" class="logo">
            <h1>Willkommen bei Revalenz!</h1>
          </div>
          <div class="content">
            <h2>Hallo ${name || 'Liebe/r Nutzer/in'}!</h2>
            <p>🎉 <strong>Herzlichen Glückwunsch!</strong> Ihr Konto wurde erfolgreich aktiviert.</p>
            
            <p>Sie können jetzt alle Services von Revalenz nutzen:</p>
            
            <div class="feature">
              <h3>🚀 KIckstart Workshop</h3>
              <p>Lernen Sie, wie Sie mit KI und Open-Source-Komponenten professionelle Websites erstellen.</p>
            </div>
            
            <div class="feature">
              <h3>💡 Innovationsberatung</h3>
              <p>Entwickeln Sie innovative Lösungen für Ihr Unternehmen mit unserer Expertise.</p>
            </div>
            
            <div class="feature">
              <h3>🛠️ Baukasten-System</h3>
              <p>Nutzen Sie unsere modularen Komponenten für schnelle und sichere Entwicklung.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://revalenz.de'}/kickstart-workshop" class="button">Jetzt Workshop anmelden</a>
            </div>
            
            <p><strong>Nächste Schritte:</strong></p>
            <ul>
              <li>Stöbern Sie durch unsere <a href="${process.env.FRONTEND_URL || 'https://revalenz.de'}/leistungen">Leistungen</a></li>
              <li>Melden Sie sich für unseren <a href="${process.env.FRONTEND_URL || 'https://revalenz.de'}/kickstart-workshop">KIckstart Workshop</a> an</li>
              <li>Kontaktieren Sie uns für eine <a href="${process.env.FRONTEND_URL || 'https://revalenz.de'}/kontakt">individuelle Beratung</a></li>
            </ul>
            
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung!</p>
            <p>Ihr Revalenz-Team</p>
          </div>
          <div class="footer">
            <p>Revalenz GmbH | Innovationsberatung & KI-Workshops</p>
            <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Willkommen bei Revalenz!
        
        Hallo ${name || 'Liebe/r Nutzer/in'}!
        
        🎉 Herzlichen Glückwunsch! Ihr Konto wurde erfolgreich aktiviert.
        
        Sie können jetzt alle Services von Revalenz nutzen:
        
        🚀 KIckstart Workshop
        Lernen Sie, wie Sie mit KI und Open-Source-Komponenten professionelle Websites erstellen.
        
        💡 Innovationsberatung
        Entwickeln Sie innovative Lösungen für Ihr Unternehmen mit unserer Expertise.
        
        🛠️ Baukasten-System
        Nutzen Sie unsere modularen Komponenten für schnelle und sichere Entwicklung.
        
        Nächste Schritte:
        - Stöbern Sie durch unsere Leistungen
        - Melden Sie sich für unseren KIckstart Workshop an
        - Kontaktieren Sie uns für eine individuelle Beratung
        
        Bei Fragen stehen wir Ihnen gerne zur Verfügung!
        
        Ihr Revalenz-Team
        Revalenz GmbH | Innovationsberatung & KI-Workshops
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};
