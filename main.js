// ASUNDA AUTOS - DIGITAL GARAGE DIAGNOSTIC SCRIPT
// REWRITE V2.0 (WITH INTASEND DEBUGGER)

// 1. CONFIGURATION - CHANGE YOUR KEY HERE
const PUBLIC_KEY = "ISPubKey_live_0fab05af-8805-4d99-8619-dbf0df5b7529"; // Must start with ISPubKey_
const IS_LIVE = false; // Set to TRUE only when using real money/live keys

// 2. INITIALIZE INTASEND
const intasend = new window.IntaSend({
    publicAPIKey: PUBLIC_KEY,
    live: IS_LIVE
});

// 3. LISTEN FOR PAYMENT EVENTS
intasend.on("COMPLETE", (results) => {
    console.log("Success:", results);
    alert("Payment Successful! Loading Johnte's Analysis...");
    // Logic to show results goes here
})
.on("FAILED", (results) => {
    // --- THIS IS THE CRITICAL DEBUGGER ---
    // It converts the complex error into a readable pop-up on your phone
    alert("🚨 INTASEND ERROR: " + JSON.stringify(results)); 
    
    // Reset the button so the user can try again
    const submitBtn = document.getElementById("submit-btn");
    if(submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "Ask Johnte";
    }
})
.on("IN-PROGRESS", () => {
    console.log("Payment is in progress...");
});

// 4. THE MAIN FUNCTION (Triggered by your Form)
function askJohnte(event) {
    if (event) event.preventDefault(); // Stop page refresh

    const submitBtn = document.getElementById("submit-btn");
    const amount = 50; // Set your tier price here (e.g., 50 KES)

    // Visual feedback
    submitBtn.disabled = true;
    submitBtn.innerText = "Connecting Gateway...";

    try {
        // Trigger the checkout pop-up
        intasend.run({
            amount: amount,
            currency: "KES",
            label: "Asunda Autos Diagnostic Service",
            email: "customer@example.com", // You can pull this from a form field
        });
    } catch (err) {
        alert("CRITICAL SCRIPT ERROR: " + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "Ask Johnte";
    }
}

// 5. ATTACH TO FORM (Ensure your HTML form has id="diagnostic-form")
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("diagnostic-form");
    if (form) {
        form.addEventListener("submit", askJohnte);
    }
});
