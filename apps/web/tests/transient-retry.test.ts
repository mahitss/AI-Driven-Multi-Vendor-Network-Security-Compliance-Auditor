import assert from "node:assert";
import {
  isTransientServerError,
  retryTransientHydration,
  ApiError,
} from "../src/lib/api-client";

async function runTests() {
  console.log("Starting Transient Hydration & Retry Regression Tests...");

  // Test 1: isTransientServerError matches 5xx and rejects 4xx
  assert.strictEqual(isTransientServerError(new ApiError("Server Error", 500)), true);
  assert.strictEqual(isTransientServerError(new ApiError("Bad Gateway", 502)), true);
  assert.strictEqual(isTransientServerError(new ApiError("Service Unavailable", 503)), true);
  assert.strictEqual(isTransientServerError(new ApiError("Gateway Timeout", 504)), true);

  assert.strictEqual(isTransientServerError(new ApiError("Bad Request", 400)), false);
  assert.strictEqual(isTransientServerError(new ApiError("Unauthorized", 401)), false);
  assert.strictEqual(isTransientServerError(new ApiError("Forbidden", 403)), false);
  assert.strictEqual(isTransientServerError(new ApiError("Not Found", 404)), false);

  assert.strictEqual(isTransientServerError(new Error("API ERROR: The backend returned HTTP 500.")), true);
  assert.strictEqual(isTransientServerError(new Error("AUTHENTICATION REQUIRED: The API rejected this request with HTTP 401.")), false);
  console.log("  Step 1 PASSED: isTransientServerError status discrimination verified");

  // Test 2: retryTransientHydration succeeds after transient failure
  let callCount = 0;
  const result = await retryTransientHydration(
    async () => {
      callCount++;
      if (callCount === 1) {
        throw new ApiError("Transient 500", 500);
      }
      return { status: "COMPLETED", success: true };
    },
    { maxRetries: 2, backoffMs: [10, 20] }
  );

  assert.strictEqual(callCount, 2);
  assert.strictEqual(result.status, "COMPLETED");
  console.log("  Step 2 PASSED: Transient failure recovered on retry attempt 2");

  // Test 3: retryTransientHydration does not retry non-transient 4xx
  let nonTransientCallCount = 0;
  let nonTransientCaught = false;
  try {
    await retryTransientHydration(
      async () => {
        nonTransientCallCount++;
        throw new ApiError("Unauthorized", 401);
      },
      { maxRetries: 2, backoffMs: [10, 20] }
    );
  } catch (err: any) {
    nonTransientCaught = true;
    assert.strictEqual(err.status, 401);
  }
  assert.strictEqual(nonTransientCaught, true);
  assert.strictEqual(nonTransientCallCount, 1);
  console.log("  Step 3 PASSED: Non-transient 401 immediately thrown without retry");

  // Test 4: retryTransientHydration respects maxRetries limit
  let persistentFailCount = 0;
  let persistentCaught = false;
  try {
    await retryTransientHydration(
      async () => {
        persistentFailCount++;
        throw new ApiError("Persistent 503", 503);
      },
      { maxRetries: 2, backoffMs: [10, 20] }
    );
  } catch (err: any) {
    persistentCaught = true;
    assert.strictEqual(err.status, 503);
  }
  assert.strictEqual(persistentCaught, true);
  assert.strictEqual(persistentFailCount, 3); // initial + 2 retries
  console.log("  Step 4 PASSED: maxRetries respected on persistent failure");

  console.log("ALL TRANSIENT HYDRATION & RETRY REGRESSION TESTS PASSED (100%)!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
