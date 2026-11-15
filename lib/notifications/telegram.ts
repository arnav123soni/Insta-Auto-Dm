/**
 * Escapes characters with special meaning in Telegram Markdown:
 * _, *, `, [
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[\]])/g, "\\$1");
}

/**
 * Helper to dispatch Telegram alerts to the administrator
 * when a creator requests an Instagram Tester invite.
 */
export async function sendTelegramAdminAlert(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    // If not configured, gracefully log and continue without breaking the app
    console.info("[Telegram Alert] Admin alert skipped (TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not set)");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn("[Telegram Alert] Failed to dispatch admin alert:", err);
    return false;
  }
}
