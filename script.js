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
                console.log('Restored userId from localStorage:', this.userId);
            } else {
                // Parse JWT to get userId if not in localStorage
                const payload = this.parseJWT(this.jwt);
                this.userId = payload.sub || payload.id;
                localStorage.setItem('userId', this.userId);
                console.log('Extracted userId from JWT:', this.userId);
            }
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

        // More Info button
        document.getElementById('more-info-btn').addEventListener('click', () => {
            this.handleMoreInfo();
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
            
            // Debug: log the payload and userId
            console.log('JWT payload:', payload);
            console.log('Extracted userId:', this.userId);
            
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
                    <span class="level-details">
                        ${user.level?.completedProjects || 0} projects completed
                        ${user.level?.averageGrade ? `(avg: ${user.level.averageGrade})` : ''}
                        ${user.level?.levelDate ? `<br><small>Updated: ${formatDate(user.level.levelDate)}</small>` : ''}
                    </span>
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
            console.log('XP Transactions loaded:', data.transaction);
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
        
        // Debug logging (simplified)
        console.log(`XP Data loaded: ${transactions.length} transactions, Total: ${totalXP.toLocaleString()} XP`);
        console.log(`Piscine Go: ${piscineGoXP.toLocaleString()} XP, Piscine JS: ${piscineJSXP.toLocaleString()} XP, Core Education: ${coreEducationXP.toLocaleString()} XP, Other: ${otherXP.toLocaleString()} XP`);
        
        // Store transactions for activity display
        this.allTransactions = transactions;
        
        // Check for any unusual values (negative or very large amounts)
        const negativeAmounts = transactions.filter(t => t.amount < 0);
        const veryLargeAmounts = transactions.filter(t => t.amount > 10000);
        
        if (negativeAmounts.length > 0) {
            console.log(`Warning: ${negativeAmounts.length} negative XP transactions found`);
        }
        if (veryLargeAmounts.length > 0) {
            console.log(`Info: ${veryLargeAmounts.length} large XP transactions (>10k) found`);
        }
        

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
        console.log('Starting loadProgressData...');
        try {
            // Check if userId is available
            if (!this.userId) {
                console.log('No userId available for progress data, showing basic data...');
                await this.showBasicProgressData();
                return;
            }
            
            console.log('userId available:', this.userId);

            // Load progress and result data
            const progressQuery = `
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


            // Load group participation data - only if userId exists
            const groupQuery = `
                query {
                    group_user(where: {userId: {_eq: ${this.userId}}}) {
                        id
                        createdAt
                        group {
                            id
                            status
                        }
                    }
                }
            `;

            // Load event participation data - only if userId exists
            const eventQuery = `
                query {
                    event_user(where: {userId: {_eq: ${this.userId}}}) {
                        id
                        createdAt
                        event {
                            id
                        }
                    }
                }
            `;

            // Execute queries - start with progress/result data
            console.log('Executing progress query...');
            const progressData = await this.makeGraphQLQuery(progressQuery);
            console.log('Progress data received:', progressData);
            
            // Execute user-specific queries only if userId is valid
            let groupData = { group_user: [] };
            let eventData = { event_user: [] };

            try {
                console.log('Executing user-specific queries...');
                [groupData, eventData] = await Promise.all([
                    this.makeGraphQLQuery(groupQuery),
                    this.makeGraphQLQuery(eventQuery)
                ]);
                console.log('User-specific data received');
            } catch (userDataError) {
                console.log('Error loading user-specific data, using empty arrays:', userDataError);
            }
            
            if (progressData.progress && progressData.result) {
                console.log('Displaying progress data...');
                this.displayProgressData(
                    progressData.progress, 
                    progressData.result,
                    groupData.group_user || [],
                    eventData.event_user || []
                );
            } else {
                console.log('No progress data received, showing basic data');
                this.showBasicProgressData();
            }
        } catch (error) {
            console.error('Error loading progress data:', error);
            // Display basic progress data even if there's an error
            try {
                const basicQuery = `
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
                const basicData = await this.makeGraphQLQuery(basicQuery);
                if (basicData.progress && basicData.result) {
                    this.displayProgressData(
                        basicData.progress, 
                        basicData.result,
                        [], [], []
                    );
                }
            } catch (fallbackError) {
                console.error('Fallback query also failed:', fallbackError);
            }
        }
    }

    async showBasicProgressData() {
        console.log('Showing basic progress data as fallback');
        const progressDetails = document.getElementById('progress-details');
        
        if (progressDetails) {
            progressDetails.innerHTML = `
                <div class="info-item">
                    <h3>Loading Progress Data...</h3>
                    <div class="value">Please wait</div>
                </div>
                <div class="info-item">
                    <h3>Status</h3>
                    <div class="value">Connecting to server</div>
                </div>
            `;
            
            // Try to load basic progress data without user-specific queries
            try {
                const basicQuery = `
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
                
                console.log('Attempting basic progress query...');
                const basicData = await this.makeGraphQLQuery(basicQuery);
                
                if (basicData.progress && basicData.result) {
                    console.log('Basic progress data loaded successfully');
                    this.displayProgressData(
                        basicData.progress, 
                        basicData.result,
                        [], [], []
                    );
                }
            } catch (basicError) {
                console.error('Basic progress query also failed:', basicError);
                progressDetails.innerHTML = `
                    <div class="info-item">
                        <h3>Unable to Load Progress Data</h3>
                        <div class="value">Please try refreshing the page</div>
                    </div>
                    <div class="info-item">
                        <h3>Status</h3>
                        <div class="value">Connection error</div>
                    </div>
                `;
            }
        }
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
        
        console.log('Progress data HTML updated successfully');
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

        console.log('GraphQL query successful, received', data.data.result.length, 'results');
        
        return data.data.result;
    }

    displayAdditionalInfo(results) {
        const additionalInfo = document.getElementById('additional-info');
        
        // Debug: log basic info
        console.log('Searching through', results.length, 'results for personal data...');
        
        // Find the first result with personal data in attrs
        let userAttrs = null;
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.attrs && Object.keys(result.attrs).length > 0) {
                // Check if this attrs contains personal information
                const attrs = result.attrs;
                if (attrs.phone || attrs.email || attrs.gender || attrs.firstName || attrs.lastName || 
                    attrs.dateOfBirth || attrs.addressCity || attrs.addressStreet) {
                    console.log(`Found personal data in result ${i}:`, attrs);
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
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TomorrowSchoolApp();
});
