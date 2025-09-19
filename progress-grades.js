// Progress & Grades Module
class ProgressGradesModule {
    constructor(app) {
        this.app = app;
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

            const projectsData = await this.app.makeGraphQLQuery(projectsQuery);
            
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

            const allProjectsData = await this.app.makeGraphQLQuery(allProjectsQuery);
            
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

            const checkpointData = await this.app.makeGraphQLQuery(checkpointQuery);
            
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
                        <span class="project-name">${name} (${attemptsCount} attempt${attemptsCount > 1 ? 's' : ''})</span>
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
}
