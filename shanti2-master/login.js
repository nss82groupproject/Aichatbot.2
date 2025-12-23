class LoginManager {
    constructor() {
        this.authForm = document.getElementById('authForm');
        this.switchMode = document.getElementById('switchMode');
        this.isDarkMode = false;
        this.isRegisterMode = false;
        this.init();
    }

    init() {
        this.authForm.addEventListener('submit', (e) => this.handleAuth(e));
        this.switchMode.addEventListener('click', () => this.toggleAuthMode());


        if (this.isLoggedIn()) {
            this.verifySession();
        }
    }

    toggleAuthMode() {
        this.isRegisterMode = !this.isRegisterMode;
        const emailGroup = document.getElementById('emailGroup');
        const headerText = document.getElementById('headerText');
        const submitBtn = document.getElementById('submitBtn');
        const switchText = document.getElementById('switchText');
        const rememberRow = document.getElementById('rememberRow');

        if (this.isRegisterMode) {
            emailGroup.style.display = 'block';
            headerText.textContent = 'Create your account';
            submitBtn.textContent = 'Sign Up';
            switchText.innerHTML = 'Already have an account? <span class="span" id="switchMode">Sign In</span>';
            rememberRow.style.display = 'none';
            document.getElementById('email').required = true;
        } else {
            emailGroup.style.display = 'none';
            headerText.textContent = 'Sign in to continue your conversation';
            submitBtn.textContent = 'Sign In';
            switchText.innerHTML = 'Don\'t have an account? <span class="span" id="switchMode">Sign Up</span>';
            rememberRow.style.display = 'flex';
            document.getElementById('email').required = false;
        }

        document.getElementById('switchMode').addEventListener('click', () => this.toggleAuthMode());
    }

    async handleAuth(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const email = document.getElementById('email').value;
        
        if (this.isRegisterMode) {
            await this.register(username, email, password);
        } else {
            await this.login(username, password);
        }
    }

    async login(username, password) {
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch('auth.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            
            const data = await response.json();

            if (data.success) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));
                localStorage.setItem('isLoggedIn', 'true');
                submitBtn.textContent = 'Success!';
                window.location.href = 'index.html';
            } else {
                this.showError(data.error || 'Login failed');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.showError('Request timeout. Please check your connection.');
            } else {
                this.showError('Connection error. Please try again.');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async register(username, email, password) {
        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        try {
            const response = await fetch('auth.php?action=register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Registration successful! Please sign in.');
                this.toggleAuthMode();
                document.getElementById('username').value = username;
                document.getElementById('password').value = '';
                submitBtn.textContent = 'Account created!';
            } else {
                this.showError(data.error || 'Registration failed');
            }
        } catch (error) {
            this.showError('Connection error. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async verifySession() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const response = await fetch(`auth.php?action=verify&token=${token}`);
            const data = await response.json();

            if (data.valid) {
                window.location.href = 'index.html';
            } else {
                this.logout();
            }
        } catch (error) {
            this.logout();
        }
    }

    isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('authToken');
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.style.cssText = `
            background: ${type === 'error' ? '#fee2e2' : '#d1fae5'};
            color: ${type === 'error' ? '#dc2626' : '#065f46'};
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 16px;
            font-size: 14px;
            text-align: center;
            border: 1px solid ${type === 'error' ? '#fecaca' : '#a7f3d0'};
        `;
        messageDiv.textContent = message;
        
        this.authForm.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

}

document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
