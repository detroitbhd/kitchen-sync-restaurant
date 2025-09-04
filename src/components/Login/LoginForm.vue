<template>
  <div class="login-wrapper">
    <div class="login-background">
      <div class="background-pattern"></div>
    </div>
    
    <div class="login-container">
      <div class="login-card">
        <!-- Logo Section -->
        <div class="logo-section">
          <div class="logo-ks">KS</div>
          <h1 class="app-title">KitchenSync</h1>
          <p class="app-subtitle">Professional Restaurant Management</p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label class="form-label">
              <span class="label-text">Email Address</span>
            </label>
            <input 
              v-model="email" 
              type="email" 
              class="form-input"
              required 
              placeholder="Enter your email"
              :class="{ 'input-error': error }"
            >
          </div>

          <div class="form-group">
            <label class="form-label">
              <span class="label-text">Password</span>
            </label>
            <input 
              v-model="password" 
              type="password" 
              class="form-input"
              required 
              placeholder="Enter your password"
              :class="{ 'input-error': error }"
            >
          </div>

          <button type="submit" class="login-button" :disabled="loading">
            <span v-if="loading" class="button-spinner"></span>
            <span class="button-text">{{ loading ? 'Signing In...' : 'Sign In' }}</span>
          </button>

          <div v-if="error" class="error-message">
            <span class="error-text">{{ error }}</span>
          </div>
        </form>

        <!-- Footer -->
        <div class="login-footer">
          <p class="footer-text">Secure restaurant management system</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../../lib/supabase/index'

const emit = defineEmits<{
  'login-success': []
}>()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  try {
    console.log('Attempting login with email:', email.value)
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    
    if (loginError) {
      console.error('Login error:', loginError)
      throw loginError
    }
    
    console.log('Login successful!')
    emit('login-success')
  } catch (err: any) {
    console.error('Login failed:', err)
    error.value = err.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.login-background {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  z-index: 1;
}

.background-pattern {
  position: absolute;
  inset: 0;
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

.login-container {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
  padding: 1rem;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2.5rem;
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: slideInUp 0.6s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Logo Section */
.logo-section {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-ks {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 800;
  color: white;
  margin-bottom: 1rem;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  letter-spacing: -0.05em;
  animation: logoFloat 3s ease-in-out infinite;
}

@keyframes logoFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}

.app-title {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.025em;
}

.app-subtitle {
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0;
}

/* Form Styling */
.login-form {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
}

.label-text {
  font-size: 0.875rem;
}

.form-input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 
    0 0 0 4px rgba(102, 126, 234, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.1);
  background: white;
}

.form-input.input-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.login-button {
  width: 100%;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 
    0 10px 20px rgba(102, 126, 234, 0.3),
    0 6px 6px rgba(0, 0, 0, 0.1);
}

.login-button:active {
  transform: translateY(0);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.button-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.button-text {
  font-weight: 600;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(254, 226, 226, 0.9);
  border: 1px solid #fca5a5;
  border-radius: 12px;
  margin-top: 1rem;
  backdrop-filter: blur(10px);
}

.error-text {
  color: #dc2626;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Footer */
.login-footer {
  text-align: center;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.footer-text {
  color: #9ca3af;
  font-size: 0.75rem;
  margin: 0;
}

/* Mobile Responsiveness */
@media (max-width: 480px) {
  .login-card {
    padding: 2rem 1.5rem;
    margin: 1rem;
    border-radius: 20px;
  }

  .app-title {
    font-size: 1.75rem;
  }

  .form-input,
  .login-button {
    padding: 0.875rem 1rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .login-card {
    background: rgba(30, 41, 59, 0.95);
    color: white;
  }

  .app-subtitle {
    color: #94a3b8;
  }

  .form-label {
    color: #e2e8f0;
  }

  .form-input {
    background: rgba(51, 65, 85, 0.8);
    border-color: #475569;
    color: white;
  }

  .form-input::placeholder {
    color: #94a3b8;
  }

  .footer-text {
    color: #64748b;
  }
}
</style>