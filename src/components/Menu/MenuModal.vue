<template>
  <div class="modal-backdrop" @click="$emit('close')">
    <div class="modal" @click.stop>
      <button class="modal-close" @click="$emit('close')">&times;</button>
      <div class="modal-header">
        <h2>Menu Management</h2>
      </div>
      
      <div class="menu-content">
        <div v-if="loading" class="loading">Loading menu...</div>
        <div v-else-if="menuItems.length === 0" class="empty-state">
          No menu items found
        </div>
        <div v-else class="menu-list">
          <div 
            v-for="(item, index) in menuItems" 
            :key="item.id" 
            class="menu-item"
            :class="{ 'separator': index > 0 }"
          >
            <span class="item-name">{{ item.name }}</span>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="item.is_available" 
                @change="toggleAvailability(item.id, ($event.target as HTMLInputElement).checked)"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="menu-actions">
          <button class="btn btn-primary" @click="refreshMenu">
            Refresh Menu
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../../lib/supabase/index'

const emit = defineEmits<{
  close: []
}>()

const menuItems = ref<any[]>([])
const loading = ref(true)

const fetchMenuItems = async () => {
  try {
    loading.value = true
    const { data, error } = await supabase
      .from('product')
      .select('*')
      .order('name')
    
    if (error) throw error
    menuItems.value = data || []
  } catch (error) {
    console.error('Error fetching menu:', error)
    menuItems.value = []
  } finally {
    loading.value = false
  }
}

const toggleAvailability = async (productId: number, isAvailable: boolean) => {
  try {
    const { error } = await supabase
      .from('product')
      .update({ is_available: isAvailable })
      .eq('id', productId)
    
    if (error) throw error
    
    // Update local state
    const item = menuItems.value.find(item => item.id === productId)
    if (item) {
      item.is_available = isAvailable
    }
  } catch (error) {
    console.error('Error updating availability:', error)
    // Revert the change on error
    await fetchMenuItems()
  }
}

const refreshMenu = () => {
  fetchMenuItems()
}

onMounted(() => {
  fetchMenuItems()
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  max-width: 600px; /* Increased from default to fit content better */
  min-width: 500px; /* Ensure minimum width */
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
  z-index: 10;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-header {
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.menu-content {
  padding: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
}

.menu-list {
  margin-bottom: 2rem;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  gap: 1rem; /* Add gap to prevent overlap */
  min-height: 60px; /* Ensure consistent height */
}

.menu-item.separator {
  border-top: 1px solid #e2e8f0;
}

.item-name {
  font-size: 1.125rem; /* Increased font size for better visibility */
  font-weight: 500;
  color: #1e293b;
  flex: 1; /* Take available space */
  min-width: 0; /* Allow text to shrink if needed */
  margin-right: 1rem; /* Ensure space before toggle */
}

/* Toggle Switch Styles */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #10b981;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.loading, .empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.menu-actions {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
}
</style>