// Toggle logic for "Other" inputs
function toggleOther(selectId, inputId) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    if (select.value === 'Other') {
        input.classList.remove('hidden');
        input.required = true;
    } else {
        input.classList.add('hidden');
        input.required = false;
    }
}

// Helper to get final value (Select or custom text)
function getFinalValue(selectId, inputId) {
    const val = document.getElementById(selectId).value;
    return val === 'Other' ? document.getElementById(inputId).value : val;
}

document.getElementById('johnteForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('payButton');
    const statusMsg = document.getElementById('statusMessage');
    
    const tierValue = document.getElementById('serviceTier').value;
    const [priceStr, tierName] = tierValue.split('|');
    const price = parseInt(priceStr);

    // FREE TIER LOGIC (3 Uses Limit)
    if (price === 0) {
        let freeCount = parseInt(localStorage.getItem('johnte_free_reqs') || '0');
        if (freeCount >= 3) {
            alert("You've used your 3 free requests! Please select a premium tier to let Johnte work his magic.");
            return;
        }
        localStorage.setItem('johnte_free_reqs', freeCount + 1);
        processDiagnostics(tierName);
        return;
    }

    // PAID TIER LOGIC (IntaSend)
    submitBtn.disabled = true;
    submitBtn.innerText = "Securing Payment...";

    try {
        let intaSend = new window.IntaSend({
            publicAPIKey: "YOUR_INTASEND_PUBLIC_KEY_HERE", // <-- PASTE PUBLIC KEY HERE
            live: true 
        });

        intaSend.on("COMPLETE", (results) => {
            submitBtn.innerText = "Payment Received! Johnte is looking...";
            processDiagnostics(tierName);
        })
        .on("FAILED", (results) => {
            alert("Payment failed. Please try again.");
            submitBtn.disabled = false;
            submitBtn.innerText = "Ask Johnte";
        })
        .on("IN-PROGRESS", (results) => {
            submitBtn.innerText = "Awaiting Confirmation...";
        });

        intaSend.collection({
            amount: price,
            currency: "KES",
            host: window.location.origin
        });

    } catch (err) {
        alert("Payment Gateway Error. Please refresh.");
        submitBtn.disabled = false;
        submitBtn.innerText = "Ask Johnte";
    }
});

async function processDiagnostics(tierName) {
    const statusMsg = document.getElementById('statusMessage');
    const submitBtn = document.getElementById('payButton');
    
    statusMsg.innerText = "Johnte is analyzing your vehicle data and media...";
    statusMsg.classList.remove('hidden');
    document.getElementById('resultArea').classList.add('hidden');

    const formData = new FormData();
    formData.append('tier', tierName);
    formData.append('userName', document.getElementById('userName').value);
    formData.append('plateNumber', document.getElementById('plateNumber').value);
    
    // Construct strict vehicle profile
    const profile = `
        Make/Model/Year: ${document.getElementById('makeModelYear').value}
        Body: ${getFinalValue('bodyType', 'bodyTypeOther')}
        Fuel: ${getFinalValue('fuelType', 'fuelTypeOther')}
        Transmission: ${getFinalValue('transmission', 'transmissionOther')}
        Drive: ${getFinalValue('driveType', 'driveTypeOther')}
        Engine CC: ${document.getElementById('engineCC').value}
        Engine Code: ${document.getElementById('engineCode').value || 'Not provided'}
        Mileage: ${document.getElementById('mileage').value}
        Issue: ${document.getElementById('issueDescription').value}
    `;
    formData.append('profile', profile);

    const mediaFile = document.getElementById('mediaUpload').files[0];
    if (mediaFile) formData.append('media', mediaFile);

    try {
        const response = await fetch('/api/index', { method: 'POST', body: formData });
        
        if (!response.ok) throw new Error("API Exception");
        
        const data = await response.json();
        
        document.getElementById('diagnosisText').innerText = data.response;
        document.getElementById('resultArea').classList.remove('hidden');
        statusMsg.classList.add('hidden');

    } catch (error) {
        // USER FACING ERROR MESSAGE (True error goes to Vercel logs via Python)
        statusMsg.innerText = "Johnte is in the garage handling another vehicle, please wait or try again.";
    } finally {
        submitBtn.innerText = "Ask Johnte";
        submitBtn.disabled = false;
    }
}
