document.addEventListener('DOMContentLoaded', () => {
    const nextBtns = document.querySelectorAll('.next-btn');
    const prevBtns = document.querySelectorAll('.prev-btn');
    const formSteps = document.querySelectorAll('.form-step');
    const steps = document.querySelectorAll('.step');
    const progressBar = document.getElementById('progress-bar');
    const form = document.getElementById('fraud-form');
    
    const resultOverlay = document.getElementById('result-overlay');
    const closeBtn = document.getElementById('close-result');
    const loadingDiv = document.getElementById('loading');
    const predictionResultDiv = document.getElementById('prediction-result');
    
    let currentStep = 0;

    // Multi-step Form Logic
    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Check HTML5 validation before proceeding
            const currentInputs = formSteps[currentStep].querySelectorAll('input, select');
            let allValid = true;
            currentInputs.forEach(input => {
                if (!input.checkValidity()) {
                    input.reportValidity();
                    allValid = false;
                }
            });

            if (allValid) {
                currentStep++;
                updateFormSteps();
            }
        });
    });

    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentStep--;
            updateFormSteps();
        });
    });

    function updateFormSteps() {
        // Update form pages
        formSteps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        // Update progress bar
        progressBar.style.width = `${((currentStep + 1) / formSteps.length) * 100}%`;

        // Update step indicators
        steps.forEach((step, index) => {
            if (index === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    // Form Submission & API Call
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Gather data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Handle un-checked checkboxes (FormData ignores them)
        const checkboxes = ['cardPresent', 'cvvMatch', 'expirationDateKeyInMatch'];
        checkboxes.forEach(cb => {
            data[cb] = form.querySelector(`#${cb}`).checked;
        });

        // Show UI Overlay
        resultOverlay.classList.remove('hidden');
        loadingDiv.classList.remove('hidden');
        predictionResultDiv.classList.add('hidden');

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                showResult(result.fraud, result.probability);
            } else {
                throw new Error(result.error || 'Terjadi kesalahan pada server');
            }
        } catch (error) {
            alert(error.message);
            resultOverlay.classList.add('hidden');
        }
    });

    function showResult(isFraud, prob) {
        // Hide loading
        loadingDiv.classList.add('hidden');
        predictionResultDiv.classList.remove('hidden');

        const resultIcon = document.getElementById('result-icon');
        const resultTitle = document.getElementById('result-title');
        const meterBar = document.getElementById('meter-bar');
        const resultProb = document.getElementById('result-prob');

        // Format prob to percentage
        const percentage = (prob * 100).toFixed(2);

        if (isFraud) {
            resultIcon.innerHTML = '⚠️';
            resultIcon.className = 'icon-container fraud';
            resultTitle.textContent = 'Transaski Dicurigai Penipuan';
            resultTitle.className = 'fraud-text';
            meterBar.style.background = 'linear-gradient(90deg, #F59E0B, #EF4444)';
        } else {
            resultIcon.innerHTML = '✅';
            resultIcon.className = 'icon-container safe';
            resultTitle.textContent = 'Transaksi Aman';
            resultTitle.className = 'safe-text';
            meterBar.style.background = 'linear-gradient(90deg, #10B981, #059669)';
        }

        // Animate the bar and set text
        setTimeout(() => {
            meterBar.style.width = `${percentage}%`;
        }, 100);
        
        resultProb.innerHTML = `Skor Risiko (Probabilitas Fraud): <strong>${percentage}%</strong>`;
    }

    closeBtn.addEventListener('click', () => {
        resultOverlay.classList.add('hidden');
        // Reset meter bar for next time
        document.getElementById('meter-bar').style.width = '0';
    });
});
