import { describe, it, expect } from "vitest";
import {
  CONTACT_CHANNELS,
  CONTACT_CHANNEL_COUNT,
  isValidContactChannel,
  getContactChannels,
} from "../../../src/lib/rules/contact-channels";

describe("Reglas puras de canales de contacto (F01-T05, ADR-004)", () => {
  describe("Exactamente 7 canales (ADR-004)", () => {
    it("CONTACT_CHANNELS contiene exactamente los 7 canales canónicos", () => {
      expect(CONTACT_CHANNELS).toEqual([
        "LinkedIn",
        "Email",
        "Referral",
        "ColdOutreach",
        "WhatsApp",
        "Phone",
        "Other",
      ]);
    });

    it("CONTACT_CHANNELS tiene exactamente 7 elementos", () => {
      expect(CONTACT_CHANNELS).toHaveLength(7);
    });

    it("CONTACT_CHANNEL_COUNT es 7", () => {
      expect(CONTACT_CHANNEL_COUNT).toBe(7);
    });

    it("no contiene canales adicionales ni repetidos", () => {
      const unicos = new Set(CONTACT_CHANNELS);
      expect(unicos.size).toBe(7);
      expect(unicos.size).toBe(CONTACT_CHANNELS.length);
    });
  });

  describe("Validación de canal de contacto", () => {
    it("isValidContactChannel acepta cada uno de los 7 canales", () => {
      for (const canal of CONTACT_CHANNELS) {
        expect(isValidContactChannel(canal)).toBe(true);
      }
    });

    it("isValidContactChannel rechaza valores inválidos", () => {
      expect(isValidContactChannel("")).toBe(false);
      expect(isValidContactChannel("Slack" as any)).toBe(false);
      expect(isValidContactChannel("Twitter" as any)).toBe(false);
      expect(isValidContactChannel("linkedin" as any)).toBe(false); // case-sensitive
      expect(isValidContactChannel("LinkedIn " as any)).toBe(false); // con espacio
      expect(isValidContactChannel(null as any)).toBe(false);
      expect(isValidContactChannel(undefined as any)).toBe(false);
    });
  });

  describe("Listado de canales", () => {
    it("getContactChannels devuelve los mismos 7 canales", () => {
      expect(getContactChannels()).toEqual(CONTACT_CHANNELS);
    });

    it("getContactChannels devuelve la referencia canonica (sin copia mutabile)", () => {
      expect(getContactChannels()).toBe(CONTACT_CHANNELS);
      expect(getContactChannels()).toHaveLength(7);
    });
  });
});
