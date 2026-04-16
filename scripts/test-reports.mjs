#!/usr/bin/env node
/**
 * Reports API Test Script
 * 
 * Tests all 4 reports endpoints to verify they return valid data.
 * Run with: npm run test:reports
 * 
 * Prerequisites:
 * - Server must be running (npm run dev)
 * - DATABASE_URL must be set (server needs PostgreSQL)
 * - Valid credentials: set TEST_EMAIL, TEST_PASSWORD env vars, or use defaults
 *   (default: michael.torres@caxton.com / admin123 per replit.md)
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const TEST_EMAIL = process.env.TEST_EMAIL || "michael.torres@caxton.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "admin123";

let sessionCookie = null;

async function fetchWithCookies(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers, credentials: "include" });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    sessionCookie = setCookie.split(";")[0];
  }
  return res;
}

async function login() {
  const res = await fetchWithCookies(`${BASE_URL}/api/login`, {
    method: "POST",
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Login failed (${res.status}): ${err.error || res.statusText}`);
  }
  return res.json();
}

async function testEndpoint(name, url, validator) {
  const res = await fetchWithCookies(`${BASE_URL}${url}`);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return { ok: false, name, error: `HTTP ${res.status}: ${data?.error || res.statusText}` };
  }

  const validationError = validator ? validator(data) : null;
  if (validationError) {
    return { ok: false, name, error: validationError };
  }

  return { ok: true, name, data };
}

function validateJobsReport(data) {
  if (!data || typeof data !== "object") return "Invalid response: not an object";
  if (!Array.isArray(data.jobs)) return "Missing or invalid 'jobs' array";
  if (!data.summary || typeof data.summary !== "object") return "Missing or invalid 'summary' object";
  if (typeof data.summary.totalJobs !== "number") return "summary.totalJobs must be a number";
  return null;
}

function validatePerformanceReport(data) {
  if (!data || typeof data !== "object") return "Invalid response: not an object";
  if (!Array.isArray(data.employees)) return "Missing or invalid 'employees' array";
  if (!Array.isArray(data.departments)) return "Missing or invalid 'departments' array";
  return null;
}

function validateTimelineReport(data) {
  if (!data || typeof data !== "object") return "Invalid response: not an object";
  if (!Array.isArray(data.timeline)) return "Missing or invalid 'timeline' array";
  if (!Array.isArray(data.upcomingDeadlines)) return "Missing or invalid 'upcomingDeadlines' array";
  if (!Array.isArray(data.overdueJobs)) return "Missing or invalid 'overdueJobs' array";
  return null;
}

function validateClientsReport(data) {
  if (!data || typeof data !== "object") return "Invalid response: not an object";
  if (!Array.isArray(data.clients)) return "Missing or invalid 'clients' array";
  if (!data.summary || typeof data.summary !== "object") return "Missing or invalid 'summary' object";
  return null;
}

async function runTests() {
  console.log("📊 Reports API Test\n");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Login: ${TEST_EMAIL}\n`);

  try {
    const user = await login();
    console.log(`✅ Logged in as ${user.name} (${user.email})\n`);

    const tests = [
      ["Jobs Report", "/api/reports/jobs", validateJobsReport],
      ["Performance Report", "/api/reports/performance", validatePerformanceReport],
      ["Timeline Report", "/api/reports/timeline", validateTimelineReport],
      ["Clients Report", "/api/reports/clients", validateClientsReport],
    ];

    let allPassed = true;
    for (const [name, url, validator] of tests) {
      const result = await testEndpoint(name, url, validator);
      if (result.ok) {
        const count = result.data?.jobs?.length ?? result.data?.employees?.length ?? result.data?.timeline?.length ?? result.data?.clients?.length ?? "N/A";
        console.log(`✅ ${name}: OK (${count} records)`);
      } else {
        console.log(`❌ ${name}: ${result.error}`);
        allPassed = false;
      }
    }

    console.log("");
    if (allPassed) {
      console.log("🎉 All reports are working perfectly!");
      process.exit(0);
    } else {
      console.log("⚠️  Some reports failed. Check the errors above.");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.message.includes("fetch")) {
      console.error("\nMake sure the server is running: npm run dev");
    }
    if (err.message.includes("Login failed")) {
      console.error("\nSet TEST_EMAIL and TEST_PASSWORD env vars with valid credentials.");
    }
    process.exit(1);
  }
}

runTests();
