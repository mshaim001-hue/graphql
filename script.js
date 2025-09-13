// Tomorrow School Profile App
class TomorrowSchoolApp {
    constructor() {
        this.apiUrl = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql';
        this.authUrl = 'https://01.tomorrow-school.ai/api/auth/signin';
        this.jwt = localStorage.getItem('jwt');
        this.userId = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        
        // Check if user is already logged in
        if (this.jwt && this.isValidJWT(this.jwt)) {
            this.showProfile();
            this.loadUserData();
        } else {
            // Clear invalid JWT
            if (this.jwt) {
                console.log('Invalid JWT found, clearing...');
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
        console.log('showProfile() called');
        document.getElementById('login-page').classList.remove('active');
        document.getElementById('profile-page').classList.add('active');
        console.log('Profile page classes updated');
    }

    async handleLogin() {
        console.log('handleLogin() called');
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');

        console.log('Username:', username);
        console.log('Password length:', password.length);

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
            console.log('Auth response:', data); // Debug log
            
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
            
            console.log('User ID extracted:', this.userId);
            console.log('JWT token:', this.jwt);
            
            // Store JWT in localStorage
            localStorage.setItem('jwt', this.jwt);
            localStorage.setItem('userId', this.userId);
            
            console.log('JWT stored in localStorage');
            console.log('Switching to profile page...');
            this.showProfile();
            console.log('Profile page shown, now loading user data...');
            this.loadUserData();
            console.log('User data loading initiated');
            
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
                console.log('JWT token expired');
                return false;
            }
            // Check if token has required fields
            if (!payload.sub && !payload.id) {
                console.log('JWT token missing user ID');
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
            console.log('JWT payload:', payload); // Debug log
            return payload;
        } catch (error) {
            console.error('Error parsing JWT:', error, 'Token:', token);
            return {};
        }
    }

    async makeGraphQLQuery(query, variables = {}) {
        console.log('makeGraphQLQuery() called with query:', query);
        console.log('Using JWT:', this.jwt ? 'JWT present' : 'No JWT');
        
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

            console.log('GraphQL response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('GraphQL response data:', data);
            
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

    async loadUserData() {
        console.log('loadUserData() called');
        try {
            console.log('Loading user basic info...');
            // Load user basic info
            await this.loadUserInfo();
            
            console.log('Loading XP data...');
            // Load XP data
            await this.loadXPData();
            
            console.log('Loading progress data...');
            // Load progress data
            await this.loadProgressData();
            
            console.log('Loading statistics...');
            // Load statistics and create graphs
            await this.loadStatistics();
            
            console.log('All user data loaded successfully');
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Failed to load user data. Please try logging in again.');
        }
    }

    async loadUserInfo() {
        console.log('loadUserInfo() - making GraphQL query...');
        const query = `
            query {
                user {
                    id
                    login
                }
            }
        `;

        const data = await this.makeGraphQLQuery(query);
        console.log('loadUserInfo() - received data:', data);
        
        if (data.user && data.user.length > 0) {
            const user = data.user[0];
            console.log('loadUserInfo() - displaying user:', user);
            this.displayUserInfo(user);
        } else {
            console.log('loadUserInfo() - no user data found');
        }
    }

    displayUserInfo(user) {
        console.log('displayUserInfo() called with:', user);
        const userDetails = document.getElementById('user-details');
        console.log('user-details element found:', userDetails);
        
        userDetails.innerHTML = `
            <div class="info-item">
                <h3>User ID</h3>
                <div class="value">${user.id}</div>
            </div>
            <div class="info-item">
                <h3>Login</h3>
                <div class="value">${user.login}</div>
            </div>
        `;
        console.log('User info displayed successfully');
    }

    async loadXPData() {
        const query = `
            query {
                transaction(where: {type: {_eq: "xp"}}) {
                    id
                    amount
                    createdAt
                    path
                }
            }
        `;

        const data = await this.makeGraphQLQuery(query);
        
        if (data.transaction) {
            this.displayXPData(data.transaction);
        }
    }

    displayXPData(transactions) {
        const totalXP = transactions.reduce((sum, t) => sum + t.amount, 0);
        const xpDetails = document.getElementById('xp-details');
        
        xpDetails.innerHTML = `
            <div class="info-item">
                <h3>Total XP</h3>
                <div class="value">${totalXP.toLocaleString()}</div>
            </div>
            <div class="info-item">
                <h3>Transactions</h3>
                <div class="value">${transactions.length}</div>
            </div>
            <div class="info-item">
                <h3>Average XP per Transaction</h3>
                <div class="value">${Math.round(totalXP / transactions.length)}</div>
            </div>
        `;
    }

    async loadProgressData() {
        const query = `
            query {
                progress {
                    id
                    grade
                    createdAt
                    path
                    object {
                        name
                        type
                    }
                }
                result {
                    id
                    grade
                    type
                    createdAt
                    path
                    object {
                        name
                        type
                    }
                }
            }
        `;

        const data = await this.makeGraphQLQuery(query);
        
        if (data.progress && data.result) {
            this.displayProgressData(data.progress, data.result);
        }
    }

    displayProgressData(progress, results) {
        const totalProgress = progress.length;
        const totalResults = results.length;
        const passedProgress = progress.filter(p => p.grade === 1).length;
        const passedResults = results.filter(r => r.grade === 1).length;
        
        const progressDetails = document.getElementById('progress-details');
        
        progressDetails.innerHTML = `
            <div class="info-item">
                <h3>Total Progress Items</h3>
                <div class="value">${totalProgress}</div>
            </div>
            <div class="info-item">
                <h3>Progress Success Rate</h3>
                <div class="value">${totalProgress > 0 ? Math.round((passedProgress / totalProgress) * 100) : 0}%</div>
            </div>
            <div class="info-item">
                <h3>Total Results</h3>
                <div class="value">${totalResults}</div>
            </div>
            <div class="info-item">
                <h3>Results Success Rate</h3>
                <div class="value">${totalResults > 0 ? Math.round((passedResults / totalResults) * 100) : 0}%</div>
            </div>
        `;
    }

    async loadStatistics() {
        try {
            // Load data for all graphs
            const [xpData, progressData, resultData] = await Promise.all([
                this.getXPTimeData(),
                this.getProgressData(),
                this.getResultData()
            ]);

            // Create graphs
            this.createXPTimelineGraph(xpData);
            this.createAuditRatioGraph(progressData, resultData);
            this.createProjectSuccessGraph(progressData, resultData);
            this.createExerciseAttemptsGraph(progressData, resultData);
            
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    async getXPTimeData() {
        const query = `
            query {
                transaction(where: {type: {_eq: "xp"}}, order_by: {createdAt: asc}) {
                    amount
                    createdAt
                }
            }
        `;

        const data = await this.makeGraphQLQuery(query);
        return data.transaction || [];
    }

    async getProgressData() {
        const query = `
            query {
                progress {
                    grade
                    createdAt
                    path
                    object {
                        name
                        type
                    }
                }
            }
        `;

        const data = await this.makeGraphQLQuery(query);
        return data.progress || [];
    }

    async getResultData() {
        const query = `
            query {
                result {
                    grade
                    createdAt
                    path
                    object {
                        name
                        type
                    }
                }
            }
        `;

        const data = await this.makeGraphQLQuery(query);
        return data.result || [];
    }

    createXPTimelineGraph(xpData) {
        const container = document.getElementById('xp-timeline-graph');
        
        if (xpData.length === 0) {
            container.innerHTML = '<div class="loading">No XP data available</div>';
            return;
        }

        // Calculate cumulative XP over time
        let cumulativeXP = 0;
        const timelineData = xpData.map(item => {
            cumulativeXP += item.amount;
            return {
                date: new Date(item.createdAt),
                xp: cumulativeXP
            };
        });

        // Create SVG
        const width = 400;
        const height = 250;
        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        
        // Create line path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'line');
        path.setAttribute('stroke', '#667eea');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-width', '3');
        
        // Calculate path data
        const xScale = (width - margin.left - margin.right) / (timelineData.length - 1);
        const maxXP = Math.max(...timelineData.map(d => d.xp));
        const yScale = (height - margin.top - margin.bottom) / maxXP;
        
        let pathData = '';
        timelineData.forEach((point, index) => {
            const x = margin.left + (index * xScale);
            const y = height - margin.bottom - (point.xp * yScale);
            
            if (index === 0) {
                pathData += `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        });
        
        path.setAttribute('d', pathData);
        svg.appendChild(path);
        
        // Add data points
        timelineData.forEach((point, index) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const x = margin.left + (index * xScale);
            const y = height - margin.bottom - (point.xp * yScale);
            
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', '#667eea');
            circle.setAttribute('class', 'data-point');
            
            // Add tooltip
            circle.addEventListener('mouseenter', (e) => {
                this.showTooltip(e, `Date: ${point.date.toLocaleDateString()}\nXP: ${point.xp.toLocaleString()}`);
            });
            
            svg.appendChild(circle);
        });
        
        container.innerHTML = '';
        container.appendChild(svg);
    }

    createAuditRatioGraph(progressData, resultData) {
        const container = document.getElementById('audit-ratio-graph');
        
        const totalProgress = progressData.length;
        const totalResults = resultData.length;
        const total = totalProgress + totalResults;
        
        if (total === 0) {
            container.innerHTML = '<div class="loading">No audit data available</div>';
            return;
        }

        const progressRatio = (totalProgress / total) * 100;
        const resultRatio = (totalResults / total) * 100;

        // Create pie chart
        const width = 300;
        const height = 250;
        const radius = Math.min(width, height) / 2 - 20;
        const centerX = width / 2;
        const centerY = height / 2;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        // Calculate angles
        const progressAngle = (progressRatio / 100) * 2 * Math.PI;
        const resultAngle = (resultRatio / 100) * 2 * Math.PI;

        // Create pie slices
        const progressSlice = this.createPieSlice(centerX, centerY, radius, 0, progressAngle, '#667eea');
        const resultSlice = this.createPieSlice(centerX, centerY, radius, progressAngle, progressAngle + resultAngle, '#764ba2');

        svg.appendChild(progressSlice);
        svg.appendChild(resultSlice);

        // Add labels
        const progressLabel = this.createLabel(centerX + Math.cos(progressAngle / 2) * (radius * 0.7), 
                                             centerY + Math.sin(progressAngle / 2) * (radius * 0.7), 
                                             `Progress\n${progressRatio.toFixed(1)}%`);
        const resultLabel = this.createLabel(centerX + Math.cos(progressAngle + resultAngle / 2) * (radius * 0.7), 
                                           centerY + Math.sin(progressAngle + resultAngle / 2) * (radius * 0.7), 
                                           `Results\n${resultRatio.toFixed(1)}%`);

        svg.appendChild(progressLabel);
        svg.appendChild(resultLabel);

        container.innerHTML = '';
        container.appendChild(svg);
    }

    createProjectSuccessGraph(progressData, resultData) {
        const container = document.getElementById('project-success-graph');
        
        // Group by project type
        const projectProgress = progressData.filter(p => p.object && p.object.type === 'project');
        const projectResults = resultData.filter(r => r.object && r.object.type === 'project');
        
        const totalProjects = projectProgress.length + projectResults.length;
        
        if (totalProjects === 0) {
            container.innerHTML = '<div class="loading">No project data available</div>';
            return;
        }

        const passedProjects = projectProgress.filter(p => p.grade === 1).length + 
                              projectResults.filter(r => r.grade === 1).length;
        const failedProjects = totalProjects - passedProjects;

        // Create bar chart
        const width = 400;
        const height = 250;
        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const barWidth = 80;
        const barSpacing = 20;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        const maxValue = Math.max(passedProjects, failedProjects);
        const yScale = (height - margin.top - margin.bottom) / maxValue;

        // Passed projects bar
        const passedBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        passedBar.setAttribute('x', margin.left);
        passedBar.setAttribute('y', height - margin.bottom - (passedProjects * yScale));
        passedBar.setAttribute('width', barWidth);
        passedBar.setAttribute('height', passedProjects * yScale);
        passedBar.setAttribute('fill', '#27ae60');
        passedBar.setAttribute('class', 'bar');

        // Failed projects bar
        const failedBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        failedBar.setAttribute('x', margin.left + barWidth + barSpacing);
        failedBar.setAttribute('y', height - margin.bottom - (failedProjects * yScale));
        failedBar.setAttribute('width', barWidth);
        failedBar.setAttribute('height', failedProjects * yScale);
        failedBar.setAttribute('fill', '#e74c3c');
        failedBar.setAttribute('class', 'bar');

        svg.appendChild(passedBar);
        svg.appendChild(failedBar);

        // Add labels
        const passedLabel = this.createLabel(margin.left + barWidth / 2, height - margin.bottom + 20, 'Passed');
        const failedLabel = this.createLabel(margin.left + barWidth + barSpacing + barWidth / 2, height - margin.bottom + 20, 'Failed');

        svg.appendChild(passedLabel);
        svg.appendChild(failedLabel);

        // Add values
        const passedValue = this.createLabel(margin.left + barWidth / 2, height - margin.bottom - (passedProjects * yScale) - 10, passedProjects.toString());
        const failedValue = this.createLabel(margin.left + barWidth + barSpacing + barWidth / 2, height - margin.bottom - (failedProjects * yScale) - 10, failedProjects.toString());

        svg.appendChild(passedValue);
        svg.appendChild(failedValue);

        container.innerHTML = '';
        container.appendChild(svg);
    }

    createExerciseAttemptsGraph(progressData, resultData) {
        const container = document.getElementById('exercise-attempts-graph');
        
        // Group exercises by path
        const exerciseMap = new Map();
        
        [...progressData, ...resultData].forEach(item => {
            if (item.object && item.object.type === 'exercise') {
                const path = item.path || 'Unknown';
                if (!exerciseMap.has(path)) {
                    exerciseMap.set(path, { attempts: 0, passed: 0 });
                }
                exerciseMap.get(path).attempts++;
                if (item.grade === 1) {
                    exerciseMap.get(path).passed++;
                }
            }
        });

        if (exerciseMap.size === 0) {
            container.innerHTML = '<div class="loading">No exercise data available</div>';
            return;
        }

        // Sort by attempts and take top 10
        const sortedExercises = Array.from(exerciseMap.entries())
            .sort((a, b) => b[1].attempts - a[1].attempts)
            .slice(0, 10);

        // Create horizontal bar chart
        const width = 400;
        const height = 250;
        const margin = { top: 20, right: 30, bottom: 40, left: 200 };
        const barHeight = 15;
        const barSpacing = 5;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        const maxAttempts = Math.max(...sortedExercises.map(([_, data]) => data.attempts));
        const xScale = (width - margin.left - margin.right) / maxAttempts;

        sortedExercises.forEach(([path, data], index) => {
            const y = margin.top + index * (barHeight + barSpacing);
            const barWidth = data.attempts * xScale;

            // Background bar (total attempts)
            const bgBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bgBar.setAttribute('x', margin.left);
            bgBar.setAttribute('y', y);
            bgBar.setAttribute('width', barWidth);
            bgBar.setAttribute('height', barHeight);
            bgBar.setAttribute('fill', '#ecf0f1');

            // Success bar (passed attempts)
            const successBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const successWidth = (data.passed / data.attempts) * barWidth;
            successBar.setAttribute('x', margin.left);
            successBar.setAttribute('y', y);
            successBar.setAttribute('width', successWidth);
            successBar.setAttribute('height', barHeight);
            successBar.setAttribute('fill', '#27ae60');

            // Label
            const label = this.createLabel(margin.left - 10, y + barHeight / 2, path.split('/').pop() || 'Exercise');
            label.setAttribute('text-anchor', 'end');
            label.setAttribute('dominant-baseline', 'middle');

            svg.appendChild(bgBar);
            svg.appendChild(successBar);
            svg.appendChild(label);
        });

        container.innerHTML = '';
        container.appendChild(svg);
    }

    createPieSlice(cx, cy, r, startAngle, endAngle, fill) {
        const slice = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        slice.setAttribute('class', 'pie-slice');
        slice.setAttribute('fill', fill);
        
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        
        const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
        
        const pathData = [
            `M ${cx} ${cy}`,
            `L ${x1} ${y1}`,
            `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
        ].join(' ');
        
        slice.setAttribute('d', pathData);
        return slice;
    }

    createLabel(x, y, text) {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('font-size', '12');
        label.setAttribute('fill', '#333');
        label.textContent = text;
        return label;
    }

    showTooltip(event, text) {
        // Simple tooltip implementation
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px 10px';
        tooltip.style.borderRadius = '5px';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '1000';
        tooltip.style.pointerEvents = 'none';
        tooltip.textContent = text;
        
        document.body.appendChild(tooltip);
        
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = (rect.left + window.scrollX) + 'px';
        tooltip.style.top = (rect.top + window.scrollY - 30) + 'px';
        
        setTimeout(() => {
            document.body.removeChild(tooltip);
        }, 2000);
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
