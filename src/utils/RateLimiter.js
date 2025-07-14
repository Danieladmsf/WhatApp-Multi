class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    isAllowed() {
        const now = Date.now();
        
        // Remove old requests outside the time window
        this.requests = this.requests.filter(timestamp => 
            now - timestamp < this.windowMs
        );

        // Check if we're under the limit
        if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
        }

        return false;
    }

    getRemaining() {
        const now = Date.now();
        
        // Remove old requests outside the time window
        this.requests = this.requests.filter(timestamp => 
            now - timestamp < this.windowMs
        );

        return Math.max(0, this.maxRequests - this.requests.length);
    }

    getResetTime() {
        if (this.requests.length === 0) {
            return 0;
        }

        const oldestRequest = Math.min(...this.requests);
        return oldestRequest + this.windowMs;
    }

    reset() {
        this.requests = [];
    }

    getStats() {
        const now = Date.now();
        
        // Clean old requests
        this.requests = this.requests.filter(timestamp => 
            now - timestamp < this.windowMs
        );

        return {
            maxRequests: this.maxRequests,
            windowMs: this.windowMs,
            currentRequests: this.requests.length,
            remaining: this.getRemaining(),
            resetTime: this.getResetTime(),
            isAllowed: this.getRemaining() > 0
        };
    }
}

module.exports = RateLimiter;