<template>
  <header class="header-bar">
    <div class="header-content">
      <!-- Left Section: KitchenSync + Status -->
      <div class="header-left">
        <div class="restaurant-info">
          <h1 class="restaurant-name">{{ restaurantName }}</h1>
          <div class="status-indicator" :class="{ closed: !isRestaurantOpen }">
            <div class="status-dot-glow"></div>
          </div>
        </div>
      </div>

      <!-- Center Section: Current Time -->
      <div class="header-center">
        <div class="time-display">
          <div class="current-time">{{ currentTime }}</div>
        </div>
      </div>

      <!-- Right Section: Prep Time + Menu -->
      <div class="header-right">
        <!-- Prep Time Controls -->
        <div class="prep-time-section">
          <div class="prep-time-controls">
            <button 
              class="prep-time-btn" 
              @click="decreasePrepTime"
              :disabled="globalPrepTime <= 10"
              title="Decrease by 15 minutes"
            >
              −15min
            </button>
            <div class="prep-time-display">{{ globalPrepTime }}min</div>
            <button 
              class="prep-time-btn" 
              @click="increasePrepTime"
              title="Increase by 15 minutes"
            >
              +15min
            </button>
          </div>
        </div>
        
        <!-- Menu Toggle Button -->
        <button 
          class="menu-toggle-btn" 
          @click="toggleMenu"
          :class="{ active: isMenuOpen }"
        >
          <div class="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
    </div>
    
    <!-- Collapsible Menu -->
    <div class="header-menu" :class="{ open: isMenuOpen }">
      <div class="menu-content">
        <button class="menu-item" @click="handleMenuClick('show-menu')">
          <span class="menu-text">Menu Management</span>
        </button>
        <button class="menu-item" @click="handleMenuClick('show-past-orders')">
          <span class="menu-text">Past Orders</span>
        </button>
        <div class="menu-divider"></div>
        <button class="menu-item logout" @click="handleMenuClick('logout')">
          <span class="menu-text">Logout</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

interface Props {
  restaurantName: string
  isRestaurantOpen: boolean
  globalPrepTime: number
}

interface Emits {
  'show-menu': []
  'show-past-orders': []
  'logout': []
  'update-prep-time': [value: number]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Menu state
const isMenuOpen = ref(false)
// Time state
const currentTimeRef = ref(Date.now())
let timeTimer: NodeJS.Timeout | null = null

// Setup time timer
onMounted(() => {
  // Update time every second
  timeTimer = setInterval(() => {
    currentTimeRef.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timeTimer) {
    clearInterval(timeTimer)
    timeTimer = null
  }
})

const decreasePrepTime = () => {
  const newTime = Math.max(10, props.globalPrepTime - 15)
  emit('update-prep-time', newTime)
}

const increasePrepTime = () => {
  const newTime = props.globalPrepTime + 15
  emit('update-prep-time', newTime)
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const handleMenuClick = (action: string) => {
  isMenuOpen.value = false // Close menu after clicking
  
  switch (action) {
    case 'show-menu':
      emit('show-menu')
      break
    case 'show-past-orders':
      emit('show-past-orders')
      break
    case 'logout':
      emit('logout')
      break
  }
}

const currentTime = computed(() => {
  // Use reactive time reference to trigger updates
  currentTimeRef.value
  const now = new Date()
  return now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
})
</script>

<style scoped>
.header-bar {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-bottom: 3px solid #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-content {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 1rem 2.5rem; /* Symmetrical spacing: matches orders-main (1.5rem) + orders-grid (1rem) = 2.5rem */
  max-width: none; /* Remove max-width constraint for perfect alignment */
  margin: 0;
  gap: 2rem;
}

/* Left Section: Restaurant Info + Status */
.header-left {
  display: flex;
  justify-content: flex-start;
}

.restaurant-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.restaurant-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.025em;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
}

.status-dot-glow {
  width: 12px;
  height: 12px;
  background: #10b981; /* Green for open */
  border-radius: 50%;
  position: relative;
  animation: glow-green 2s infinite ease-in-out;
}

.status-indicator.closed .status-dot-glow {
  background: #ef4444; /* Red for closed */
  animation: glow-red 2s infinite ease-in-out;
}

@keyframes glow-green {
  0%, 100% { 
    box-shadow: 0 0 5px #10b981, 0 0 10px #10b981, 0 0 15px #10b981;
    opacity: 1;
  }
  50% { 
    box-shadow: 0 0 10px #10b981, 0 0 20px #10b981, 0 0 30px #10b981;
    opacity: 0.8;
  }
}

@keyframes glow-red {
  0%, 100% { 
    box-shadow: 0 0 5px #ef4444, 0 0 10px #ef4444, 0 0 15px #ef4444;
    opacity: 1;
  }
  50% { 
    box-shadow: 0 0 10px #ef4444, 0 0 20px #ef4444, 0 0 30px #ef4444;
    opacity: 0.8;
  }
}

/* Center Section: Time Display */
.header-center {
  display: flex;
  justify-content: center;
}

.time-display {
  text-align: center;
  color: white;
}

.current-time {
  font-size: 2rem;
  font-weight: 700;
  color: #60a5fa;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  margin-bottom: 0.25rem;
  line-height: 1;
}

/* Right Section: Prep Time + Menu */
.header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1.5rem;
  /* Ensure alignment with symmetrical spacing - no additional margin needed */
}

/* Prep Time Section */
.prep-time-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.prep-time-label {
  font-size: 0.75rem;
  color: #cbd5e1;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.prep-time-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.prep-time-btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #1e293b;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.prep-time-btn:hover:not(:disabled) {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.prep-time-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.prep-time-display {
  min-width: 60px;
  text-align: center;
  font-size: 0.875rem;
  color: white;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.8);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Menu Toggle Button */
.menu-toggle-btn {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.menu-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.menu-toggle-btn.active {
  background: rgba(59, 130, 246, 0.8);
  border-color: #3b82f6;
}

/* Hamburger Icon */
.hamburger {
  width: 20px;
  height: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hamburger span {
  width: 100%;
  height: 2px;
  background: white;
  border-radius: 1px;
  transition: all 0.3s ease;
}

.menu-toggle-btn.active .hamburger span:nth-child(1) {
  transform: rotate(45deg) translate(6px, 6px);
}

.menu-toggle-btn.active .hamburger span:nth-child(2) {
  opacity: 0;
}

.menu-toggle-btn.active .hamburger span:nth-child(3) {
  transform: rotate(-45deg) translate(6px, -6px);
}

/* Collapsible Menu */
.header-menu {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s ease;
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.header-menu.open {
  max-height: 400px;
}

.menu-content {
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
  border-color: rgba(255, 255, 255, 0.2);
}

.menu-item.logout {
  margin-top: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.menu-item.logout:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.menu-text {
  font-size: 0.875rem;
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0.5rem 0;
}

/* Mobile Responsiveness */
@media (max-width: 1024px) {
  .header-content {
    grid-template-columns: 1fr auto auto;
    gap: 1rem;
  }
  
  .current-time {
    font-size: 1.5rem;
  }
  
  .prep-time-section {
    /* Keep prep time visible but make it more compact */
    margin-right: 0.5rem;
  }
  
  .prep-time-controls {
    gap: 0.5rem;
  }
  
  .prep-time-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    min-width: 45px;
  }
  
  .prep-time-display {
    font-size: 0.875rem;
    font-weight: 600;
    min-width: 50px;
  }
}

@media (max-width: 768px) {
  .header-content {
    grid-template-columns: 1fr auto auto;
    padding: 1rem;
    gap: 0.75rem;
  }
  
  .restaurant-name {
    font-size: 1.25rem;
  }
  
  .status-dot-glow {
    width: 10px;
    height: 10px;
  }
  
  .current-time {
    font-size: 1.25rem;
  }
  
  .prep-time-section {
    margin-right: 0.25rem;
  }
  
  .prep-time-btn {
    padding: 0.2rem 0.4rem;
    font-size: 0.7rem;
    min-width: 40px;
  }
  
  .prep-time-display {
    font-size: 0.8rem;
    min-width: 45px;
  }
}

@media (max-width: 480px) {
  .header-content {
    grid-template-columns: 1fr auto auto;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }
  
  .restaurant-info {
    gap: 0.5rem;
  }
  
  .restaurant-name {
    font-size: 1.125rem;
  }
  
  .current-time {
    font-size: 1rem;
  }
  
  .prep-time-section {
    margin-right: 0;
  }
  
  .prep-time-controls {
    gap: 0.25rem;
  }
  
  .prep-time-btn {
    padding: 0.15rem 0.3rem;
    font-size: 0.65rem;
    min-width: 35px;
  }
  
  .prep-time-display {
    font-size: 0.75rem;
    min-width: 40px;
  }
  
  .menu-content {
    padding: 0.75rem 1rem;
  }
  
  .menu-item {
    padding: 0.5rem 0.75rem;
  }
}

@media (max-width: 360px) {
  .header-content {
    grid-template-columns: 1fr 1fr auto;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
  }
  
  .header-center {
    order: -1;
    grid-column: 2;
  }
  
  .header-left {
    grid-column: 1;
  }
  
  .header-right {
    grid-column: 3;
  }
  
  .restaurant-name {
    font-size: 1rem;
  }
  
  .current-time {
    font-size: 0.875rem;
  }
  
  .prep-time-btn {
    padding: 0.1rem 0.25rem;
    font-size: 0.6rem;
    min-width: 30px;
  }
  
  .prep-time-display {
    font-size: 0.7rem;
    min-width: 35px;
  }
}
</style>
