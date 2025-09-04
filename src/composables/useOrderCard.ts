import { supabase } from '../lib/supabase/index'

export function useOrderCard() {
  const computeRemainingSeconds = (order: any, globalPrepTime?: any) => {
    try {
      const createdMs = order.createdAt ?? (order.created_at ? new Date(order.created_at).getTime() : Date.now())
      const elapsedSec = Math.floor((Date.now() - createdMs) / 1000)
      const baseSec = ((globalPrepTime?.value ?? globalPrepTime) ?? 10) * 60
      const extraMin = Number(order.additional_prep_time ?? order.prep_time ?? 0) || 0
      const totalAllowed = baseSec + (extraMin * 60)
      return Math.max(0, totalAllowed - elapsedSec)
    } catch {
      return 0
    }
  }

  const canonicalizeStatus = (status: any) => {
    const raw = (status || '').toString().trim()
    if (!raw) return 'PENDING'
    
    // Handle your specific French status values
    if (raw === 'Nouvelle') return 'PENDING'
    if (raw === 'En cours') return 'ACCEPTED'
    if (raw === 'Prêt') return 'READY'
    if (raw === 'CLOSED' || raw === 'Fermé') return 'CLOSED'
    
    // Fallback to uppercase checks for compatibility
    const upper = raw.toUpperCase()
    if (upper.includes('ACCEP') || upper === 'ACCEPTED') return 'ACCEPTED'
    if (upper.includes('PRET') || upper.includes('PRÊT') || upper.includes('READY')) return 'READY'
    if (upper.includes('CLOS') || upper.includes('FERM') || upper.includes('CLOT')) return 'CLOSED'
    if (upper.includes('NOUV') || upper.includes('NEW')) return 'PENDING'
    if (['PENDING','ACCEPTED','READY','CLOSED'].includes(upper)) return upper
    
    return 'PENDING'
  }

  const getNextStatus = (currentStatus: string) => {
    const canonical = canonicalizeStatus(currentStatus)
    
    switch (canonical) {
      case 'PENDING':
        return 'En cours'
      case 'ACCEPTED':
        return 'Prêt'
      case 'READY':
        return 'CLOSED'
      default:
        return 'En cours'
    }
  }

  const getStatusDisplay = (status: string) => {
    const canonical = canonicalizeStatus(status)
    
    switch (canonical) {
      case 'PENDING':
        return 'Nouvelle'
      case 'ACCEPTED':
        return 'En cours'
      case 'READY':
        return 'Prêt'
      case 'CLOSED':
        return 'CLOSED'
      default:
        return 'Nouvelle'
    }
  }

  const parseItems = (order: any) => {
    try {
      if (!order) {
        return []
      }
      
      // If order is a JSON string, parse it first
      if (typeof order === 'string') {
        try {
          const parsed = JSON.parse(order)
          if (Array.isArray(parsed)) {
            return parsed.map((item: any) => ({
              name: item.product?.name || item.product_name || item.name || 'Produit',
              quantity: item.quantity || 1,
              boisson_name: item.boisson?.name || item.boisson_name,
              accompagnement_name: item.accompagnement?.name || item.accompagnement_name,
              customizations: item.customizations || []
            }))
          }
        } catch (e) {
          // Fallback for invalid JSON
        }
      }
      
      // If order is already an array (like the order_details), process it directly
      if (Array.isArray(order)) {
        return order.map((item: any) => ({
          name: item.product?.name || item.product_name || item.name || 'Produit',
          quantity: item.quantity || 1,
          boisson_name: item.boisson?.name || item.boisson_name,
          accompagnement_name: item.accompagnement?.name || item.accompagnement_name,
          customizations: item.customizations || []
        }))
      }
      
      // Use order_details field for the new data structure
      let orderDetails = order.order_details
      
      if (!orderDetails) {
        // Fallback: try to find products in other fields
        if (order.products) {
          orderDetails = order.products
        } else if (order.items) {
          console.log('parseItems: Found items field instead:', order.items)
          orderDetails = order.items
        } else {
          console.log('parseItems: No product data found in any field')
          return []
        }
      }
      
      // Try to parse if it's a JSON string
      if (typeof orderDetails === 'string') {
        try {
          orderDetails = JSON.parse(orderDetails)
        } catch (parseError) {
          console.error('Failed to parse order_details JSON:', parseError)
          return []
        }
      }
      
      // Handle both array and object formats
      if (Array.isArray(orderDetails)) {
        return orderDetails.map((item: any) => ({
          name: item.product?.name || item.product_name || item.name || 'Produit',
          quantity: item.quantity || 1,
          boisson_name: item.boisson?.name || item.boisson_name,
          accompagnement_name: item.accompagnement?.name || item.accompagnement_name,
          customizations: item.customizations || []
        }))
      }
      
      // If it's an object, try to extract items
      if (typeof orderDetails === 'object') {
        if (orderDetails.items && Array.isArray(orderDetails.items)) {
          return orderDetails.items.map((item: any) => ({
            name: item.product?.name || item.product_name || item.name || 'Produit',
            quantity: item.quantity || 1,
            boisson_name: item.boisson?.name || item.boisson_name,
            accompagnement_name: item.accompagnement?.name || item.accompagnement_name,
            customizations: item.customizations || []
          }))
        }
        
        // Single item object
        return [{
          name: orderDetails.product?.name || orderDetails.product_name || orderDetails.name || 'Produit',
          quantity: orderDetails.quantity || 1,
          boisson_name: orderDetails.boisson?.name || orderDetails.boisson_name,
          accompagnement_name: orderDetails.accompagnement?.name || orderDetails.accompagnement_name,
          customizations: orderDetails.customizations || []
        }]
      }
      
      return []
    } catch (error) {
      console.error('Error parsing order items:', error)
      return []
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) {
        console.error('Error updating order status:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in updateOrderStatus:', error)
      throw error
    }
  }

  return {
    computeRemainingSeconds,
    canonicalizeStatus,
    getNextStatus,
    getStatusDisplay,
    parseItems,
    updateOrderStatus
  }
}
