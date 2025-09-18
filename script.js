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

        // More Info button
        document.getElementById('more-info-btn').addEventListener('click', () => {
            this.handleMoreInfo();
        });

        // Records button
        document.getElementById('records-btn').addEventListener('click', () => {
            this.handleRecords();
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
            await this.loadXPData();
            
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
            console.log('Error calculating user level:', error);
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
            console.log('Could not parse profile data:', e);
        }
        
        try {
            if (user.attrs) {
                attrsData = typeof user.attrs === 'string' ? JSON.parse(user.attrs) : user.attrs;
            }
        } catch (e) {
            console.log('Could not parse attrs data:', e);
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

    async loadXPData() {
        const query = `
            query {
                transaction(where: {type: {_eq: "xp"}}, order_by: {createdAt: desc}) {
                    id
                    amount
                    createdAt
                    path
                    objectId
                    attrs
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
        
        // Categorize XP by path
        const piscineGoXP = transactions
            .filter(t => t.path && t.path.startsWith('/astanahub/piscinego/'))
            .reduce((sum, t) => sum + t.amount, 0);
            
        const piscineJSXP = transactions
            .filter(t => t.path && t.path.startsWith('/astanahub/module/piscine-js/'))
            .reduce((sum, t) => sum + t.amount, 0);
            
        const coreEducationXP = transactions
            .filter(t => t.path && t.path.startsWith('/astanahub/module/') && !t.path.startsWith('/astanahub/module/piscine-js/'))
            .reduce((sum, t) => sum + t.amount, 0);
            
        const otherXP = transactions
            .filter(t => !t.path || (!t.path.startsWith('/astanahub/piscinego/') && !t.path.startsWith('/astanahub/module/')))
            .reduce((sum, t) => sum + t.amount, 0);
        
        // Calculate additional statistics
        const today = new Date();
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // XP earned this week
        const weeklyXP = transactions
            .filter(t => new Date(t.createdAt) >= thisWeek)
            .reduce((sum, t) => sum + t.amount, 0);
        
        // XP earned this month
        const monthlyXP = transactions
            .filter(t => new Date(t.createdAt) >= thisMonth)
            .reduce((sum, t) => sum + t.amount, 0);
        
        // Recent activity (last 5 transactions)
        const recentTransactions = transactions.slice(0, 5);
        
        // Store transactions for activity display
        this.allTransactions = transactions;
        

        xpDetails.innerHTML = `
            <div class="info-item total-xp">
                <h3>Total XP</h3>
                <div class="value">${totalXP.toLocaleString()}</div>
            </div>
            
            <div class="info-item xp-category">
                <h3>Piscine Go</h3>
                <div class="value">${piscineGoXP.toLocaleString()}</div>
            </div>
            
            <div class="info-item xp-category">
                <h3>Piscine JS</h3>
                <div class="value">${piscineJSXP.toLocaleString()}</div>
            </div>
            
            <div class="info-item xp-category">
                <h3>Core Education</h3>
                <div class="value">${coreEducationXP.toLocaleString()}</div>
            </div>
            
            <div class="info-item xp-category">
                <h3>Other</h3>
                <div class="value">${otherXP.toLocaleString()}</div>
            </div>
            
            <div class="info-item activity-section">
                <h3>All Activity</h3>
                <div id="activity-container" class="activity-container">
                    <div id="activity-list" class="activity-list"></div>
                    <div id="activity-controls" class="activity-controls">
                        <button id="load-more-btn" class="load-more-btn" style="display: none;">
                            Load More
                        </button>
                        <div id="loading-more" class="loading-more" style="display: none;">
                            Loading more activities...
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize activity display after DOM is updated
        setTimeout(() => {
            this.initializeActivityDisplay();
        }, 100);
    }

    initializeActivityDisplay() {
        if (!this.allTransactions) return;
        
        // Initialize pagination variables
        this.currentPage = 0;
        this.itemsPerPage = 7;
        this.isLoading = false;
        this.hasMoreData = true;
        
        // Initialize activity display
        this.displayActivityPage();
        
        // Setup load more button
        this.setupLoadMoreButton();
    }
    
    setupLoadMoreButton() {
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (!loadMoreBtn) return;
        
        loadMoreBtn.addEventListener('click', () => {
            this.loadMoreActivities();
        });
    }
    
    displayActivityPage() {
        const activityList = document.getElementById('activity-list');
        if (!activityList || !this.allTransactions) return;
        
        // Calculate range for current page
        const startIndex = this.currentPage * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageTransactions = this.allTransactions.slice(startIndex, endIndex);
        
        // Check if there's more data
        this.hasMoreData = endIndex < this.allTransactions.length;
        
        if (this.currentPage === 0) {
            // First page - replace content
            activityList.innerHTML = '';
        }
        
        // Add new activities to the list
        pageTransactions.forEach(transaction => {
            const activityItem = this.createActivityItem(transaction);
            activityList.appendChild(activityItem);
        });
        
        // Show/hide load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        const loadingMore = document.getElementById('loading-more');
        
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.hasMoreData ? 'block' : 'none';
        }
        
        if (loadingMore) {
            loadingMore.style.display = 'none';
        }
    }
    
    createActivityItem(transaction) {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        const date = new Date(transaction.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const pathDisplay = transaction.path ? transaction.path.split('/').pop() : 'Unknown';
        
        item.innerHTML = `
            <span class="xp-amount">+${transaction.amount} XP</span>
            <span class="xp-path">${pathDisplay}</span>
            <span class="xp-date">${formattedDate}</span>
        `;
        
        return item;
    }
    
    async loadMoreActivities() {
        if (this.isLoading || !this.hasMoreData) return;
        
        this.isLoading = true;
        const loadMoreBtn = document.getElementById('load-more-btn');
        const loadingMore = document.getElementById('loading-more');
        
        // Hide button and show loading
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
        if (loadingMore) {
            loadingMore.style.display = 'block';
        }
        
        // Simulate loading delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        this.currentPage++;
        this.displayActivityPage();
        
        this.isLoading = false;
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
                        console.log('Error parsing project attrs:', e);
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
        console.log('displayProgressData called with:', {
            progress: progress?.length || 0,
            results: results?.length || 0,
            groupMemberships: groupMemberships?.length || 0,
            eventParticipations: eventParticipations?.length || 0
        });
        
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
        console.log('Found progress details element:', !!progressDetails);
        
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
            // Получаем общие данные о языках программирования
            const generalData = await this.getGeneralLanguagesData();
            
            // Получаем проекты пользователя с информацией о языках
            const userProjects = await this.getUserProjectsWithLanguages();
            
            if (userProjects && userProjects.length > 0) {
                // Анализируем языки программирования пользователя
                const userLanguageStats = this.analyzeUserLanguages(userProjects);
                
                // Создаем прогресс-данные, сравнивая с общими данными
                const progressData = this.createLanguageProgressData(generalData.languages, userLanguageStats);
                
                return {
                    total_projects: userProjects.length,
                    languages: progressData,
                    isPersonalized: true
                };
            } else {
                // Если нет данных пользователя, используем общую статистику
                return generalData;
            }
        } catch (error) {
            console.error('Error loading user languages data:', error);
            // Возвращаем общую статистику в случае ошибки
            return await this.getGeneralLanguagesData();
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
                    console.log('Error parsing project attrs:', e);
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
        const width = 400;
        const height = 350;
        const margin = { top: 50, right: 30, bottom: 40, left: 120 };
        const barHeight = 22;
        const barSpacing = 8;

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

        // Определяем заголовок в зависимости от типа данных
        const isPersonalized = languagesData.isPersonalized;
        const titleText = isPersonalized 
            ? `Your Programming Languages Progress`
            : `Top ${topLanguages.length} Programming Languages`;

        // Добавляем заголовок
        const title = this.createLabel(width / 2, 20, titleText);
        title.setAttribute('font-size', '14');
        title.setAttribute('font-weight', '600');
        title.setAttribute('fill', isPersonalized ? '#667eea' : '#333');
        svg.appendChild(title);

        // Добавляем подзаголовок для персонализированных данных
        if (isPersonalized) {
            const subtitle = this.createLabel(width / 2, 35, 'Completed projects vs Total available');
            subtitle.setAttribute('font-size', '10');
            subtitle.setAttribute('font-weight', '400');
            subtitle.setAttribute('fill', '#666');
            svg.appendChild(subtitle);
        }

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
                    language = languageData.language;
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

                // Создаем полосу прогресса (выполненные проекты)
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

                svg.appendChild(backgroundBar);

                // Добавляем название языка
                const languageLabel = this.createLabel(margin.left - 10, y + barHeight / 2, language);
                languageLabel.setAttribute('text-anchor', 'end');
                languageLabel.setAttribute('dominant-baseline', 'middle');
                languageLabel.setAttribute('font-size', '11');
                languageLabel.setAttribute('font-weight', '500');
                svg.appendChild(languageLabel);

                // Добавляем информацию о прогрессе
                if (isPersonalized) {
                    const progressText = `${completed}/${total} (${percentage}%)`;
                    const progressLabel = this.createLabel(margin.left + totalBarWidth + 5, y + barHeight / 2, progressText);
                    progressLabel.setAttribute('text-anchor', 'start');
                    progressLabel.setAttribute('dominant-baseline', 'middle');
                    progressLabel.setAttribute('font-size', '10');
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

    async handleMoreInfo() {
        const button = document.getElementById('more-info-btn');
        const additionalInfo = document.getElementById('additional-info');
        
        // Check current state
        const isCurrentlyVisible = additionalInfo.style.display !== 'none';
        
        if (isCurrentlyVisible) {
            // Hide the info
            additionalInfo.style.display = 'none';
            button.textContent = 'More Info';
            return;
        }
        
        // Show loading state
        const originalText = button.textContent;
        button.textContent = 'Loading...';
        button.disabled = true;
        
        try {
            const userData = await this.loadUserAdditionalInfo();
            this.displayAdditionalInfo(userData);
            
            // Show the info
            additionalInfo.style.display = 'block';
            button.textContent = 'Hide Info';
        } catch (error) {
            console.error('Error loading additional info:', error);
            this.showError('Failed to load additional information');
            button.textContent = originalText;
        } finally {
            button.disabled = false;
        }
    }

    async loadUserAdditionalInfo() {
        const query = `
            query {
                result(order_by: {createdAt: desc}) {
                    attrs
                }
            }
        `;

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.errors) {
            throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
        }

        
        return data.data.result;
    }

    displayAdditionalInfo(results) {
        const additionalInfo = document.getElementById('additional-info');
        
        
        // Find the first result with personal data in attrs
        let userAttrs = null;
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.attrs && Object.keys(result.attrs).length > 0) {
                // Check if this attrs contains personal information
                const attrs = result.attrs;
                if (attrs.phone || attrs.email || attrs.gender || attrs.firstName || attrs.lastName || 
                    attrs.dateOfBirth || attrs.addressCity || attrs.addressStreet) {
                    userAttrs = attrs;
                    break;
                }
            }
        }

        if (!userAttrs) {
            additionalInfo.innerHTML = `
                <h3>Additional Information</h3>
                <p style="color: #6c757d; font-style: italic;">No additional information available</p>
            `;
            return;
        }

        // Extract the required fields from attrs
        const fields = {
            'First Name': userAttrs.firstName || 'Not provided',
            'Last Name': userAttrs.lastName || 'Not provided',
            'Phone': userAttrs.phone || 'Not provided',
            'Email': userAttrs.email || 'Not provided',
            'Gender': userAttrs.gender || 'Not provided',
            'Date of Birth': userAttrs.dateOfBirth ? new Date(userAttrs.dateOfBirth).toLocaleDateString() : 'Not provided',
            'City': userAttrs.addressCity || 'Not provided',
            'Street': userAttrs.addressStreet || 'Not provided'
        };

        // Create HTML for additional info
        let html = '<h3>Additional Information</h3>';
        for (const [label, value] of Object.entries(fields)) {
            html += `
                <div class="info-item">
                    <span class="info-label">${label}:</span>
                    <span class="info-value">${value}</span>
                </div>
            `;
        }

        additionalInfo.innerHTML = html;
    }

    async handleRecords() {
        const button = document.getElementById('records-btn');
        const recordsInfo = document.getElementById('records-info');
        
        // Check current state
        const isCurrentlyVisible = recordsInfo.style.display !== 'none';
        
        if (isCurrentlyVisible) {
            // Hide the records
            recordsInfo.style.display = 'none';
            button.textContent = 'Records';
            return;
        }
        
        // Show loading state
        const originalText = button.textContent;
        button.textContent = 'Loading...';
        button.disabled = true;
        
        try {
            const recordsData = await this.loadRecordsData();
            this.displayRecordsData(recordsData);
            
            // Show the records
            recordsInfo.style.display = 'block';
            button.textContent = 'Hide Records';
        } catch (error) {
            console.error('Error loading records data:', error);
            this.showError('Failed to load records data');
            button.textContent = originalText;
        } finally {
            button.disabled = false;
        }
    }

    async loadRecordsData() {
        const query = `
            query {
                record(order_by: {createdAt: desc}) {
                    message
                    createdAt
                }
            }
        `;

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.jwt}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.errors) {
            throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
        }

        
        return data.data.record;
    }

    displayRecordsData(records) {
        const recordsInfo = document.getElementById('records-info');
        
        if (!records || records.length === 0) {
            recordsInfo.innerHTML = `
                <h3>Records</h3>
                <p style="color: #6c757d; font-style: italic;">No records available</p>
            `;
            return;
        }

        // Create HTML for records
        let html = '<h3>Records</h3>';
        
        records.forEach(record => {
            const date = new Date(record.createdAt).toLocaleDateString();
            const message = record.message || 'No message';
            
            html += `
                <div class="record-item">
                    <span class="record-date">${date}</span>
                    <span class="record-message">${message}</span>
                </div>
            `;
        });

        recordsInfo.innerHTML = html;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TomorrowSchoolApp();
});
