import * as React from "react";
import { vi } from "vitest";

// Ensure React global
Object.assign(globalThis, { React });

// Setup localStorage and sessionStorage mocks if not provided
const createStorageMock = () => {
	const storage = new Map<string, string>();
	return {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => storage.set(key, String(value)),
		removeItem: (key: string) => storage.delete(key),
		clear: () => storage.clear(),
		get length() {
			return storage.size;
		},
		key: (i: number) => Array.from(storage.keys())[i] ?? null,
	};
};

if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== "function") {
	Object.defineProperty(globalThis, "localStorage", {
		value: createStorageMock(),
		writable: true,
	});
}

if (!globalThis.sessionStorage || typeof globalThis.sessionStorage.getItem !== "function") {
	Object.defineProperty(globalThis, "sessionStorage", {
		value: createStorageMock(),
		writable: true,
	});
}

// Mock ResizeObserver
if (typeof globalThis.ResizeObserver === "undefined") {
	class MockResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	globalThis.ResizeObserver = MockResizeObserver as any;
}

// Mock IntersectionObserver
if (typeof globalThis.IntersectionObserver === "undefined") {
	class MockIntersectionObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	globalThis.IntersectionObserver = MockIntersectionObserver as any;
}

// Mock matchMedia
if (typeof window !== "undefined" && !window.matchMedia) {
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
}

// Mock react-apexcharts without JSX
vi.mock("react-apexcharts", () => ({
	default: () => React.createElement("div", { "data-testid": "mock-apexchart" }),
}));

// Mock global fetch
if (typeof globalThis.fetch !== "undefined") {
	globalThis.fetch = vi.fn().mockImplementation(async (input: any) => {
		const url = typeof input === "string" ? input : input?.url || "";
		if (url.includes("/auth/session")) {
			return new Response(JSON.stringify({ admin: { role: "full_access", username: "root_admin" } }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}
		return new Response(JSON.stringify({}), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	});
}

if (typeof window !== "undefined") {
	window.addEventListener("unhandledrejection", (event) => {
		if (
			event.reason?.name === "AbortError" ||
			event.reason?.message?.includes("animation was canceled")
		) {
			event.preventDefault();
		}
	});
}

if (typeof process !== "undefined" && typeof process.on === "function") {
	process.on("unhandledRejection", (reason: any) => {
		if (
			reason?.name === "AbortError" ||
			(typeof reason?.message === "string" && reason.message.includes("animation was canceled"))
		) {
			return;
		}
	});
}

// Mock service/http to prevent unhandled localhost network I/O
vi.mock("service/http", async (importOriginal) => {
	const actual = await importOriginal<typeof import("service/http")>();
	return {
		...actual,
		fetch: vi.fn().mockImplementation(async (url: string) => {
			if (typeof url === "string") {
				if (url.includes("/auth/session")) {
					return { admin: { role: "full_access", username: "root_admin" } };
				}
				if (url.includes("/users")) return { users: [], total: 0 };
				if (url.includes("/nodes")) return [];
				if (url.includes("/hosts")) return {};
				if (url.includes("/services")) return { services: [], total: 0 };
			}
			return {};
		}),
	};
});
