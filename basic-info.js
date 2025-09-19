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
