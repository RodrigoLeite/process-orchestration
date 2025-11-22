/**
 * Notification Service
 * Suporte para SMS (Twilio) e Email (SendGrid)
 */

import { storage } from "../storage";

interface NotificationPayload {
  type: "sms" | "email";
  to: string;
  subject?: string;
  message: string;
  metadata?: Record<string, any>;
}

interface CriticalBottleneckAlert {
  area: string;
  severity_score: number;
  etapa: string;
  cause: string;
  recommendation: string;
  timestamp: string;
}

/**
 * Enviar SMS via Twilio (stub para integração)
 */
export async function sendSMS(to: string, message: string, metadata?: Record<string, any>): Promise<boolean> {
  try {
    console.log(`[SMS] Enviando para ${to}: ${message.substring(0, 50)}...`);
    
    // TODO: Integrar com Twilio
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: to
    // });
    
    // Para agora, apenas log
    await storage.createLog({
      level: "info",
      message: "SMS notification sent",
      metadata: { phone: to, messageLength: message.length, ...metadata }
    });
    
    return true;
  } catch (error) {
    console.error("[SMS] Erro ao enviar:", error);
    await storage.createLog({
      level: "error",
      message: "Failed to send SMS",
      metadata: { phone: to, error: String(error) }
    });
    return false;
  }
}

/**
 * Enviar Email via SendGrid (stub para integração)
 */
export async function sendEmail(
  to: string,
  subject: string,
  message: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    console.log(`[EMAIL] Enviando para ${to}: ${subject}`);
    
    // TODO: Integrar com SendGrid
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to,
    //   from: process.env.SENDGRID_FROM_EMAIL,
    //   subject,
    //   html: message
    // });
    
    // Para agora, apenas log
    await storage.createLog({
      level: "info",
      message: "Email notification sent",
      metadata: { email: to, subject, ...metadata }
    });
    
    return true;
  } catch (error) {
    console.error("[EMAIL] Erro ao enviar:", error);
    await storage.createLog({
      level: "error",
      message: "Failed to send email",
      metadata: { email: to, error: String(error) }
    });
    return false;
  }
}

/**
 * Notificar sobre gargalo crítico
 */
export async function notifyCriticalBottleneck(alert: CriticalBottleneckAlert, recipients?: string[]): Promise<void> {
  try {
    const subject = `🚨 ALERTA CRÍTICO: Gargalo Detectado em ${alert.area}`;
    const htmlMessage = `
      <h2>⚠️ Gargalo Crítico Detectado</h2>
      <p><strong>Área:</strong> ${alert.area}</p>
      <p><strong>Etapa:</strong> ${alert.etapa}</p>
      <p><strong>Severity Score:</strong> ${alert.severity_score}/100</p>
      <p><strong>Causa:</strong> ${alert.cause}</p>
      <p><strong>Recomendação:</strong> ${alert.recommendation}</p>
      <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
      <p>
        <a href="http://localhost:5000/app/bottlenecks" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Ver Dashboard de Gargalos
        </a>
      </p>
    `;
    
    const textMessage = `
GARGALO CRÍTICO DETECTADO
Área: ${alert.area}
Etapa: ${alert.etapa}
Severity: ${alert.severity_score}/100
Causa: ${alert.cause}
Recomendação: ${alert.recommendation}
Timestamp: ${alert.timestamp}
    `;
    
    // Notificar via webhook (já implementado)
    await dispatchCriticalBottleneckWebhook(alert);
    
    // Notificar via email (se houver destinatários)
    if (recipients && recipients.length > 0) {
      for (const recipient of recipients) {
        await sendEmail(recipient, subject, htmlMessage, { alert });
      }
    }
    
    console.log(`[NOTIFICATION] Alerta crítico enviado para ${alert.area}`);
  } catch (error) {
    console.error("[NOTIFICATION] Erro ao notificar gargalo crítico:", error);
  }
}

/**
 * Disparar webhook para gargalo crítico
 */
async function dispatchCriticalBottleneckWebhook(alert: CriticalBottleneckAlert): Promise<void> {
  try {
    // Implementação será adicionada no routes.ts após integração
    console.log(`[WEBHOOK] Disparando evento BOTTLENECK_CRITICAL para ${alert.area}`);
  } catch (error) {
    console.error("[WEBHOOK] Erro ao disparar webhook:", error);
  }
}

/**
 * Enviar notificação genérica
 */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  if (payload.type === "sms") {
    return sendSMS(payload.to, payload.message, payload.metadata);
  } else if (payload.type === "email") {
    return sendEmail(payload.to, payload.subject || "Notificação", payload.message, payload.metadata);
  }
  return false;
}
