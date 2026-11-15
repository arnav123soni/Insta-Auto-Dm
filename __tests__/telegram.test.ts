import { describe, it, expect, vi, beforeEach } from "vitest";
import { escapeMarkdown, sendTelegramAdminAlert } from "../lib/notifications/telegram";

describe("Telegram Alert Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("escapeMarkdown", () => {
    it("escapes special Markdown characters", () => {
      expect(escapeMarkdown("user_name*test`foo[bar]")).toBe(
        "user\\_name\\*test\\`foo\\[bar\\]"
      );
    });

    it("handles strings without special characters unchanged", () => {
      expect(escapeMarkdown("cleanUsername123")).toBe("cleanUsername123");
    });
  });

  describe("sendTelegramAdminAlert", () => {
    it("gracefully returns false when tokens are not set", async () => {
      vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
      vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "");
      const result = await sendTelegramAdminAlert("test");
      expect(result).toBe(false);
    });

    it("sends message successfully when configured", async () => {
      vi.stubEnv("TELEGRAM_BOT_TOKEN", "fake_bot_token");
      vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "12345678");

      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const result = await sendTelegramAdminAlert("Hello admin");
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.telegram.org/botfake_bot_token/sendMessage",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });
});
