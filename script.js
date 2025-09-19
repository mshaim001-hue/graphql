// Tomorrow School Profile App
class TomorrowSchoolApp {
    constructor() {
        this.apiUrl = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql';
        this.authUrl = 'https://01.tomorrow-school.ai/api/auth/signin';
        this.jwt = localStorage.getItem('jwt');
        this.userId = null;
        
        this.basicInfoModule = new BasicInfoModule(this);
        this.experiencePointsModule = new ExperiencePointsModule(this);
        this.progressGradesModule = new ProgressGradesModule(this);
        this.statisticsAnalyticsModule = new StatisticsAnalyticsModule(this);
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        
        // Check if user is already logged in
        if (this.jwt && this.isValidJWT(this.jwt)) {
            // Restore userId from localStorage if available
            const storedUserId = localStorage.getItem('userId');
            if (storedUserId) {
                this.userId = storedUserId;
            } else {
                // Parse JWT to get userId if not in localStorage
                const payload = this.parseJWT(this.jwt);
                this.userId = payload.sub || payload.id;
                localStorage.setItem('userId', this.userId);
            }
            this.showProfile();
            this.basicInfoModule.loadUserData();
        } else {
            // Clear invalid JWT
            if (this.jwt) {
                localStorage.removeItem('jwt');
                localStorage.removeItem('userId');
                this.jwt = null;
                this.userId = null;
            }
            this.showLogin();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

    }

    showLogin() {
        document.getElementById('login-page').classList.add('active');
        document.getElementById('profile-page').classList.remove('active');
    }

    showProfile() {
        document.getElementById('login-page').classList.remove('active');
        document.getElementById('profile-page').classList.add('active');
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');

        try {
            errorDiv.style.display = 'none';
            
            // Create Basic Auth header
            const credentials = btoa(`${username}:${password}`);
            
            const response = await fetch(this.authUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const data = await response.json();
            
            // Handle different possible response formats
            // If data is a string (JWT token), use it directly
            if (typeof data === 'string') {
                this.jwt = data;
            } else {
                this.jwt = data.token || data.access_token || data.jwt || data;
            }
            
            if (!this.jwt) {
                throw new Error('No token received from server');
            }
            
            // Validate JWT format (should have 3 parts separated by dots)
            if (typeof this.jwt !== 'string' || this.jwt.split('.').length !== 3) {
                console.error('Invalid JWT format:', this.jwt);
                throw new Error('Invalid token format received');
            }
            
            const payload = this.parseJWT(this.jwt);
            this.userId = payload.sub || payload.id; // Use 'sub' field from JWT payload
            
            // Store JWT in localStorage
            localStorage.setItem('jwt', this.jwt);
            localStorage.setItem('userId', this.userId);
            
            this.showProfile();
            this.basicInfoModule.loadUserData();
            
        } catch (error) {
            errorDiv.textContent = 'Invalid username/email or password. Please try again.';
            errorDiv.style.display = 'block';
        }
    }

    handleLogout() {
        localStorage.removeItem('jwt');
        localStorage.removeItem('userId');
        this.jwt = null;
        this.userId = null;
        this.showLogin();
        
        // Clear form
        document.getElementById('login-form').reset();
        document.getElementById('login-error').style.display = 'none';
    }

    isValidJWT(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        
        const parts = token.split('.');
        if (parts.length !== 3) {
            return false;
        }
        
        try {
            const payload = this.parseJWT(token);
            // Check if token is expired
            if (payload.exp && payload.exp < Date.now() / 1000) {
                return false;
            }
            // Check if token has required fields
            if (!payload.sub && !payload.id) {
                return false;
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    parseJWT(token) {
        try {
            if (!token || typeof token !== 'string') {
                throw new Error('Invalid token: not a string');
            }
            
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error(`Invalid JWT format: expected 3 parts, got ${parts.length}`);
            }
            
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            return payload;
        } catch (error) {
            console.error('Error parsing JWT:', error, 'Token:', token);
            return {};
        }
    }

    async makeGraphQLQuery(query, variables = {}) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.jwt}`
                },
                body: JSON.stringify({
                    query: query,
                    variables: variables
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.errors) {
                console.error('GraphQL errors:', data.errors);
                throw new Error(data.errors[0].message);
            }

            return data.data;
        } catch (error) {
            console.error('GraphQL query error:', error);
            throw error;
        }
    }

    showError(message) {
        // Simple error display
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '20px';
        errorDiv.style.right = '20px';
        errorDiv.style.background = '#e74c3c';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '15px 20px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.zIndex = '1000';
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TomorrowSchoolApp();
});
