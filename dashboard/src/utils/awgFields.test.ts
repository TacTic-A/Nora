import { describe, expect, it } from "vitest";
import { detectAwgVersion, generateAwgParameters } from "./awgFields";
import {
	buildInboundPayload,
	createDefaultInboundForm,
	rawInboundToFormValues,
	validateInboundFormFields,
} from "./inbounds";

describe("AmneziaWG parameters", () => {
	it("keeps classic inbounds unchanged and strips 3.1 fields in classic mode", () => {
		const values = createDefaultInboundForm("amneziawg");
		values.awgVersion = "classic";
		values.awgExtra = generateAwgParameters().extra;
		const settings = buildInboundPayload(values).settings;
		expect(settings).not.toHaveProperty("s3");
		expect(settings).not.toHaveProperty("random_trailers");
		expect(settings.h1).toBe(123456789);
	});

	it("round-trips generated 3.1 parameters and H ranges", () => {
		const generated = generateAwgParameters();
		const values = createDefaultInboundForm("amneziawg");
		values.tag = "awg";
		values.wgPrivateKey = `${"A".repeat(43)}=`;
		values.wgTunnelPort = "12345";
		values.awgVersion = "3.1";
		values.awgH1 = "5-100";
		values.awgExtra = generated.extra;
		expect(validateInboundFormFields(values)).toEqual({});
		const payload = buildInboundPayload(values);
		expect(payload.settings).toMatchObject({
			h1: "5-100",
			s3: Number(generated.extra.s3),
			header_protection_key: generated.extra.header_protection_key,
			random_trailers: true,
		});
		const again = rawInboundToFormValues(payload as never);
		expect(again.awgVersion).toBe("3.1");
		expect(again.awgH1).toBe("5-100");
		expect(again.awgExtra.i1).toBe(generated.extra.i1);
	});

	it("rejects H ranges in classic mode and auto-detects version from raw settings", () => {
		const values = createDefaultInboundForm("amneziawg");
		values.tag = "awg-classic";
		values.wgPrivateKey = `${"A".repeat(43)}=`;
		values.wgTunnelPort = "12345";
		values.awgVersion = "classic";
		values.awgH1 = "5-100";
		expect(validateInboundFormFields(values).awgH1).toBeTruthy();

		expect(detectAwgVersion({ h1: 123456789 })).toBe("classic");
		expect(detectAwgVersion({ h1: "5-100" })).toBe("3.1");
		expect(detectAwgVersion({ s3: 20 })).toBe("3.1");
		expect(detectAwgVersion({ random_trailers: true })).toBe("3.1");
	});

	it("generates parameters inside the engine limits", () => {
		for (let run = 0; run < 200; run++) {
			const { s1, s2, extra } = generateAwgParameters();
			expect(Number(s1) + 56).not.toBe(Number(s2));
			expect(Number(extra.s4)).toBeLessThanOrEqual(32);
			const rekey = Number(extra.rekey_after_time.split("-")[1]);
			const reject = Number(extra.reject_after_time.split("-")[0]);
			expect(rekey).toBeLessThan(reject);
		}
	});
});
