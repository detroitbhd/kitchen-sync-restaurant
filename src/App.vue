<template>
  <div class="app-root">
    <!-- Login Screen -->
    <LoginForm v-if="!isLoggedIn" @login-success="handleLoginSuccess" />

    <!-- Main App -->
    <div v-else class="app-container">
      <!-- Header -->
      <HeaderBar
        :restaurant-name="restaurantName"
        :is-restaurant-open="isCurrentlyOpen"
        :global-prep-time="globalPrepTime"
        @show-menu="showMenuModal = true"
        @show-past-orders="showPastOrdersModal = true"
        @update-prep-time="updateGlobalPrepTime"
        @logout="logout"
      />

      <!-- Orders -->
      <main class="orders-main">
        <OrdersGrid
          :orders="orders"
          :type-icons="typeIcons"
          :expanded-orders="expandedOrders"
          :newly-arrived-orders="newlyArrivedOrders"
          :global-prep-time="globalPrepTime"
          @order-status-change="updateOrderStatus"
          @toggle-expand="toggleOrderExpansion"
          @update-prep-time="updateOrderPrepTime"
        />
      </main>

      <!-- Modals -->
      <MenuModal v-if="showMenuModal" @close="showMenuModal = false" />
      <PastOrdersModal
        v-if="showPastOrdersModal"
        :type-icons="typeIcons"
        @close="showPastOrdersModal = false"
        @order-reactivated="fetchOrders"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from './lib/supabase/index'
import LoginForm from './components/Login/LoginForm.vue'
import HeaderBar from './components/HeaderBar.vue'
import OrdersGrid from './components/OrderCard/OrdersGrid.vue'
import PastOrdersModal from './components/PastOrders/PastOrdersModal.vue'
import MenuModal from './components/Menu/MenuModal.vue'
import { useNotificationSounds } from './composables/useNotificationSounds'
import { useRestaurantHours } from './composables/useRestaurantHours'

// State
const isLoggedIn = ref(false)
const orders = ref<any[]>([])
const expandedOrders = ref(new Set<string>())
const newlyArrivedOrders = ref(new Set<string>()) // Track newly arrived orders for glow effect
const globalPrepTime = ref(10)
const restaurantName = ref('KitchenSync')

// UI State
const showMenuModal = ref(false)
const showPastOrdersModal = ref(false)

// Composables
const { playNotificationSound, stopNotificationSound, stopAllSounds } = useNotificationSounds()
const { isCurrentlyOpen } = useRestaurantHours()

// Type icons - mapping to your actual order types
const typeIcons = ref({
  'Livraison': 'Delivery',
  'Emporter': 'Take Away', 
  'Sur Place': 'Dine In',
})

// Event Handlers
const handleLoginSuccess = async () => {
  isLoggedIn.value = true
  await fetchOrders()
}

const updateOrderStatus = async (orderId: string, newStatus: string) => {
  try {
    // Stop notification sound when order is accepted
    if (newStatus === 'En cours') {
      stopNotificationSound(orderId)
      // Remove glow effect when order is accepted
      newlyArrivedOrders.value.delete(orderId)
    }
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) throw error
    await fetchOrders()
  } catch (error) {
    console.error('Error updating order:', error)
  }
}

const updateGlobalPrepTime = async (newPrepTime: number) => {
  try {
    globalPrepTime.value = newPrepTime
    // Optionally save to database
    const { error } = await supabase
      .from('settings')
      .update({ global_prep_time: newPrepTime })
      .eq('id', '8c00668c-8abe-4f88-a0a7-ad896aeec8c8')
    if (error) console.error('Error updating prep time:', error)
  } catch (error) {
    console.error('Error updating prep time:', error)
  }
}

const toggleOrderExpansion = (orderId: string) => {
  expandedOrders.value.has(orderId) ? expandedOrders.value.delete(orderId) : expandedOrders.value.add(orderId)
}

const updateOrderPrepTime = async (orderId: string, prepTime: number) => {
  try {
    const { error } = await supabase.from('orders').update({ additional_prep_time: prepTime }).eq('id', orderId)
    if (error) throw error
    await fetchOrders()
  } catch (error) {
    console.error('Error updating prep time:', error)
  }
}

const fetchOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_type:order_type_id (
          id,
          name
        )
      `)
      .in('status', ['Nouvelle', 'En cours', 'Prêt'])
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    orders.value = data || []
  } catch (error) {
    console.error('Error fetching orders:', error)
  }
}

// Function to handle real-time changes and trigger notifications
const handleOrderChanges = async (payload: any) => {
  console.log('Real-time order change received:', payload)
  
  const eventType = payload.eventType || payload.event || 'unknown'
  const record = payload.new || payload.record || {}

  // Always refetch orders to stay in sync
  await fetchOrders()

  // Handle new order notifications
  if (eventType === 'INSERT' && record && record.status === 'Nouvelle') {
    if (!newlyArrivedOrders.value.has(record.id)) {
      newlyArrivedOrders.value.add(record.id)

      // Auto-remove glow after 10 seconds
      setTimeout(() => {
        newlyArrivedOrders.value.delete(record.id)
      }, 10000)

      // Play notification sound
      playNotificationSound(record.id).catch((e: any) => {
        console.error('Play sound failed:', e)
      })
    }
  }
}

const loadSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single()
    
    if (error) {
      console.error('Error loading settings:', error)
      return
    }
    
    if (data) {
      globalPrepTime.value = data.global_prep_time || 10
      restaurantName.value = data.restaurant_name || 'KitchenSync'
      // Note: Restaurant open/closed status is now calculated based on opening hours
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
}

const logout = async () => {
  try {
    // Stop all notification sounds when logging out
    stopAllSounds()
    await supabase.auth.signOut()
    isLoggedIn.value = false
  } catch (error) {
    console.error('Logout error:', error)
  }
}

onMounted(async () => {
  // Stop any existing sounds when app loads
  stopAllSounds()
  
  // Load app settings first
  await loadSettings()
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    isLoggedIn.value = true
    await fetchOrders()
  }
  
  // Set up auth state change listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      isLoggedIn.value = true
      await fetchOrders()
    } else if (event === 'SIGNED_OUT') {
      isLoggedIn.value = false
      orders.value = []
    }
  })

  // Set up real-time subscription for orders only
  supabase
    .channel('orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleOrderChanges)
    .subscribe()

  // Refresh orders every 30 seconds as backup
  setInterval(async () => {
    if (isLoggedIn.value) {
      await fetchOrders()
    }
  }, 30000)
})
</script>

<style scoped>
.app-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.app-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.orders-main {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  scroll-behavior: smooth;
}

.orders-main::-webkit-scrollbar { width: 8px; }
.orders-main::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
.orders-main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.orders-main::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>


