// Tomorrow School Profile App
class TomorrowSchoolApp {
    constructor() {
        this.apiUrl = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql';
        this.authUrl = 'https://01.tomorrow-school.ai/api/auth/signin';
        this.jwt = localStorage.getItem('jwt');
        this.userId = null;
        
        this.basicInfoModule = new BasicInfoModule(this);
        this.experiencePointsModule = new ExperiencePointsModule(this);
        
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
            this.loadUserData();
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
            this.loadUserData();
            
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

    async loadUserData() {
        try {
            // Load user basic info
            await this.loadUserInfo();
            
            // Load XP data
            await this.experiencePointsModule.loadXPData();
            
            // Load progress data
            try {
                await this.loadProgressData();
            } catch (progressError) {
                console.error('Error loading progress data:', progressError);
                // Show basic progress data even if loading fails
                await this.showBasicProgressData();
            }
            
            // Load checkpoint zero data
            try {
                await this.loadCheckpointZeroData();
            } catch (checkpointError) {
                console.error('Error loading checkpoint zero data:', checkpointError);
            }
            
            // Setup progress button event listeners
            this.setupProgressButtons();
            
            
            
            // Load statistics and create graphs
            await this.loadStatistics();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Failed to load user data. Please try logging in again.');
        }
    }

    async loadUserInfo() {
        const query = `
            query {
                user {
                    id
                    login
                    profile
                    attrs
                    createdAt
                    campus
                }
            }
        `;

        const data = await this.makeGraphQLQuery(query);
        
        if (data.user && data.user.length > 0) {
            const user = data.user[0];
            // Store original date for calculations
            localStorage.setItem('memberSince', user.createdAt);
            
            // Сохраняем информацию о пользователе в классе
            this.currentUser = user;
            
            // Загружаем данные для вычисления level
            const userLevel = await this.calculateUserLevel(user.id);
            user.level = userLevel;
            
            this.displayUserInfo(user);
        }
    }

    async calculateUserLevel(userId) {
        try {
            // Получаем последнюю транзакцию типа "level" для получения настоящего level
            const levelQuery = `
                query {
                    transaction(where: {userId: {_eq: ${userId}}, type: {_eq: "level"}}, order_by: {createdAt: desc}, limit: 1) {
                        amount
                        createdAt
                        path
                    }
                }
            `;

            const levelData = await this.makeGraphQLQuery(levelQuery);
            let currentLevel = 1;
            let levelDate = null;
            let levelPath = null;

            if (levelData && levelData.transaction && levelData.transaction.length > 0) {
                const levelTx = levelData.transaction[0];
                currentLevel = Math.round(levelTx.amount);
                levelDate = levelTx.createdAt;
                levelPath = levelTx.path;
            }

            // Также получаем статистику по проектам для дополнительной информации
            const resultsQuery = `
                query {
                    result(where: {userId: {_eq: ${userId}}}, order_by: {createdAt: desc}) {
                        id
                        grade
                        object {
                            name
                            type
                        }
                    }
                }
            `;

            const resultsData = await this.makeGraphQLQuery(resultsQuery);
            let completedProjects = 0;
            let totalProjects = 0;
            let averageGrade = 0;

            if (resultsData && resultsData.result) {
                const results = resultsData.result;
                completedProjects = results.filter(r => r.grade > 0).length;
                totalProjects = results.length;
                averageGrade = results.length > 0 ? 
                    results.reduce((sum, r) => sum + (r.grade || 0), 0) / results.length : 0;
            }
            
            return {
                level: currentLevel,
                levelDate: levelDate,
                levelPath: levelPath,
                completedProjects: completedProjects,
                totalProjects: totalProjects,
                averageGrade: Math.round(averageGrade * 100) / 100
            };
        } catch (error) {
            // Error calculating user level
        }
        
        return {
            level: 1,
            levelDate: null,
            levelPath: null,
            completedProjects: 0,
            totalProjects: 0,
            averageGrade: 0
        };
    }

    displayUserInfo(user) {
        const userDetails = document.getElementById('user-details');
        
        // Parse profile and attrs if they exist
        let profileData = {};
        let attrsData = {};
        
        try {
            if (user.profile) {
                profileData = typeof user.profile === 'string' ? JSON.parse(user.profile) : user.profile;
            }
        } catch (e) {
            // Could not parse profile data
        }
        
        try {
            if (user.attrs) {
                attrsData = typeof user.attrs === 'string' ? JSON.parse(user.attrs) : user.attrs;
            }
        } catch (e) {
            // Could not parse attrs data
        }
        
        // Format dates
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };
        
        userDetails.innerHTML = `
            <div class="info-item">
                <h3>User ID</h3>
                <div class="value">${user.id}</div>
            </div>
            <div class="info-item">
                <h3>Username</h3>
                <div class="value">${user.login || 'N/A'}</div>
            </div>
            <div class="info-item">
                <h3>Level</h3>
                <div class="value level-info">
                    <span class="level-number">${user.level?.level || 1}</span>
                </div>
            </div>
            <div class="info-item">
                <h3>Campus</h3>
                <div class="value">${user.campus || 'N/A'}</div>
            </div>
            <div class="info-item">
                <h3>Member Since</h3>
                <div class="value" data-date="member-since">${formatDate(user.createdAt)}</div>
            </div>
            ${profileData.email ? `
            <div class="info-item">
                <h3>Email</h3>
                <div class="value">${profileData.email}</div>
            </div>
            ` : ''}
            ${attrsData.firstName || attrsData.lastName ? `
            <div class="info-item">
                <h3>Full Name</h3>
                <div class="value">${(attrsData.firstName || '') + ' ' + (attrsData.lastName || '')}</div>
            </div>
            ` : ''}
            ${attrsData.location ? `
            <div class="info-item">
                <h3>Location</h3>
                <div class="value">${attrsData.location}</div>
            </div>
            ` : ''}
        `;
    }



    
    
    
    


    async loadProgressData() {
        try {
            // Load projects data
            const projectsQuery = `
                query {
                    progress(where: {object: {type: {_eq: "project"}}}) {
                        id
                        userId
                        group {
                            id
                            captain {
                                id
                            }
                            members {
                                id
                            }
                        }
                        grade
                        createdAt
                        updatedAt
                        path
                        object {
                            id
                            name
                            type
                            attrs
                        }
                    }
                }
            `;

            const projectsData = await this.makeGraphQLQuery(projectsQuery);
            
            if (projectsData.progress) {
                this.processProjectsData(projectsData.progress);
            } else {
                this.showBasicProgressData();
            }
            
            // Load all AstanaHub projects for the "All Projects in Module" button
            await this.loadAllAstanaHubProjects();
            
        } catch (error) {
            console.error('Error loading progress data:', error);
            this.showBasicProgressData();
        }
    }

    async showBasicProgressData() {
        // Update button counts to show loading state
        document.getElementById('successful-count').textContent = '...';
        document.getElementById('failed-count').textContent = '...';
        document.getElementById('active-count').textContent = '...';
        document.getElementById('time-analysis-count').textContent = '...';
        document.getElementById('checkpoint-zero-count').textContent = '...';
        document.getElementById('all-projects-count').textContent = '...';
    }

    async loadAllAstanaHubProjects() {
        try {
            const allProjectsQuery = `
                query {
                    object(where: {type: {_eq: "project"}, campus: {_eq: "astanahub"}}) {
                        id
                        name
                        type
                        attrs
                        createdAt
                    }
                }
            `;

            const allProjectsData = await this.makeGraphQLQuery(allProjectsQuery);
            
            if (allProjectsData.object) {
                this.processAllAstanaHubProjects(allProjectsData.object);
            } else {
                document.getElementById('all-projects-count').textContent = '0';
            }
        } catch (error) {
            console.error('Error loading all AstanaHub projects:', error);
            document.getElementById('all-projects-count').textContent = '0';
        }
    }

    processAllAstanaHubProjects(allProjects) {
        // Update button count
        document.getElementById('all-projects-count').textContent = allProjects.length;
        
        // Store data for button clicks
        this.allAstanaHubProjects = allProjects;
    }

    async loadCheckpointZeroData() {
        try {
            const checkpointQuery = `
                query {
                    progress(where: {object: {name: {_eq: "checkpoint-zero"}}}) {
                        id
                        userId
                        group {
                            id
                            status
                        }
                        grade
                        createdAt
                        updatedAt
                        path
                        object {
                            id
                            name
                            type
                            attrs
                        }
                    }
                }
            `;

            const checkpointData = await this.makeGraphQLQuery(checkpointQuery);
            
            if (checkpointData.progress) {
                this.processCheckpointZeroData(checkpointData.progress);
            } else {
                document.getElementById('checkpoint-zero-count').textContent = '0';
            }
        } catch (error) {
            console.error('Error loading checkpoint zero data:', error);
            document.getElementById('checkpoint-zero-count').textContent = '0';
        }
    }

    processProjectsData(projects) {
        
        // Filter projects by grade
        const successfulProjects = projects.filter(p => p.grade !== null && p.grade >= 1);
        const failedProjects = projects.filter(p => p.grade !== null && p.grade < 1);
        const activeProjects = projects.filter(p => p.grade === null);
        
        // Group projects by name to find earliest start time
        const projectGroups = {};
        projects.forEach(project => {
            const name = project.object.name;
            if (!projectGroups[name]) {
                projectGroups[name] = [];
            }
            projectGroups[name].push(project);
        });
        
        // Calculate time spent for each project group
        const projectsWithTime = Object.entries(projectGroups).map(([name, attempts]) => {
            // Find earliest start time
            const earliestStart = new Date(Math.min(...attempts.map(a => new Date(a.createdAt))));
            
            // Find successful completion (grade >= 1)
            const successfulAttempt = attempts.find(a => a.grade !== null && a.grade >= 1);
            
            let timeSpentDays = null;
            let timeSpentMs = null;
            
            if (successfulAttempt) {
                const endTime = new Date(successfulAttempt.updatedAt);
                timeSpentMs = endTime - earliestStart;
                timeSpentDays = Math.round(timeSpentMs / (1000 * 60 * 60 * 24));
            }
            
            return {
                name: name,
                earliestStart: earliestStart,
                successfulAttempt: successfulAttempt,
                timeSpentDays: timeSpentDays,
                timeSpentMs: timeSpentMs,
                totalAttempts: attempts.length
            };
        });
        
        // Sort by time spent (longest to shortest) - only successful projects
        const sortedByTime = projectsWithTime
            .filter(p => p.timeSpentDays !== null) // Only successfully completed projects
            .sort((a, b) => b.timeSpentDays - a.timeSpentDays);
        
        // Update button counts
        document.getElementById('successful-count').textContent = successfulProjects.length;
        document.getElementById('failed-count').textContent = failedProjects.length;
        document.getElementById('active-count').textContent = activeProjects.length;
        document.getElementById('time-analysis-count').textContent = sortedByTime.length;
        
        // Store data for button clicks
        this.projectsData = {
            successful: successfulProjects,
            failed: failedProjects,
            active: activeProjects,
            timeAnalysis: sortedByTime
        };
    }

    processCheckpointZeroData(checkpointData) {
        
        // Sort by createdAt (newest first)
        const sortedCheckpoint = checkpointData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Categorize by grade
        const successful = sortedCheckpoint.filter(p => p.grade !== null && p.grade >= 1);
        const registeredNotStarted = sortedCheckpoint.filter(p => p.grade !== null && p.grade === 0);
        const registeredIncomplete = sortedCheckpoint.filter(p => p.grade !== null && p.grade > 0 && p.grade < 1);
        const notRegistered = sortedCheckpoint.filter(p => p.grade === null);
        
        // Update button count
        document.getElementById('checkpoint-zero-count').textContent = sortedCheckpoint.length;
        
        // Store data for button clicks
        this.checkpointZeroData = {
            all: sortedCheckpoint,
            successful: successful,
            registeredNotStarted: registeredNotStarted,
            registeredIncomplete: registeredIncomplete,
            notRegistered: notRegistered
        };
    }

    setupProgressButtons() {
        const successfulBtn = document.getElementById('successful-projects-btn');
        const failedBtn = document.getElementById('failed-projects-btn');
        const activeBtn = document.getElementById('active-projects-btn');
        const timeAnalysisBtn = document.getElementById('time-analysis-btn');
        const checkpointZeroBtn = document.getElementById('checkpoint-zero-btn');
        const allProjectsBtn = document.getElementById('all-projects-btn');
        
        if (successfulBtn) {
            successfulBtn.addEventListener('click', () => this.toggleSuccessfulProjects());
        }
        
        if (failedBtn) {
            failedBtn.addEventListener('click', () => this.toggleFailedProjects());
        }
        
        if (activeBtn) {
            activeBtn.addEventListener('click', () => this.toggleActiveProjects());
        }
        
        if (timeAnalysisBtn) {
            timeAnalysisBtn.addEventListener('click', () => this.toggleTimeAnalysis());
        }
        
        if (checkpointZeroBtn) {
            checkpointZeroBtn.addEventListener('click', () => this.toggleCheckpointZero());
        }
        
        if (allProjectsBtn) {
            allProjectsBtn.addEventListener('click', () => this.toggleAllProjects());
        }
    }

    toggleSuccessfulProjects() {
        const progressContent = document.getElementById('progress-content');
        const successfulBtn = document.getElementById('successful-projects-btn');
        const failedBtn = document.getElementById('failed-projects-btn');
        const activeBtn = document.getElementById('active-projects-btn');
        const timeAnalysisBtn = document.getElementById('time-analysis-btn');
        const checkpointZeroBtn = document.getElementById('checkpoint-zero-btn');
        
        // If content is already showing successful projects, hide it
        if (successfulBtn.classList.contains('active')) {
            this.hideProgressContent();
            return;
        }
        
        // Update button states
        successfulBtn.classList.add('active');
        failedBtn.classList.remove('active');
        activeBtn.classList.remove('active');
        timeAnalysisBtn.classList.remove('active');
        checkpointZeroBtn.classList.remove('active');
        
        // Show content
        progressContent.style.display = 'block';
        
        if (!this.projectsData || !this.projectsData.successful) {
            progressContent.innerHTML = '<p>No successful projects data available</p>';
            return;
        }
        
        const projects = this.projectsData.successful;
        let html = '<h3>✅ Successful Projects</h3>';
        
        if (projects.length === 0) {
            html += '<p>No successful projects found</p>';
        } else {
            projects.forEach(project => {
                const createdAt = new Date(project.createdAt).toLocaleDateString();
                html += `
                    <div class="project-item">
                        <span class="project-name">${project.object.name}</span>
                        <span class="project-grade">Started: ${createdAt}</span>
                </div>
            `;
            });
        }
        
        progressContent.innerHTML = html;
    }

    toggleFailedProjects() {
        const progressContent = document.getElementById('progress-content');
        const successfulBtn = document.getElementById('successful-projects-btn');
        const failedBtn = document.getElementById('failed-projects-btn');
        const activeBtn = document.getElementById('active-projects-btn');
        const timeAnalysisBtn = document.getElementById('time-analysis-btn');
        const checkpointZeroBtn = document.getElementById('checkpoint-zero-btn');
        
        // If content is already showing failed projects, hide it
        if (failedBtn.classList.contains('active')) {
            this.hideProgressContent();
            return;
        }
        
        // Update button states
        failedBtn.classList.add('active');
        successfulBtn.classList.remove('active');
        activeBtn.classList.remove('active');
        timeAnalysisBtn.classList.remove('active');
        checkpointZeroBtn.classList.remove('active');
        
        // Show content
        progressContent.style.display = 'block';
        
        if (!this.projectsData || !this.projectsData.failed) {
            progressContent.innerHTML = '<p>No failed projects data available</p>';
            return;
        }
        
        const projects = this.projectsData.failed;
        let html = '<h3>❌ Failed Projects</h3>';
        
        if (projects.length === 0) {
            html += '<p>No failed projects found</p>';
        } else {
            // Group projects by name to show retry attempts
            const projectGroups = {};
            projects.forEach(project => {
                const name = project.object.name;
                if (!projectGroups[name]) {
                    projectGroups[name] = [];
                }
                projectGroups[name].push(project);
            });
            
            Object.entries(projectGroups).forEach(([name, attempts]) => {
                const attemptsCount = attempts.length;
                const latestAttempt = attempts[attempts.length - 1];
                const createdAt = new Date(latestAttempt.createdAt).toLocaleDateString();
                
                html += `
                    <div class="project-item">
                        <span class="project-name">${name} ${attemptsCount > 1 ? `(${attemptsCount} attempts)` : ''}</span>
                        <span class="project-grade">Last attempt: ${createdAt}</span>
                    </div>
                `;
            });
        }
        
        progressContent.innerHTML = html;
    }

    toggleActiveProjects() {
        const progressContent = document.getElementById('progress-content');
        const successfulBtn = document.getElementById('successful-projects-btn');
        const failedBtn = document.getElementById('failed-projects-btn');
        const activeBtn = document.getElementById('active-projects-btn');
        const timeAnalysisBtn = document.getElementById('time-analysis-btn');
        const checkpointZeroBtn = document.getElementById('checkpoint-zero-btn');
        
        // If content is already showing active projects, hide it
        if (activeBtn.classList.contains('active')) {
            this.hideProgressContent();
            return;
        }
        
        // Update button states
        activeBtn.classList.add('active');
        successfulBtn.classList.remove('active');
        failedBtn.classList.remove('active');
        timeAnalysisBtn.classList.remove('active');
        checkpointZeroBtn.classList.remove('active');
        
        // Show content
        progressContent.style.display = 'block';
        
        if (!this.projectsData || !this.projectsData.active) {
            progressContent.innerHTML = '<p>No active projects data available</p>';
            return;
        }
        
        const projects = this.projectsData.active;
        let html = '<h3>🔄 Active Projects</h3>';
        
        if (projects.length === 0) {
            html += '<p>No active projects found</p>';
        } else {
            projects.forEach(project => {
                const createdAt = new Date(project.createdAt).toLocaleDateString();
                html += `
                    <div class="project-item">
                        <span class="project-name">${project.object.name}</span>
                        <span class="project-grade">Started: ${createdAt}</span>
                    </div>
                `;
            });
        }
        
        progressContent.innerHTML = html;
    }

    toggleTimeAnalysis() {
        const progressContent = document.getElementById('progress-content');
        const successfulBtn = document.getElementById('successful-projects-btn');
        const failedBtn = document.getElementById('failed-projects-btn');
        const activeBtn = document.getElementById('active-projects-btn');
        const timeAnalysisBtn = document.getElementById('time-analysis-btn');
        const checkpointZeroBtn = document.getElementById('checkpoint-zero-btn');
        
        // If content is already showing time analysis, hide it
        if (timeAnalysisBtn.classList.contains('active')) {
            this.hideProgressContent();
            return;
        }
        
        // Update button states
        timeAnalysisBtn.classList.add('active');
        successfulBtn.classList.remove('active');
        failedBtn.classList.remove('active');
        activeBtn.classList.remove('active');
        checkpointZeroBtn.classList.remove('active');
        
        // Show content
        progressContent.style.display = 'block';
        
        if (!this.projectsData || !this.projectsData.timeAnalysis) {
            progressContent.innerHTML = '<p>No time analysis data available</p>';
            return;
        }
        
        const projects = this.projectsData.timeAnalysis;
        let html = '<h3>⏱️ Time Analysis (Longest to Shortest)</h3>';
        
        if (projects.length === 0) {
            html += '<p>No completed projects found for time analysis</p>';
        } else {
            projects.forEach(project => {
                const timeSpent = project.timeSpentDays;
                const timeDisplay = timeSpent === 0 ? '< 1 day' : `${timeSpent} day${timeSpent > 1 ? 's' : ''}`;
                const gradeDisplay = project.successfulAttempt.grade.toFixed(2);
                const attemptsText = project.totalAttempts > 1 ? ` (${project.totalAttempts} attempts)` : '';
                
                html += `
                    <div class="project-item">
                        <span class="project-name">${project.name}${attemptsText}</span>
                        <span class="project-grade">${timeDisplay} (Grade: ${gradeDisplay})</span>
                    </div>
                `;
            });
        }
        
        progressContent.innerHTML = html;
    }

    toggleCheckpointZero() {
        const progressContent = document.getElementById('progress-content');
        const successfulBtn = document.getElementById('successful-projects-btn');
        const failedBtn = document.getElementById('failed-projects-btn');
        const activeBtn = document.getElementById('active-projects-btn');
        const timeAnalysisBtn = document.getElementById('time-analysis-btn');
        const checkpointZeroBtn = document.getElementById('checkpoint-zero-btn');
        
        // If content is already showing checkpoint zero, hide it
        if (checkpointZeroBtn.classList.contains('active')) {
            this.hideProgressContent();
            return;
        }
        
        // Update button states
        checkpointZeroBtn.classList.add('active');
        successfulBtn.classList.remove('active');
        failedBtn.classList.remove('active');
        activeBtn.classList.remove('active');
        timeAnalysisBtn.classList.remove('active');
        
        // Show content
        progressContent.style.display = 'block';
        
        if (!this.checkpointZeroData) {
            progressContent.innerHTML = '<p>No checkpoint zero data available</p>';
            return;
        }
        
        let html = '<h3>🎯 Checkpoint Zero Analysis</h3>';
        
        // Successful (grade >= 1)
        html += `<h4>✅ Successful (${this.checkpointZeroData.successful.length})</h4>`;
        if (this.checkpointZeroData.successful.length === 0) {
            html += '<p>No successful completions</p>';
        } else {
            this.checkpointZeroData.successful.forEach(item => {
                const createdAt = new Date(item.createdAt).toLocaleDateString();
                html += `<div class="project-item"><span class="project-name">${createdAt}</span><span class="project-grade" style="color: white;">Grade: ${item.grade.toFixed(2)}</span></div>`;
            });
        }
        
        // Registered but not started (grade = 0)
        html += `<h4>📝 Registered but not started (${this.checkpointZeroData.registeredNotStarted.length})</h4>`;
        if (this.checkpointZeroData.registeredNotStarted.length === 0) {
            html += '<p>No registrations without attempts</p>';
        } else {
            this.checkpointZeroData.registeredNotStarted.forEach(item => {
                const createdAt = new Date(item.createdAt).toLocaleDateString();
                html += `<div class="project-item"><span class="project-name">${createdAt}</span><span class="project-grade">Registered</span></div>`;
            });
        }
        
        // Registered but incomplete (grade > 0 but < 1)
        html += `<h4>🔄 Registered but incomplete (${this.checkpointZeroData.registeredIncomplete.length})</h4>`;
        if (this.checkpointZeroData.registeredIncomplete.length === 0) {
            html += '<p>No incomplete attempts</p>';
        } else {
            this.checkpointZeroData.registeredIncomplete.forEach(item => {
                const createdAt = new Date(item.createdAt).toLocaleDateString();
                html += `<div class="project-item"><span class="project-name">${createdAt}</span><span class="project-grade" style="color: white;">Grade: ${item.grade.toFixed(2)}</span></div>`;
            });
        }
        
        // Not registered (grade = null)
        html += `<h4>❌ Not registered (${this.checkpointZeroData.notRegistered.length})</h4>`;
        if (this.checkpointZeroData.notRegistered.length === 0) {
            html += '<p>All users are registered</p>';
        } else {
            this.checkpointZeroData.notRegistered.forEach(item => {
                const createdAt = new Date(item.createdAt).toLocaleDateString();
                html += `<div class="project-item"><span class="project-name">${createdAt}</span><span class="project-grade">Not registered</span></div>`;
            });
        }
        
        progressContent.innerHTML = html;
    }

    toggleAllProjects() {
        const progressContent = document.getElementById('progress-content');
        const successfulBtn = document.getElementById('successful-projects-btn');
        const failedBtn = document.getElementById('failed-projects-btn');
        const activeBtn = document.getElementById('active-projects-btn');
        const timeAnalysisBtn = document.getElementById('time-analysis-btn');
        const checkpointZeroBtn = document.getElementById('checkpoint-zero-btn');
        const allProjectsBtn = document.getElementById('all-projects-btn');
        
        // If content is already showing all projects, hide it
        if (allProjectsBtn.classList.contains('active')) {
            this.hideProgressContent();
            return;
        }
        
        // Update button states
        allProjectsBtn.classList.add('active');
        successfulBtn.classList.remove('active');
        failedBtn.classList.remove('active');
        activeBtn.classList.remove('active');
        timeAnalysisBtn.classList.remove('active');
        checkpointZeroBtn.classList.remove('active');
        
        // Show content
        progressContent.style.display = 'block';
        
        if (!this.allAstanaHubProjects) {
            progressContent.innerHTML = '<p>No AstanaHub projects data available</p>';
            return;
        }
        
        let html = '<h3>📁 All Projects in AstanaHub Module</h3>';
        
        if (this.allAstanaHubProjects.length === 0) {
            html += '<p>No projects found in AstanaHub module</p>';
        } else {
            // Sort by creation date (newest first)
            const sortedProjects = this.allAstanaHubProjects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            sortedProjects.forEach(project => {
                const createdAt = new Date(project.createdAt).toLocaleDateString();
                
                // Извлекаем информацию о размере группы из attrs
                let groupInfo = '📁 Project - Created: ' + createdAt;
                if (project.attrs) {
                    try {
                        const attrs = typeof project.attrs === 'string' ? JSON.parse(project.attrs) : project.attrs;
                        if (attrs.groupMin && attrs.groupMax) {
                            if (attrs.groupMin === attrs.groupMax) {
                                groupInfo = `👥 Group size: ${attrs.groupMin} participants`;
                            } else {
                                groupInfo = `👥 Group size: ${attrs.groupMin}-${attrs.groupMax} participants`;
                            }
                        } else if (attrs.groupMax) {
                            groupInfo = `👥 Max group size: ${attrs.groupMax} participants`;
                        } else if (attrs.groupMin) {
                            groupInfo = `👥 Min group size: ${attrs.groupMin} participants`;
                        }
                    } catch (e) {
                        // Error parsing project attrs
                    }
                }
                
                html += `
                    <div class="project-item">
                        <span class="project-name">${project.name}</span>
                        <span class="project-grade">${groupInfo}</span>
                    </div>
                `;
            });
        }
        
        progressContent.innerHTML = html;
    }

    hideProgressContent() {
        const progressContent = document.getElementById('progress-content');
        const successfulBtn = document.getElementById('successful-projects-btn');
        const failedBtn = document.getElementById('failed-projects-btn');
        const activeBtn = document.getElementById('active-projects-btn');
        const timeAnalysisBtn = document.getElementById('time-analysis-btn');
        const checkpointZeroBtn = document.getElementById('checkpoint-zero-btn');
        const allProjectsBtn = document.getElementById('all-projects-btn');
        
        // Hide content
        progressContent.style.display = 'none';
        
        // Remove active states
        successfulBtn.classList.remove('active');
        failedBtn.classList.remove('active');
        activeBtn.classList.remove('active');
        timeAnalysisBtn.classList.remove('active');
        checkpointZeroBtn.classList.remove('active');
        allProjectsBtn.classList.remove('active');
    }

    displayProgressData(progress, results, groupMemberships, eventParticipations) {
        
        // Ensure we have arrays to work with
        progress = progress || [];
        results = results || [];
        groupMemberships = groupMemberships || [];
        eventParticipations = eventParticipations || [];

        const totalProgress = progress.length;
        const totalResults = results.length;
        const passedProgress = progress.filter(p => p.grade >= 1).length;
        const passedResults = results.filter(r => r.grade >= 1).length;
        
        // Calculate detailed progress breakdown by object type
        const progressByType = {};
        const resultsByType = {};
        
        progress.forEach(p => {
            const type = p.object?.type || 'unknown';
            if (!progressByType[type]) {
                progressByType[type] = { total: 0, passed: 0 };
            }
            progressByType[type].total++;
            if (p.grade >= 1) progressByType[type].passed++;
        });
        
        results.forEach(r => {
            const type = r.object?.type || 'unknown';
            if (!resultsByType[type]) {
                resultsByType[type] = { total: 0, passed: 0 };
            }
            resultsByType[type].total++;
            if (r.grade >= 1) resultsByType[type].passed++;
        });
        
        
        // Calculate group statistics
        const totalGroups = groupMemberships.length;
        const confirmedGroups = groupMemberships.length; // Since we can't check confirmed status, assume all are confirmed
        const activeGroups = groupMemberships.filter(g => g.group?.status === 'working').length;
        const finishedGroups = groupMemberships.filter(g => g.group?.status === 'finished').length;
        
        // Calculate event statistics
        const totalEvents = eventParticipations.length;
        const eventsByType = {};
        // Since we simplified the event query, we'll just count total events
        eventsByType['events'] = totalEvents;
        
        const progressDetails = document.getElementById('progress-details');
        
        progressDetails.innerHTML = `
            <!-- Basic Progress Stats -->
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
            
            
            <!-- Group Statistics -->
            <div class="info-item">
                <h3>Groups Joined</h3>
                <div class="value">${totalGroups}</div>
            </div>
            <div class="info-item">
                <h3>Confirmed Groups</h3>
                <div class="value">${confirmedGroups}</div>
            </div>
            <div class="info-item">
                <h3>Active Groups</h3>
                <div class="value">${activeGroups}</div>
            </div>
            <div class="info-item">
                <h3>Finished Groups</h3>
                <div class="value">${finishedGroups}</div>
            </div>
            
            <!-- Event Participation -->
            <div class="info-item">
                <h3>Events Participated</h3>
                <div class="value">${totalEvents}</div>
            </div>
            
            <!-- Progress Breakdown by Type -->
            <div class="info-item progress-breakdown">
                <h3>Progress by Type</h3>
                <div class="breakdown-list">
                    ${Object.keys(progressByType).map(type => `
                        <div class="breakdown-item">
                            <span class="type-name">${type}</span>
                            <span class="type-stats">${progressByType[type].passed}/${progressByType[type].total}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Results Breakdown by Type -->
            <div class="info-item results-breakdown">
                <h3>Results by Type</h3>
                <div class="breakdown-list">
                    ${Object.keys(resultsByType).map(type => `
                        <div class="breakdown-item">
                            <span class="type-name">${type}</span>
                            <span class="type-stats">${resultsByType[type].passed}/${resultsByType[type].total}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Event Breakdown -->
            ${Object.keys(eventsByType).length > 0 ? `
            <div class="info-item events-breakdown">
                <h3>Events by Type</h3>
                <div class="breakdown-list">
                    ${Object.keys(eventsByType).map(type => `
                        <div class="breakdown-item">
                            <span class="type-name">${type}</span>
                            <span class="type-count">${eventsByType[type]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        `;
        
    }

    async loadStatistics() {
        try {
            // Load data for all graphs
            const [xpData, progressData, resultData, languagesData] = await Promise.all([
                this.getXPTimeData(),
                this.getProgressData(),
                this.getResultData(),
                this.getLanguagesData()
            ]);

            // Create graphs only if containers exist
            const xpTimelineContainer = document.getElementById('xp-timeline-graph');
            const projectSuccessContainer = document.getElementById('project-success-graph');
            const exerciseAttemptsContainer = document.getElementById('exercise-attempts-graph');
            const languagesContainer = document.getElementById('languages-graph');
            
            if (xpTimelineContainer) {
                this.createXPTimelineGraph(xpData);
            }
            
            if (projectSuccessContainer) {
                this.createProjectSuccessGraph(progressData, resultData);
            }
            
            if (exerciseAttemptsContainer) {
                this.createExerciseAttemptsGraph(progressData, resultData);
            }
            
            if (languagesContainer) {
                this.createLanguagesGraph(languagesData);
            }
            
            // Загружаем график ролей
            this.loadRolesGraph();
            
            // Добавляем обработчик клика для графика языков
            this.addLanguagesGraphClickHandler();
            
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

    async getLanguagesData() {
        try {
            // Используем ту же логику, что и для модального окна
            const allProjects = await this.getAllAstanaHubProjectsWithLanguages();
            const userProjects = await this.getUserSuccessfulProjects();
            
            // Анализируем языки
            const languagesData = this.analyzeLanguagesWithUserProgress(allProjects, userProjects);
            
            // Преобразуем в формат для графика
            const languages = Object.entries(languagesData).map(([language, projects]) => {
                const completedCount = projects.filter(p => p.completed).length;
                const totalCount = projects.length;
                
                return {
                    name: language,
                    completed: completedCount,
                    total: totalCount,
                    percentage: totalCount > 0 ? (completedCount / totalCount) * 100 : 0
                };
            }).sort((a, b) => b.total - a.total); // Сортируем по общему количеству проектов
            
            return {
                total_projects: userProjects.length,
                languages: languages,
                isPersonalized: true
            };
        } catch (error) {
            console.error('Error loading languages data:', error);
            return {
                total_projects: 0,
                languages: [],
                isPersonalized: true
            };
        }
    }

    async getUserProjectsWithLanguages() {
        try {
            const query = `
                query {
                    progress(where: {object: {type: {_eq: "project"}}}) {
                        id
                        userId
                        grade
                        createdAt
                        object {
                            id
                            name
                            type
                            attrs
                        }
                    }
                }
            `;

            const data = await this.makeGraphQLQuery(query);
            return data.progress || [];
        } catch (error) {
            console.error('Error loading user projects:', error);
            return [];
        }
    }

    analyzeUserLanguages(projects) {
        const languageCount = {};
        
        projects.forEach(project => {
            if (project.object && project.object.attrs) {
                try {
                    const attrs = typeof project.object.attrs === 'string' 
                        ? JSON.parse(project.object.attrs) 
                        : project.object.attrs;
                    
                    if (attrs.language) {
                        const language = attrs.language;
                        // Нормализуем название языка (приводим к нижнему регистру для сопоставления)
                        const normalizedLanguage = language.toLowerCase().trim();
                        languageCount[normalizedLanguage] = (languageCount[normalizedLanguage] || 0) + 1;
                    }
                } catch (e) {
                    // Error parsing project attrs
                }
            }
        });


        // Преобразуем в массив и сортируем по количеству проектов
        return Object.entries(languageCount)
            .map(([language, count]) => [language, count])
            .sort((a, b) => b[1] - a[1]);
    }

    createLanguageProgressData(generalLanguages, userLanguages) {
        // Создаем мапу пользовательских языков для быстрого поиска (с нормализацией)
        const userLanguageMap = new Map();
        userLanguages.forEach(([language, count]) => {
            const normalizedLanguage = language.toLowerCase().trim();
            userLanguageMap.set(normalizedLanguage, count);
        });
        
        
        // Создаем прогресс-данные для всех языков из общих данных
        const progressData = generalLanguages.map(([language, totalCount]) => {
            // Нормализуем название языка для сопоставления
            const normalizedLanguage = language.toLowerCase().trim();
            const userCount = userLanguageMap.get(normalizedLanguage) || 0;
            
            // Валидация: пользователь не может выполнить больше проектов, чем доступно
            const validUserCount = Math.min(userCount, totalCount);
            
            // Валидация: общее количество должно быть больше 0
            const validTotalCount = Math.max(totalCount, 1);
            
            const percentage = validTotalCount > 0 ? Math.round((validUserCount / validTotalCount) * 100) : 0;
            
            
            return {
                language: language, // Используем оригинальное название для отображения
                total: validTotalCount,
                completed: validUserCount,
                percentage: percentage
            };
        });
        
        // Сортируем по общему количеству проектов (по убыванию)
        return progressData.sort((a, b) => b.total - a.total);
    }

    async getGeneralLanguagesData() {
        // Проверяем, работаем ли мы через HTTP сервер или file:// протокол
        const isFileProtocol = window.location.protocol === 'file:';
        
        if (isFileProtocol) {
            // Возвращаем fallback данные для file:// протокола
            return {
                total_projects: 143,
                languages: [
                    ["Go", 27],
                    ["python", 21],
                    ["Open", 14],
                    ["dart", 14],
                    ["cybersecurity", 11],
                    ["unreal engine", 10],
                    ["JavaScript", 10],
                    ["C", 9],
                    ["C++", 8],
                    ["Rust", 7],
                    ["Java", 6],
                    ["TypeScript", 5],
                    ["PHP", 4],
                    ["Ruby", 3],
                    ["Swift", 2]
                ],
                isPersonalized: false
            };
        }
        
        try {
            // Загружаем данные о языках программирования из файла (только для HTTP)
            const response = await fetch('./final_languages_graph.json');
            if (!response.ok) {
                throw new Error('Failed to load languages data');
            }
            const data = await response.json();
            return {
                ...data,
                isPersonalized: false
            };
        } catch (error) {
            console.error('Error loading languages data:', error);
            // Возвращаем fallback данные в случае ошибки
            return {
                total_projects: 143,
                languages: [
                    ["Go", 27],
                    ["python", 21],
                    ["Open", 14],
                    ["dart", 14],
                    ["cybersecurity", 11],
                    ["unreal engine", 10],
                    ["JavaScript", 10],
                    ["C", 9],
                    ["C++", 8],
                    ["Rust", 7],
                    ["Java", 6],
                    ["TypeScript", 5],
                    ["PHP", 4],
                    ["Ruby", 3],
                    ["Swift", 2]
                ],
                isPersonalized: false
            };
        }
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
        const width = 200;
        const height = 400;
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

    createLanguagesGraph(languagesData) {
        const container = document.getElementById('languages-graph');
        
        if (!languagesData || !languagesData.languages || languagesData.languages.length === 0) {
            container.innerHTML = '<div class="loading">No languages data available</div>';
            return;
        }

        // Берем топ-10 языков для лучшего отображения
        const topLanguages = languagesData.languages.slice(0, 10);
        
        // Создаем горизонтальную диаграмму
        const width = 350; // Уменьшаем ширину
        const height = 500; // Уменьшаем высоту
        const margin = { top: 10, right: 15, bottom: 15, left: 80 }; // Увеличиваем левый отступ для названий языков
        const barHeight = 24; // Уменьшаем высоту полос
        const barSpacing = 9; // Уменьшаем расстояние между полосами

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        const maxProjects = Math.max(...topLanguages.map(lang => 
            languagesData.isPersonalized ? lang.total : lang[1] || 0
        ));
        const xScale = maxProjects > 0 ? (width - margin.left - margin.right) / maxProjects : 1;

        // Цвета для языков программирования
        const colors = [
            '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a',
            '#ffecd2', '#a8edea', '#d299c2', '#ffd89b', '#89f7fe'
        ];

        // Убираем заголовок из SVG, так как он уже есть в HTML
        const isPersonalized = languagesData.isPersonalized;

        if (topLanguages.length === 0) {
            // Если нет языков, показываем сообщение
            const noDataText = this.createLabel(width / 2, height / 2, 'No language data found in your projects');
            noDataText.setAttribute('font-size', '12');
            noDataText.setAttribute('font-weight', '400');
            noDataText.setAttribute('fill', '#999');
            svg.appendChild(noDataText);
        } else {
            topLanguages.forEach((languageData, index) => {
                const y = margin.top + index * (barHeight + barSpacing);
                const color = colors[index % colors.length];
                
                let language, total, completed, percentage;
                
                if (isPersonalized) {
                    // Новый формат с прогресс-данными
                    language = languageData.name;
                    total = languageData.total;
                    completed = languageData.completed;
                    percentage = languageData.percentage;
                } else {
                    // Старый формат для общих данных
                    language = languageData[0];
                    total = languageData[1];
                    completed = 0;
                    percentage = 0;
                }

                const totalBarWidth = total * xScale;
                const completedBarWidth = completed * xScale;

                // Создаем фоновую полосу (общее количество)
                const backgroundBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                backgroundBar.setAttribute('x', margin.left);
                backgroundBar.setAttribute('y', y);
                backgroundBar.setAttribute('width', totalBarWidth);
                backgroundBar.setAttribute('height', barHeight);
                backgroundBar.setAttribute('fill', '#e9ecef');
                backgroundBar.setAttribute('rx', '3');
                backgroundBar.setAttribute('ry', '3');

                // Сначала добавляем фоновую полосу
                svg.appendChild(backgroundBar);

                // Затем добавляем полосу прогресса поверх фона (выполненные проекты)
                if (completed > 0) {
                    const progressBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    progressBar.setAttribute('x', margin.left);
                    progressBar.setAttribute('y', y);
                    progressBar.setAttribute('width', completedBarWidth);
                    progressBar.setAttribute('height', barHeight);
                    progressBar.setAttribute('fill', color);
                    progressBar.setAttribute('rx', '3');
                    progressBar.setAttribute('ry', '3');
                    svg.appendChild(progressBar);
                }

                // Добавляем название языка (с заглавной буквы)
                const capitalizedLanguage = language.charAt(0).toUpperCase() + language.slice(1);
                const languageLabel = this.createLabel(5, y + barHeight / 2, capitalizedLanguage);
                languageLabel.setAttribute('text-anchor', 'start');
                languageLabel.setAttribute('dominant-baseline', 'middle');
                languageLabel.setAttribute('font-size', '12'); // Увеличиваем размер шрифта на 3pt
                languageLabel.setAttribute('font-weight', '500');
                svg.appendChild(languageLabel);

                // Добавляем информацию о прогрессе
                if (isPersonalized) {
                    const progressText = `${completed}/${total}`;
                    const progressLabel = this.createLabel(margin.left + totalBarWidth + 5, y + barHeight / 2, progressText);
                    progressLabel.setAttribute('text-anchor', 'start');
                    progressLabel.setAttribute('dominant-baseline', 'middle');
                    progressLabel.setAttribute('font-size', '9'); // Уменьшаем размер шрифта
                    progressLabel.setAttribute('font-weight', '600');
                    progressLabel.setAttribute('fill', completed > 0 ? color : '#999');
                    svg.appendChild(progressLabel);
                } else {
                    // Для общих данных показываем только общее количество
                    const totalLabel = this.createLabel(margin.left + totalBarWidth + 5, y + barHeight / 2, total.toString());
                    totalLabel.setAttribute('text-anchor', 'start');
                    totalLabel.setAttribute('dominant-baseline', 'middle');
                    totalLabel.setAttribute('font-size', '12');
                    totalLabel.setAttribute('font-weight', '600');
                    svg.appendChild(totalLabel);
                }
            });
        }

        container.innerHTML = '';
        container.appendChild(svg);
    }

    async loadRolesGraph() {
        const container = document.getElementById('roles-graph');
        
        if (!container) {
            return;
        }

        try {
            // Показываем индикатор загрузки
            container.innerHTML = '<div class="loading">Loading roles data...</div>';
            
            // Ждем загрузки данных проектов
            if (!this.projectsData || !this.projectsData.successful) {
                // Если данные еще не загружены, создаем простой график
                this.createSimpleRolesGraph(container);
                return;
            }
            
            console.log('Projects data available:', {
                successful: this.projectsData.successful?.length || 0,
                failed: this.projectsData.failed?.length || 0,
                active: this.projectsData.active?.length || 0
            });

            // Анализируем роли на основе всех проектов (не только успешных)
            // Потому что информация о ролях может быть в любых проектах
            const allProjects = [
                ...this.projectsData.successful,
                ...this.projectsData.failed,
                ...this.projectsData.active
            ];
            const roleAnalysis = this.analyzeRolesFromProgress(allProjects);
            
            // Создаем SVG график с правильными данными
            const svgContent = this.getDynamicRolesSVG(roleAnalysis);
            container.innerHTML = svgContent;
            
            // Добавляем обработчик клика на SVG
            this.addRolesGraphClickHandler(container);
            
        } catch (error) {
            console.error('Error loading roles graph:', error);
            this.createSimpleRolesGraph(container);
        }
    }

    getDynamicRolesSVG(roleAnalysis) {
        const captainCount = roleAnalysis.captain_count;
        const memberCount = roleAnalysis.member_count;
        const total = captainCount + memberCount;
        
        if (total === 0) {
            return `<svg width="100%" height="350" viewBox="0 0 500 400"><text x="250" y="200" text-anchor="middle">No data available</text></svg>`;
        }
        
        const captainPercent = Math.round((captainCount / total) * 100);
        const memberPercent = Math.round((memberCount / total) * 100);
        
        // Вычисляем углы для секторов
        const captainAngle = (captainCount / total) * 360;
        const memberAngle = (memberCount / total) * 360;
        
        return `
        <svg width="80%" height="400" viewBox="0 0 500 450" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="3" dy="3" stdDeviation="4" flood-opacity="0.3"/>
                </filter>
                <linearGradient id="captainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2E7D32;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="memberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#2196F3;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#1565C0;stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <!-- Прозрачный фон -->
            <rect width="500" height="400" fill="transparent"/>
            
            <!-- Заголовок -->
            <text x="250" y="15" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" 
                  font-size="19" font-weight="bold" fill="#2c3e50">
                User: ${this.currentUser ? this.currentUser.login : 'Loading...'}
            </text>
            
            <!-- Круговая диаграмма -->
            <g transform="translate(250, 200)">
                <!-- Внешний круг -->
                <circle cx="0" cy="0" r="110" fill="none" stroke="#e0e0e0" stroke-width="2"/>
                
                <!-- Сектор капитана -->
                <path d="M 0 0 L 100 0 A 100 100 0 ${captainAngle > 180 ? 1 : 0} 1 ${(100 * Math.cos(captainAngle * Math.PI / 180)).toFixed(2)} ${(100 * Math.sin(captainAngle * Math.PI / 180)).toFixed(2)} Z" 
                      fill="url(#captainGradient)" filter="url(#shadow)" 
                      style="cursor: pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"/>
                
                <!-- Сектор участника -->
                <path d="M 0 0 L ${(100 * Math.cos(captainAngle * Math.PI / 180)).toFixed(2)} ${(100 * Math.sin(captainAngle * Math.PI / 180)).toFixed(2)} A 100 100 0 ${memberAngle > 180 ? 1 : 0} 1 100 0 Z" 
                      fill="url(#memberGradient)" filter="url(#shadow)"
                      style="cursor: pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"/>
                
                <!-- Центральный круг -->
                <circle cx="0" cy="0" r="40" fill="white" filter="url(#shadow)"/>
                
                <!-- Текст в центре -->
                <text x="0" y="-5" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" 
                      font-size="14" font-weight="bold" fill="#2c3e50">
                    Total
                </text>
                <text x="0" y="15" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" 
                      font-size="19" font-weight="bold" fill="#2c3e50">
                    ${total}
                </text>
            </g>
            
            <!-- Легенда -->
            <g transform="translate(50, 320)">
                <!-- Captain -->
                <g style="cursor: pointer;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                    <rect x="0" y="0" width="20" height="20" fill="url(#captainGradient)" rx="3" filter="url(#shadow)"/>
                    <text x="30" y="15" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#2c3e50">
                        Captain
                    </text>
                    <text x="30" y="35" font-family="'Segoe UI', Arial, sans-serif" font-size="14" fill="#7f8c8d">
                        ${captainCount} projects (${captainPercent}%)
                    </text>
                </g>
                
                <!-- Member -->
                <g style="cursor: pointer;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                    <rect x="0" y="50" width="20" height="20" fill="url(#memberGradient)" rx="3" filter="url(#shadow)"/>
                    <text x="30" y="65" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#2c3e50">
                        Member
                    </text>
                    <text x="30" y="85" font-family="'Segoe UI', Arial, sans-serif" font-size="14" fill="#7f8c8d">
                        ${memberCount} projects (${memberPercent}%)
                    </text>
                </g>
            </g>
            
        </svg>
        `;
    }

    getEmbeddedRolesSVG() {
        return `
        <svg width="500" height="400" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="3" dy="3" stdDeviation="4" flood-opacity="0.3"/>
                </filter>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
                <linearGradient id="captainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2E7D32;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="memberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#2196F3;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#1565C0;stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <!-- Прозрачный фон -->
            <rect width="500" height="400" fill="transparent"/>
            
            <!-- Заголовок -->
            <text x="250" y="15" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" 
                  font-size="19" font-weight="bold" fill="#2c3e50">
                User: ${this.currentUser ? this.currentUser.login : 'Loading...'}
            </text>
            
            <!-- Круговая диаграмма -->
            <g transform="translate(250, 200)">
                <!-- Внешний круг -->
                <circle cx="0" cy="0" r="110" fill="none" stroke="#e0e0e0" stroke-width="2"/>
                
                <!-- Сектор капитана (19 из 33 = 57.6%) -->
                <path d="M 0 0 L 100 0 A 100 100 0 1 1 -80.9 -58.8 Z" 
                      fill="url(#captainGradient)" filter="url(#shadow)" 
                      style="cursor: pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"/>
                
                <!-- Сектор участника (14 из 33 = 42.4%) -->
                <path d="M 0 0 L -80.9 -58.8 A 100 100 0 0 1 100 0 Z" 
                      fill="url(#memberGradient)" filter="url(#shadow)"
                      style="cursor: pointer;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'"/>
                
                <!-- Центральный круг -->
                <circle cx="0" cy="0" r="40" fill="white" filter="url(#shadow)"/>
                
                <!-- Текст в центре -->
                <text x="0" y="-5" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" 
                      font-size="14" font-weight="bold" fill="#2c3e50">
                    Total
                </text>
                <text x="0" y="15" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" 
                      font-size="19" font-weight="bold" fill="#2c3e50">
                    33
                </text>
            </g>
            
            <!-- Легенда -->
            <g transform="translate(50, 320)">
                <!-- Captain -->
                <g style="cursor: pointer;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                    <rect x="0" y="0" width="20" height="20" fill="url(#captainGradient)" rx="3" filter="url(#shadow)"/>
                    <text x="30" y="15" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#2c3e50">
                        Captain
                    </text>
                    <text x="30" y="35" font-family="'Segoe UI', Arial, sans-serif" font-size="14" fill="#7f8c8d">
                        19 projects (57.6%)
                    </text>
                </g>
                
                <!-- Member -->
                <g style="cursor: pointer;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                    <rect x="0" y="50" width="20" height="20" fill="url(#memberGradient)" rx="3" filter="url(#shadow)"/>
                    <text x="30" y="65" font-family="'Segoe UI', Arial, sans-serif" font-size="16" font-weight="bold" fill="#2c3e50">
                        Member
                    </text>
                    <text x="30" y="85" font-family="'Segoe UI', Arial, sans-serif" font-size="14" fill="#7f8c8d">
                        14 projects (42.4%)
                    </text>
                </g>
            </g>
            
        </svg>
        `;
    }

    addRolesGraphClickHandler(container) {
        const svg = container.querySelector('svg');
        if (svg) {
            svg.style.cursor = 'pointer';
            svg.addEventListener('click', () => {
                this.openRolesModal();
            });
        }
    }

    addLanguagesGraphClickHandler() {
        const container = document.getElementById('languages-graph');
        if (container) {
            const svg = container.querySelector('svg');
            if (svg) {
                svg.style.cursor = 'pointer';
                svg.addEventListener('click', () => {
                    this.openLanguagesModal();
                });
            }
        }
    }

    openLanguagesModal() {
        const modal = document.getElementById('languages-modal');
        if (modal) {
            modal.style.display = 'block';
            this.loadLanguagesData();
            this.setupLanguagesModalEventListeners();
        }
    }

    setupLanguagesModalEventListeners() {
        const modal = document.getElementById('languages-modal');
        const closeBtn = modal.querySelector('.close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    async loadLanguagesData() {
        try {
            // Получаем все проекты AstanaHub с языками
            const allProjects = await this.getAllAstanaHubProjectsWithLanguages();
            
            // Получаем проекты пользователя (успешные)
            const userProjects = await this.getUserSuccessfulProjects();
            
            // Анализируем языки
            const languagesData = this.analyzeLanguagesWithUserProgress(allProjects, userProjects);
            this.populateLanguagesList(languagesData);
        } catch (error) {
            console.error('Error loading languages data:', error);
            this.showErrorInLanguagesModal('Error loading languages data');
        }
    }

    async getAllAstanaHubProjectsWithLanguages() {
        const query = `
            query {
                object(where: {type: {_eq: "project"}, campus: {_eq: "astanahub"}}) {
                    id
                    name
                    type
                    attrs
                    createdAt
                }
            }
        `;

        const data = await this.makeGraphQLQuery(query);
        return data.object || [];
    }

    async getUserSuccessfulProjects() {
        // Используем тот же источник данных, что и блок "Successful Projects"
        if (!this.projectsData || !this.projectsData.successful) {
            await this.loadProgressData();
        }
        
        if (!this.projectsData || !this.projectsData.successful) {
            return [];
        }
        
        const successfulProjects = this.projectsData.successful;
        
        // Преобразуем в нужный формат
        const projects = successfulProjects.map(project => ({
            id: project.object.id,
            name: project.object.name,
            objectId: project.objectId,
            grade: project.grade
        }));
        
        return projects;
    }

    analyzeLanguagesWithUserProgress(allProjects, userProjects) {
        const languageProjects = {};
        const userProjectIds = new Set(userProjects.map(p => p.id));
        const userProjectNames = new Set(userProjects.map(p => p.name));
        
        // Анализ проектов пользователя
        
        allProjects.forEach(project => {
            if (project.attrs) {
                try {
                    const attrs = typeof project.attrs === 'string' 
                        ? JSON.parse(project.attrs) 
                        : project.attrs;
                    
                    const projectName = project.name;
                    const isUserCompletedById = userProjectIds.has(project.id);
                    const isUserCompletedByName = userProjectNames.has(projectName);
                    const isUserCompleted = isUserCompletedById || isUserCompletedByName;
                    
                    // Определяем языки проекта
                    let languages = [];
                    
                    if (attrs.language) {
                        // Если язык указан как строка
                        if (typeof attrs.language === 'string') {
                            languages = [attrs.language];
                        } else if (Array.isArray(attrs.language)) {
                            // Если языки указаны как массив
                            languages = attrs.language;
                        }
                    } else {
                        // Если язык не указан, добавляем в категорию "Others"
                        languages = ['Others'];
                    }
                    
                    // Добавляем проект в каждую категорию языка
                    languages.forEach(language => {
                        if (!languageProjects[language]) {
                            languageProjects[language] = [];
                        }
                        
                        // Проверяем, есть ли уже этот проект в списке
                        const existingProject = languageProjects[language].find(p => p.name === projectName);
                        if (existingProject) {
                            // Обновляем статус завершения
                            existingProject.completed = existingProject.completed || isUserCompleted;
                        } else {
                            // Добавляем новый проект
                            languageProjects[language].push({
                                name: projectName,
                                completed: isUserCompleted
                            });
                        }
                    });
                } catch (e) {
                    // Error parsing project attrs - добавляем в Others
                    if (!languageProjects['Others']) {
                        languageProjects['Others'] = [];
                    }
                    languageProjects['Others'].push({
                        name: project.name,
                        completed: userProjectIds.has(project.id)
                    });
                }
            }
        });

        return languageProjects;
    }

    populateLanguagesList(languagesData) {
        const container = document.getElementById('languages-list');
        if (!container) return;

        if (Object.keys(languagesData).length === 0) {
            container.innerHTML = '<p>No languages data available</p>';
            return;
        }

        // Сортируем языки по количеству завершенных проектов
        const sortedLanguages = Object.entries(languagesData).sort((a, b) => {
            const aCompleted = a[1].filter(p => p.completed).length;
            const bCompleted = b[1].filter(p => p.completed).length;
            return bCompleted - aCompleted;
        });

        container.innerHTML = sortedLanguages.map(([language, projects]) => {
            const completedCount = projects.filter(p => p.completed).length;
            const totalCount = projects.length;
            
            return `
                <div class="language-item">
                    <div class="language-name">
                        ${language} 
                        <span class="language-stats">(${completedCount}/${totalCount} completed)</span>
                    </div>
                    <div class="language-projects">
                        ${projects.map(project => `
                            <div class="language-project ${project.completed ? 'completed' : 'not-completed'}">
                                ${project.completed ? '✅' : '⭕'} ${project.name}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    showErrorInLanguagesModal(message) {
        const container = document.getElementById('languages-list');
        if (container) {
            container.innerHTML = `<p style="color: #e74c3c; text-align: center;">${message}</p>`;
        }
    }

    createSimpleRolesGraph(container) {
        // Показываем сообщение о загрузке вместо статических данных
        container.innerHTML = '<div class="loading">Loading roles data...</div>';
    }

    async openRolesModal() {
        const modal = document.getElementById('roles-modal');
        if (!modal) return;

        // Показываем модальное окно
        modal.style.display = 'block';
        
        // Загружаем данные о проектах
        await this.loadProjectsData();
        
        // Настраиваем обработчики событий
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        const modal = document.getElementById('roles-modal');
        const closeBtn = modal.querySelector('.close');
        const tabButtons = modal.querySelectorAll('.tab-button');

        // Закрытие модального окна
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Закрытие при клике вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Переключение табов
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Убираем активный класс со всех кнопок и панелей
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        // Добавляем активный класс к выбранной кнопке и панели
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async loadProjectsData() {
        try {
            // Используем данные из this.projectsData.successful (как в блоке Successful Projects)
            if (!this.projectsData || !this.projectsData.successful) {
                throw new Error('No successful projects data available');
            }

            // Анализируем роли на основе всех проектов (не только успешных)
            const allProjects = [
                ...this.projectsData.successful,
                ...this.projectsData.failed,
                ...this.projectsData.active
            ];
            
            // Анализируем роли на основе данных из progress таблицы
            const roleAnalysis = this.analyzeRolesFromProgress(allProjects);
            
            // Обновляем заголовки табов с актуальными данными
            this.updateTabHeaders(roleAnalysis);
            
            // Заполняем списки проектов
            this.populateProjectsList('captain', roleAnalysis.captainProjects);
            this.populateProjectsList('member', roleAnalysis.memberProjects);
            
        } catch (error) {
            console.error('Error loading projects data:', error);
            this.showErrorInModal('Error loading project data');
        }
    }

    analyzeRolesFromProgress(projects) {
        // Анализируем реальные данные проектов
        let captainCount = 0;
        let memberCount = 0;
        const captainProjects = [];
        const memberProjects = [];
        const processedProjects = new Set(); // Для отслеживания уже обработанных проектов
        
        console.log('Analyzing roles for projects:', projects.length);
        
        projects.forEach((project, index) => {
            // Пропускаем дублирующиеся проекты
            const projectName = project.object.name;
            if (processedProjects.has(projectName)) {
                console.log(`  Skipping duplicate project: ${projectName}`);
                return;
            }
            processedProjects.add(projectName);
            // Проверяем роль пользователя в проекте
            const group = project.group;
            const currentUserLogin = this.currentUser?.login;
            
            console.log(`Project ${index + 1}: ${project.object.name}`, {
                group: group,
                hasGroup: !!group,
                groupKeys: group ? Object.keys(group) : [],
                captainId: group?.captain?.id,
                membersIds: group?.members?.map(m => m.id) || [],
                currentUserId: this.userId,
                currentUserLogin: currentUserLogin
            });
            
            if (group && this.userId) {
                console.log(`  Checking roles for ${project.object.name}:`, {
                    captainId: group.captain?.id,
                    captainIdType: typeof group.captain?.id,
                    currentUserId: this.userId,
                    currentUserIdType: typeof this.userId,
                    captainMatch: group.captain?.id === this.userId,
                    captainStrictMatch: group.captain?.id == this.userId
                });
                
                // Проверяем, является ли пользователь капитаном
                if (group.captain && group.captain.id == this.userId) {
                    captainCount++;
                    captainProjects.push({
                        name: project.object.name,
                        grade: project.grade,
                        role: 'captain'
                    });
                    console.log(`  -> Captain: ${project.object.name}`);
                } 
                // Проверяем, является ли пользователь участником (но не капитаном)
                else if (group.members && group.members.some(member => member.id == this.userId)) {
                    memberCount++;
                    memberProjects.push({
                        name: project.object.name,
                        grade: project.grade,
                        role: 'member'
                    });
                    console.log(`  -> Member: ${project.object.name}`);
                }
                // Если пользователь не найден ни в капитанах, ни в участниках
                else {
                    memberCount++;
                    memberProjects.push({
                        name: project.object.name,
                        grade: project.grade,
                        role: 'member'
                    });
                    console.log(`  -> Member (not in group data): ${project.object.name}`);
                }
            } else {
                // Если нет информации о группе или пользователе, считаем участником
                memberCount++;
                memberProjects.push({
                    name: project.object.name,
                    grade: project.grade,
                    role: 'member'
                });
                console.log(`  -> Member (no group/user data): ${project.object.name}`);
            }
        });
        
        console.log('Final role analysis:', {
            captain_count: captainCount,
            member_count: memberCount,
            total_projects: captainCount + memberCount,
            unique_projects_processed: processedProjects.size,
            total_projects_before_dedup: projects.length
        });
        
        return {
            captain_count: captainCount,
            member_count: memberCount,
            total_projects: captainCount + memberCount,
            captainProjects: captainProjects,
            memberProjects: memberProjects
        };
    }

    getEmbeddedRolesData() {
        return {
            "user_id": this.userId || 2058,
            "username": this.currentUser ? this.currentUser.login : "mshaimard",
            "analysis_date": "2025-09-19T11:00:29.300178",
            "stats": {
                "captain_count": 20,
                "member_count": 15,
                "total_projects": 35
            },
            "projects": [
                {
                    "name": "Typing In Progress",
                    "grade": null,
                    "role": "captain"
                },
                {
                    "name": "Real Time Forum",
                    "grade": 1.0,
                    "role": "captain"
                },
                {
                    "name": "Different Maps",
                    "grade": 1.0,
                    "role": "member"
                },
                {
                    "name": "History",
                    "grade": 1.0,
                    "role": "member"
                },
                {
                    "name": "Score Handling",
                    "grade": 1.0,
                    "role": "member"
                },
                {
                    "name": "Make Your Game",
                    "grade": 1,
                    "role": "member"
                },
                {
                    "name": "Image Upload",
                    "grade": null,
                    "role": "member"
                },
                {
                    "name": "Clonernews",
                    "grade": 0,
                    "role": "captain"
                },
                {
                    "name": "Sortable",
                    "grade": 1,
                    "role": "member"
                },
                {
                    "name": "Crossword",
                    "grade": 1,
                    "role": "captain"
                },
                {
                    "name": "Forum",
                    "grade": 1,
                    "role": "captain"
                },
                {
                    "name": "Lem In",
                    "grade": null,
                    "role": "captain"
                },
                {
                    "name": "Guess It 2",
                    "grade": null,
                    "role": "captain"
                },
                {
                    "name": "Linear Stats",
                    "grade": 1.0,
                    "role": "captain"
                },
                {
                    "name": "Guess It 1",
                    "grade": 1.25,
                    "role": "captain"
                },
                {
                    "name": "Color",
                    "grade": null,
                    "role": "member"
                },
                {
                    "name": "Math Skills",
                    "grade": 1.25,
                    "role": "captain"
                },
                {
                    "name": "Net Cat",
                    "grade": 1.0,
                    "role": "captain"
                },
                {
                    "name": "Visualizations",
                    "grade": 1.0,
                    "role": "captain"
                },
                {
                    "name": "Geolocalization",
                    "grade": 1.67,
                    "role": "captain"
                },
                {
                    "name": "Filters",
                    "grade": 1.0,
                    "role": "captain"
                },
                {
                    "name": "Search Bar",
                    "grade": null,
                    "role": "captain"
                },
                {
                    "name": "Groupie Tracker",
                    "grade": null,
                    "role": "captain"
                },
                {
                    "name": "Output",
                    "grade": 1.31,
                    "role": "member"
                },
                {
                    "name": "Exportfile",
                    "grade": null,
                    "role": "captain"
                },
                {
                    "name": "Dockerize",
                    "grade": null,
                    "role": "captain"
                },
                {
                    "name": "Stylize",
                    "grade": null,
                    "role": "captain"
                },
                {
                    "name": "Ascii Art Web",
                    "grade": 1.67,
                    "role": "member"
                },
                {
                    "name": "Fs",
                    "grade": null,
                    "role": "member"
                },
                {
                    "name": "Justify",
                    "grade": null,
                    "role": "member"
                },
                {
                    "name": "Ascii Art",
                    "grade": null,
                    "role": "member"
                },
                {
                    "name": "Go Reloaded",
                    "grade": null,
                    "role": "captain"
                },
                {
                    "name": "Quadchecker",
                    "grade": 0,
                    "role": "member"
                },
                {
                    "name": "Sudoku",
                    "grade": 0,
                    "role": "member"
                },
                {
                    "name": "Quad",
                    "grade": 1,
                    "role": "member"
                }
            ]
        };
    }

    getEmbeddedProjectsData() {
        const username = this.currentUser ? this.currentUser.login : "mshaimard";
        return {
            [username]: {
                "captain_count": 19,
                "member_count": 14,
                "total_projects": 33,
                "projects": [
                    {
                        "id": 2696,
                        "role": "captain",
                        "path": "/astanahub/module/typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2298,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2246,
                        "role": "member",
                        "path": "/astanahub/module/different-maps",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2247,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2248,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2249,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2250,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2251,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2252,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2253,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2254,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2255,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2256,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2257,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2258,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2259,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2260,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2261,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2262,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2263,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2264,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2265,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2266,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2267,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2268,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2269,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2270,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2271,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2272,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2273,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2274,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2275,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2276,
                        "role": "member",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    },
                    {
                        "id": 2277,
                        "role": "captain",
                        "path": "/astanahub/module/real-time-forum-typing-in-progress",
                        "status": "finished",
                        "grade": 1.0
                    }
                ]
            }
        };
    }

    updateTabHeaders(data) {
        const captainTab = document.querySelector('[data-tab="captain"]');
        const memberTab = document.querySelector('[data-tab="member"]');
        
        if (captainTab) {
            captainTab.textContent = `Captain (${data.captain_count} projects)`;
        }
        if (memberTab) {
            memberTab.textContent = `Member (${data.member_count} projects)`;
        }
    }

    populateProjectsList(role, projects) {
        const container = document.getElementById(`${role}-projects`);
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = '<p>No projects to display</p>';
            return;
        }

        // Populate projects data
        
        container.innerHTML = projects.map(project => {
            return `
                <div class="project-item">
                    <div class="project-name">${project.name}</div>
                    <div class="project-role">${role === 'captain' ? 'Captain' : 'Member'}</div>
                </div>
            `;
        }).join('');
    }

    extractProjectName(path) {
        if (!path) return 'Unknown Project';
        
        // Extract project name from path
        const parts = path.split('/');
        const lastPart = parts[parts.length - 1];
        
        // Convert kebab-case to readable format
        const projectName = lastPart
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        // Extract project name from path
        
        return projectName;
    }

    showErrorInModal(message) {
        const captainContainer = document.getElementById('captain-projects');
        const memberContainer = document.getElementById('member-projects');
        
        if (captainContainer) {
            captainContainer.innerHTML = `<p style="color: #dc3545; text-align: center;">${message}</p>`;
        }
        if (memberContainer) {
            memberContainer.innerHTML = `<p style="color: #dc3545; text-align: center;">${message}</p>`;
        }
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
