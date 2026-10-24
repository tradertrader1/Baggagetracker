// Application Logic & Demo Authentication

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const logoutBtn = document.getElementById('logout-btn');
    const loginError = document.getElementById('login-error');
    
    const searchBtn = document.getElementById('search-btn');
    const tagSearchInput = document.getElementById('tag-search-input');
    const resultSection = document.getElementById('result-section');
    const baggageDetails = document.getElementById('baggage-details');

    // Handle Login Submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value.trim();

        // Credentials check
        if (usernameInput === 'staff' && passwordInput === 'Airport123!') {
            loginError.textContent = '';
            loginView.classList.remove('active');
            appView.classList.add('active');
        } else {
            loginError.textContent = 'Invalid username or password.';
        }
    });

    // Handle Logout
    logoutBtn.addEventListener('click', () => {
        appView.classList.remove('active');
        loginView.classList.add('active');
        loginForm.reset();
        resultSection.classList.add('hidden');
    });

    // Handle Baggage Search Mock
    searchBtn.addEventListener('click', () => {
        const query = tagSearchInput.value.trim();
        if (!query) {
            alert('Please enter a baggage tag number.');
            return;
        }

        // Display mock baggage tracking information
        resultSection.classList.remove('hidden');
        baggageDetails.innerHTML = `
            <div class="card">
                <p><strong>Tag Number:</strong> ${query.toUpperCase()}</p>
                <p><strong>Status:</strong> <span class="status-in-transit">In Transit / Traced</span></p>
                <p><strong>Passenger Name:</strong> Test Passenger</p>
                <p><strong>Routing:</strong> ADD (Addis Ababa) -> FRA (Frankfurt)</p>
                <p><strong>Last Updated:</strong> Just now</p>
            </div>
        `;
    });
});