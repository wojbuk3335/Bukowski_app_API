// Activity Monitor Service - tracks user activity and auto-logout
class ActivityMonitor {
    constructor() {
        this.lastActivity = Date.now();
        this.inactivityTimeout = 30 * 60 * 1000; // 🔒 PRODUKCJA: 30 minut domyślnie
        this.warningTimeout = 25 * 60 * 1000; // 🔒 PRODUKCJA: Ostrzeżenie po 25 minutach
        this.checkInterval = 30000; // 🔒 PRODUKCJA: Sprawdzaj co 30 sekund
        this.intervalId = null;
        this.warningShown = false;
        this.isActive = true;
        
        this.activityEvents = [
            'mousedown',
            'mousemove', 
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];
        
        this.startMonitoring();
    }

    // Start monitoring user activity
    startMonitoring() {
        // Add event listeners for user activity
        this.activityEvents.forEach(event => {
            document.addEventListener(event, this.resetActivityTimer.bind(this), true);
        });

        // Start checking for inactivity
        this.startInactivityCheck();
    }

    // Reset activity timer when user does something
    resetActivityTimer() {
        this.lastActivity = Date.now();
        this.warningShown = false;
        
        if (!this.isActive) {
            this.isActive = true;
        }
    }

    // Start the inactivity check interval
    startInactivityCheck() {
        this.intervalId = setInterval(() => {
            const timeSinceLastActivity = Date.now() - this.lastActivity;
            
            // Show warning before logout
            if (timeSinceLastActivity >= this.warningTimeout && !this.warningShown) {
                this.showInactivityWarning();
                this.warningShown = true;
            }
            
            // Auto logout after inactivity timeout
            if (timeSinceLastActivity >= this.inactivityTimeout) {
                console.log(`🚪 Auto-logout: ${timeSinceLastActivity}ms since last activity`);
                this.handleInactivityLogout();
            }
            
            // Mark as inactive
            if (timeSinceLastActivity >= this.warningTimeout && this.isActive) {
                this.isActive = false;
            }
            
        }, this.checkInterval);
    }

    // Show warning to user about upcoming logout
    showInactivityWarning() {
        // Show a simple alert (you can replace with a proper modal)
        const remainingTime = Math.ceil((this.inactivityTimeout - this.warningTimeout) / 1000);
        
        // Create warning notification
        this.createWarningNotification(remainingTime);
    }

    // Create a warning notification
    createWarningNotification(remainingTime) {
        // Remove existing warning if any
        const existingWarning = document.getElementById('inactivity-warning');
        if (existingWarning) {
            existingWarning.remove();
        }

        // Create warning element
        const warning = document.createElement('div');
        warning.id = 'inactivity-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
        `;
        
        warning.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">⚠️ Nieaktywność</div>
            <div>Zostaniesz wylogowany za ${remainingTime} sekund</div>
            <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">Porusz myszką aby pozostać zalogowany</div>
        `;
        
        document.body.appendChild(warning);
        
        // Auto remove warning after timeout
        setTimeout(() => {
            if (warning && warning.parentNode) {
                warning.remove();
            }
        }, remainingTime * 1000);
    }

    // Handle logout due to inactivity
    handleInactivityLogout() {
        console.log('🚪 Logging out due to inactivity');
        
        // Remove warning
        const warning = document.getElementById('inactivity-warning');
        if (warning) {
            warning.remove();
        }
        
        // Import and use tokenService
        import('./tokenService').then(module => {
            module.default.logout();
        }).catch(error => {
            console.error('Error during inactivity logout:', error);
            // Fallback logout
            localStorage.clear();
            window.location.href = '/admin';
        });
    }

    // Stop monitoring (for cleanup)
    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // Remove event listeners
        this.activityEvents.forEach(event => {
            document.removeEventListener(event, this.resetActivityTimer.bind(this), true);
        });
        
        // Remove warning if exists
        const warning = document.getElementById('inactivity-warning');
        if (warning) {
            warning.remove();
        }
    }

    // Set custom inactivity timeout (for production vs testing)
    setInactivityTimeout(timeoutMs, warningTimeMs = null) {
        this.inactivityTimeout = timeoutMs;
        this.warningTimeout = warningTimeMs || (timeoutMs * 0.8); // 80% of timeout for warning
        
        // Reset activity timer to apply new settings
        this.resetActivityTimer();
        
        const timeoutMinutes = Math.round(timeoutMs / (60 * 1000));
        const warningMinutes = Math.round(this.warningTimeout / (60 * 1000));
    }

    // Get current activity status
    getActivityStatus() {
        return {
            isActive: this.isActive,
            lastActivity: this.lastActivity,
            timeSinceLastActivity: Date.now() - this.lastActivity,
            warningShown: this.warningShown
        };
    }
}

// Create singleton instance
const activityMonitor = new ActivityMonitor();

// Set production timeouts when not testing
if (process.env.NODE_ENV === 'production') {
    // 30 minutes inactivity, warning at 25 minutes
    activityMonitor.setInactivityTimeout(30 * 60 * 1000, 25 * 60 * 1000);
}

export default activityMonitor;