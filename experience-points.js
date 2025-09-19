// Experience Points Module
class ExperiencePointsModule {
    constructor(app) {
        this.app = app;
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

        const data = await this.app.makeGraphQLQuery(query);
        
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
}
