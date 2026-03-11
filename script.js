// Asunda Autos Frontend Logic & IntaSend Debugger

// Dynamically load IntaSend Script for payments
const intaSendScript = document.createElement('script');
intaSendScript.src = "https://unpkg.com/intasend-inlinejs-sdk@3.0.4/build/intasend-inline.js";
document.head.appendChild(intaSendScript);

// Toggle custom input fields when "Others" is selected
function toggleCustomInput(selectId, inputId) {
    const selectEl = document.getElementById(selectId);
    const inputEl = document.getElementById(inputId);
    if (selectEl.value === 'Others') {
        inputEl.classList.remove('hidden');
        inputEl.required = true;
    } else {
        inputEl.classList.add('hidden');
        inputEl.required = false;
        inputEl.value = '';
    }
}

// Check Daily Quota for Free Tier (Tier 1)
function checkFreeTierQuota() {
    const today = new Date().toISOString().split('T')[0];
    let usageData = JSON.parse(localStorage.getItem('asunda_usage')) || { date: today, count: 0 };
    
    if (usageData.date !== today) {
        usageData = { date: today, count: 0 }; // Reset for a new day
    }
    return usageData;
}

function incrementFreeTierUsage() {
    let usageData = checkFreeTierQuota();
    usageData.count += 1;
    localStorage.setItem('asunda_usage', JSON.stringify(usageData));
}

// Payment & Form Submission Logic
document.getElementById('diagnosticForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userName = document.getElementById('userName').value;
    const tier = document.getElementById('serviceTier').value;
    const statusMsg = document.getElementById('statusMessage');
    
    // Check capping logic
    if (tier === "1") {
        let usageData = checkFreeTierQuota();
        if (usageData.count >= 3) {
            alert(`Pole sana, ${userName}! You've used your 3 free VIN decodes for today. To get deeper into this issue and skip the queue, please select a specialized diagnostic tier.`);
            return;
        }
    }

    // If paid tier, trigger IntaSend Debugger Flow
    if (tier !== "1") {
        statusMsg.innerText = "Initializing payment gateway...";
        statusMsg.classList.remove('hidden');
        
        try {
            // IntaSend setup with Debugger
            let windowIntaSend = new window.IntaSend({
                // Note: The public key should ideally be injected dynamically or set here for the frontend SDK.
                // Replace with your actual public key in production frontend code.
                publicAPIKey: "REPLACE_WITH_YOUR_INTASEND_PUBLIC_KEY_HERE",
                live: true 
            });

            windowIntaSend.on("COMPLETE", (results) => {
                console.log("Payment successful", results);
                processDiagnosis(); // Proceed to Johnte's analysis
            })
            .on("FAILED", (results) => {
                console.error("IntaSend Failed", results);
                alert(`🚨 INTASEND ERROR: Transaction Failed. Details: ${JSON.stringify(results)}`);
            })
            .on("IN-PROGRESS", (results) => console.log("Payment in progress..."))
            .on("ERROR", (results) => {
                // THE DEBUGGER CATCH
                console.error("IntaSend Domain/Config Error", results);
                alert(`🚨 INTASEND ERROR (Screenshot this for support): ${JSON.stringify(results)}`);
            });

            // Assuming standard amounts for tiers based on your pricing table
            const amounts = { "2": 60, "3": 70, "4": 50, "5": 80, "6": 100, "7": 100, "8": 40, "9": 200, "10": 150, "11": 300, "12": 250, "13": 500, "14": 1200, "15": 1500, "16": 150, "17": 750, "18": 400, "19": 200, "20": 180 };
            const amountToCharge = amounts[tier];

            windowIntaSend.run({ amount: amountToCharge, currency: "KES" });

        } catch (error) {
            alert(`🚨 CRITICAL CHECK: Ensure IntaSend SDK loaded and keys are correct. Error: ${error.message}`);
        }
        return; // Stop form submission until payment completes
    }

    // If Free Tier, proceed directly
    processDiagnosis();
});

async function processDiagnosis() {
    const statusMsg = document.getElementById('statusMessage');
    const submitBtn = document.getElementById('askJohnteBtn');
    
    statusMsg.innerText = "Johnte is analyzing...";
    statusMsg.classList.remove('hidden');
    submitBtn.disabled = true;

    // Build payload
    const formData = new FormData();
    formData.append('userName', document.getElementById('userName').value);
    formData.append('plateNumber', document.getElementById('plateNumber').value);
    formData.append('makeModelYear', document.getElementById('makeModelYear').value);
    formData.append('bodyType', document.getElementById('bodyType').value === 'Others' ? document.getElementById('customBody').value : document.getElementById('bodyType').value);
    formData.append('fuelType', document.getElementById('fuelType').value === 'Others' ? document.getElementById('customFuel').value : document.getElementById('fuelType').value);
    formData.append('transmission', document.getElementById('transmission').value === 'Others' ? document.getElementById('customTrans').value : document.getElementById('transmission').value);
    formData.append('engineCC', document.getElementById('engineCC').value);
    formData.append('driveType', document.getElementById('driveType').value === 'Others' ? document.getElementById('customDrive').value : document.getElementById('driveType').value);
    formData.append('mileage', document.getElementById('mileage').value);
    formData.append('engineNumber', document.getElementById('engineNumber').value);
    formData.append('tier', document.getElementById('serviceTier').options[document.getElementById('serviceTier').selectedIndex].text);
    formData.append('customIssue', document.getElementById('customIssue').value);

    const fileInput = document.getElementById('mediaUpload');
    if (fileInput.files.length > 0) {
        formData.append('media', fileInput.files[0]);
    }

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server status: ${response.status}`);
        }

        const data = await response.json();
        
        // Update Free Tier count if successful
        if (document.getElementById('serviceTier').value === "1") {
            incrementFreeTierUsage();
        }

        document.getElementById('reportContent').innerHTML = data.reply;
        document.getElementById('reportContainer').classList.remove('hidden');
        document.getElementById('diagnosticForm').classList.add('hidden');
        
        // Scroll to report
        document.getElementById('reportContainer').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error("Backend Error:", error);
        alert("Johnte is attending other vehicles in the garage, please wait or try again.");
    } finally {
        statusMsg.classList.add('hidden');
        submitBtn.disabled = false;
    }
        }
