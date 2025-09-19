// Basic Information Module
class BasicInfoModule {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // More Info button
        document.getElementById('more-info-btn').addEventListener('click', () => {
            this.handleMoreInfo();
        });

        // Records button
        document.getElementById('records-btn').addEventListener('click', () => {
            this.handleRecords();
        });
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
            this.app.showError('Failed to load additional information');
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

        const response = await fetch(this.app.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.app.jwt}`,
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

    async loadUserData() {
        try {
            // Load user basic info
            await this.loadUserInfo();
            
            // Load XP data
            await this.app.experiencePointsModule.loadXPData();
            
            // Load progress data
            try {
                await this.app.progressGradesModule.loadProgressData();
            } catch (progressError) {
                console.error('Error loading progress data:', progressError);
                // Show basic progress data even if loading fails
                await this.app.progressGradesModule.showBasicProgressData();
            }
            
            // Load checkpoint zero data
            try {
                await this.app.progressGradesModule.loadCheckpointZeroData();
            } catch (checkpointError) {
                console.error('Error loading checkpoint zero data:', checkpointError);
            }
            
            // Setup progress button event listeners
            this.app.progressGradesModule.setupProgressButtons();
            
            
            
            // Load statistics and create graphs
            await this.app.statisticsAnalyticsModule.loadStatistics();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.app.showError('Failed to load user data. Please try logging in again.');
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

        const data = await this.app.makeGraphQLQuery(query);
        
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

            const levelData = await this.app.makeGraphQLQuery(levelQuery);
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

            const resultsData = await this.app.makeGraphQLQuery(resultsQuery);
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
            this.app.showError('Failed to load records data');
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

        const response = await fetch(this.app.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.app.jwt}`,
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
